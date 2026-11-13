import math
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ClienteMensual, Cochera, Estadia, TipoTarifa
from app.routers.clientes import normalizar_patente
from app.schemas import CobroIn, EstadiaOut, IngresoIn

from app.routers.configuracion import leer_config

router = APIRouter(prefix="/estadias", tags=["movimientos"])

MINUTOS_DIA = 1440


def estadia_activa(db: Session, patente: str) -> Estadia | None:
    return db.scalar(
        select(Estadia).where(Estadia.patente == patente, Estadia.estado == "activa")
    )


def cochera_comun_libre(db: Session) -> Cochera | None:
    ocupadas = db.scalars(
        select(Estadia.cochera_id).where(
            Estadia.estado == "activa", Estadia.cochera_id.is_not(None)
        )
    ).all()
    stmt = select(Cochera).where(Cochera.tipo == "comun", Cochera.activa.is_(True))
    if ocupadas:
        stmt = stmt.where(Cochera.id.not_in(ocupadas))
    return db.scalars(stmt.order_by(Cochera.id)).first()


def cliente_mensual_vigente(db: Session, patente: str) -> ClienteMensual | None:
    cliente = db.scalar(
        select(ClienteMensual).where(
            ClienteMensual.patente == patente, ClienteMensual.activo.is_(True)
        )
    )
    if cliente is None:
        return None
    if cliente.vencimiento is not None and cliente.vencimiento < datetime.now():
        return None  # abono vencido: se cobra como un ingreso común
    return cliente


def calcular_monto(db: Session, minutos: int) -> tuple[Decimal, int | None]:
    """
    Regla:
    - Se cobra un día completo por cada 24 horas.
    - El tiempo restante se cobra con el primer tramo que lo cubra
      (media hora, hora, medio día o día completo).
    """
    tramos = db.scalars(
        select(TipoTarifa)
        .where(TipoTarifa.activo.is_(True), TipoTarifa.duracion_minutos <= MINUTOS_DIA)
        .order_by(TipoTarifa.duracion_minutos)
    ).all()
    diaria = db.scalar(
        select(TipoTarifa).where(
            TipoTarifa.activo.is_(True), TipoTarifa.duracion_minutos == MINUTOS_DIA
        )
    )

    dias, resto = divmod(max(minutos, 0), MINUTOS_DIA)
    monto = Decimal("0")
    tarifa_id = None

    if dias > 0:
        if diaria is None:
            raise HTTPException(status_code=500, detail="Falta una tarifa de día completo activa")
        monto += diaria.precio * dias
        tarifa_id = diaria.id

    if resto > 0 or dias == 0:
        tramo = next((t for t in tramos if t.duracion_minutos >= resto), None)
        if tramo is None:
            raise HTTPException(status_code=500, detail="No hay tarifas activas para ese tiempo")
        monto += tramo.precio
        if tarifa_id is None:
            tarifa_id = tramo.id

    return monto, tarifa_id


def calcular_cobro(db: Session, estadia: Estadia) -> tuple[int, Decimal, int | None]:
    ahora = datetime.now()
    minutos = math.ceil((ahora - estadia.fecha_entrada).total_seconds() / 60)
    tolerancia = int(leer_config(db, "tolerancia_minutos", "0"))
    if minutos <= tolerancia:
        minutos = 0
    if estadia.tipo == "mensual":
        return minutos, Decimal("0"), None
    monto, tarifa_id = calcular_monto(db, minutos)
    return minutos, monto, tarifa_id


@router.get("/activas", response_model=list[EstadiaOut])
def activas(db: Session = Depends(get_db)):
    return db.scalars(
        select(Estadia).where(Estadia.estado == "activa").order_by(Estadia.fecha_entrada)
    ).all()


@router.post("/ingreso", response_model=EstadiaOut, status_code=status.HTTP_201_CREATED)
def ingreso(data: IngresoIn, db: Session = Depends(get_db)):
    patente = normalizar_patente(data.patente)

    if estadia_activa(db, patente):
        raise HTTPException(status_code=400, detail="Ese vehículo ya está adentro")

    cliente = cliente_mensual_vigente(db, patente)
    if cliente:
        estadia = Estadia(
            patente=patente,
            tipo="mensual",
            cliente_id=cliente.id,
            cochera_id=cliente.cochera_id,
        )
    else:
        cochera = cochera_comun_libre(db)
        if cochera is None:
            raise HTTPException(status_code=400, detail="No hay cocheras comunes libres")
        estadia = Estadia(patente=patente, tipo="comun", cochera_id=cochera.id)

    db.add(estadia)
    db.commit()
    db.refresh(estadia)
    return estadia


@router.get("/buscar/{patente}")
def buscar_y_calcular(patente: str, db: Session = Depends(get_db)):
    """Muestra el tiempo y el monto a cobrar sin cerrar la estadía."""
    estadia = estadia_activa(db, normalizar_patente(patente))
    if estadia is None:
        raise HTTPException(status_code=404, detail="Ese vehículo no está adentro")

    minutos, monto, tarifa_id = calcular_cobro(db, estadia)
    return {
        "id": estadia.id,
        "patente": estadia.patente,
        "tipo": estadia.tipo,
        "cochera_id": estadia.cochera_id,
        "fecha_entrada": estadia.fecha_entrada,
        "minutos": minutos,
        "tarifa_id": tarifa_id,
        "monto": monto,
    }


@router.post("/buscar/{patente}/cobrar", response_model=EstadiaOut)
def cobrar(patente: str, data: CobroIn, db: Session = Depends(get_db)):
    estadia = estadia_activa(db, normalizar_patente(patente))
    if estadia is None:
        raise HTTPException(status_code=404, detail="Ese vehículo no está adentro")

    ahora = datetime.now()
    minutos, monto, tarifa_id = calcular_cobro(db, estadia)

    estadia.fecha_salida = ahora
    estadia.minutos = minutos
    estadia.tarifa_id = tarifa_id
    estadia.monto = monto
    estadia.forma_pago = data.forma_pago
    estadia.estado = "cerrada"

    if estadia.cochera_id is not None:
        cochera = db.get(Cochera, estadia.cochera_id)
        if cochera is not None and cochera.tipo == "comun":
            cochera.estado = "libre"

    db.commit()
    db.refresh(estadia)
    return estadia


@router.get("/historial/{patente}", response_model=list[EstadiaOut])
def historial(patente: str, db: Session = Depends(get_db)):
    return db.scalars(
        select(Estadia)
        .where(Estadia.patente == normalizar_patente(patente))
        .order_by(Estadia.fecha_entrada.desc())
    ).all()