from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ClienteMensual, Cochera, Configuracion, Estadia, TipoTarifa
from app.schemas import ConfigGenerales, TarifaCreate, TarifaOut, TarifaUpdate

router = APIRouter(prefix="/configuracion", tags=["configuracion"])

CLAVES_GENERALES = ["total_cocheras", "max_cocheras_mensuales", "tolerancia_minutos"]


def leer_config(db: Session, clave: str, default: str = "0") -> str:
    valor = db.scalar(select(Configuracion.valor).where(Configuracion.clave == clave))
    return valor if valor is not None else default


def guardar_config(db: Session, clave: str, valor: str) -> None:
    fila = db.scalar(select(Configuracion).where(Configuracion.clave == clave))
    if fila is None:
        db.add(Configuracion(clave=clave, valor=valor))
    else:
        fila.valor = valor


@router.get("/generales", response_model=ConfigGenerales)
def obtener_generales(db: Session = Depends(get_db)):
    return ConfigGenerales(
        total_cocheras=int(leer_config(db, "total_cocheras")),
        max_cocheras_mensuales=int(leer_config(db, "max_cocheras_mensuales")),
        tolerancia_minutos=int(leer_config(db, "tolerancia_minutos", "0")),
    )


@router.put("/generales", response_model=ConfigGenerales)
def actualizar_generales(data: ConfigGenerales, db: Session = Depends(get_db)):
    total_actual = int(leer_config(db, "total_cocheras"))
    mensuales_actual = int(leer_config(db, "max_cocheras_mensuales"))

    # Cocheras totales: no se puede bajar por debajo de las ocupadas
    ocupadas = db.scalar(
        select(func.count(Cochera.id)).where(Cochera.estado == "ocupada")
    )
    if data.total_cocheras < total_actual:
        ocupadas_no_mensuales = db.scalar(
            select(func.count(Cochera.id)).where(Cochera.estado == "ocupada")
        )
        if data.total_cocheras < ocupadas_no_mensuales:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede bajar a {data.total_cocheras}: hay {ocupadas_no_mensuales} ocupadas",
            )

    # Cupo de mensuales: no se puede bajar por debajo de los clientes activos
    activos = db.scalar(
        select(func.count(ClienteMensual.id)).where(ClienteMensual.activo.is_(True))
    )
    if data.max_cocheras_mensuales < activos:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede bajar el cupo a {data.max_cocheras_mensuales}: hay {activos} clientes mensuales activos",
        )

    # Ajustar cocheras: agregar o quitar comunes/mensuales según el cupo
    _ajustar_cocheras(db, total=data.total_cocheras, mensuales=data.max_cocheras_mensuales)

    guardar_config(db, "total_cocheras", str(data.total_cocheras))
    guardar_config(db, "max_cocheras_mensuales", str(data.max_cocheras_mensuales))
    guardar_config(db, "tolerancia_minutos", str(data.tolerancia_minutos))
    db.commit()
    return data


def _ajustar_cocheras(db: Session, total: int, mensuales: int) -> None:
    """Crea las cocheras que faltan y desactiva las sobrantes (sin borrar historial)."""
    if mensuales > total:
        raise HTTPException(status_code=400, detail="Las mensuales no pueden superar el total")

    cocheras = db.scalars(select(Cochera).order_by(Cochera.id)).all()
    existentes = len(cocheras)
    # Crear faltantes
    for n in range(existentes + 1, total + 1):
        db.add(Cochera(numero=str(n), tipo="comun", estado="libre", activa=True))
    db.flush()

    todas = db.scalars(select(Cochera).order_by(Cochera.id)).all()
    for i, c in enumerate(todas, start=1):
        c.activa = i <= total
        if i <= mensuales:
            c.tipo = "mensual"
        elif c.tipo == "mensual":
            c.tipo = "comun"


@router.get("/tarifas", response_model=list[TarifaOut])
def listar_tarifas(db: Session = Depends(get_db)):
    return db.scalars(select(TipoTarifa).order_by(TipoTarifa.duracion_minutos)).all()


@router.post("/tarifas", response_model=TarifaOut, status_code=status.HTTP_201_CREATED)
def crear_tarifa(data: TarifaCreate, db: Session = Depends(get_db)):
    tarifa = TipoTarifa(**data.model_dump())
    db.add(tarifa)
    db.commit()
    db.refresh(tarifa)
    return tarifa


@router.put("/tarifas/{tarifa_id}", response_model=TarifaOut)
def actualizar_tarifa(tarifa_id: int, data: TarifaUpdate, db: Session = Depends(get_db)):
    tarifa = db.get(TipoTarifa, tarifa_id)
    if tarifa is None:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")
    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(tarifa, campo, valor)
    db.commit()
    db.refresh(tarifa)
    return tarifa

@router.delete("/tarifas/{tarifa_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_tarifa(tarifa_id: int, db: Session = Depends(get_db)):
    tarifa = db.get(TipoTarifa, tarifa_id)
    if tarifa is None:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")

    usada = db.scalar(select(Estadia.id).where(Estadia.tarifa_id == tarifa_id).limit(1))
    if usada is not None:
        raise HTTPException(
            status_code=400,
            detail=f"La tarifa '{tarifa.nombre}' ya fue usada en cobros. Desactivala en lugar de eliminarla.",
        )

    db.delete(tarifa)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)