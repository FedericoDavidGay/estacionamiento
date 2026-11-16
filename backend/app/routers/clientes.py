from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import ClienteMensual, Cochera, Configuracion
from schemas import ClienteCreate, ClienteOut, ClienteUpdate

import calendar

router = APIRouter(prefix="/clientes", tags=["clientes mensuales"])


def normalizar_patente(patente: str) -> str:
    return patente.upper().replace(" ", "").replace("-", "").strip()


def max_mensuales(db: Session) -> int:
    valor = db.scalar(
        select(Configuracion.valor).where(Configuracion.clave == "max_cocheras_mensuales")
    )
    return int(valor) if valor else 0


def validar_cupo(db: Session, cochera_id: int | None, excluir_id: int | None, chequear_cupo: bool):
    """Se llama cuando el cliente queda activo (alta, reactivación o cambio de cochera)."""
    if chequear_cupo:
        q = select(func.count(ClienteMensual.id)).where(ClienteMensual.activo.is_(True))
        if excluir_id is not None:
            q = q.where(ClienteMensual.id != excluir_id)
        ocupados = db.scalar(q)
        maximo = max_mensuales(db)
        if ocupados >= maximo:
            raise HTTPException(
                status_code=400,
                detail=f"No hay cupo de mensuales: máximo {maximo}, activos {ocupados}",
            )

    if cochera_id is not None:
        cochera = db.get(Cochera, cochera_id)
        if cochera is None:
            raise HTTPException(status_code=404, detail="La cochera no existe")
        if cochera.tipo != "mensual":
            raise HTTPException(
                status_code=400,
                detail=f"La cochera {cochera.numero} no es de tipo mensual",
            )
        q = select(ClienteMensual.id).where(ClienteMensual.cochera_id == cochera_id)
        if excluir_id is not None:
            q = q.where(ClienteMensual.id != excluir_id)
        if db.scalar(q) is not None:
            raise HTTPException(
                status_code=400,
                detail=f"La cochera {cochera.numero} ya está asignada a otro cliente",
            )


@router.get("", response_model=list[ClienteOut])
def listar(q: str | None = None, db: Session = Depends(get_db)):
    stmt = select(ClienteMensual).order_by(ClienteMensual.apellido, ClienteMensual.nombre)
    if q:
        patron = f"%{q}%"
        stmt = stmt.where(
            or_(
                ClienteMensual.nombre.ilike(patron),
                ClienteMensual.apellido.ilike(patron),
                ClienteMensual.dni.ilike(patron),
                ClienteMensual.patente.ilike(patron),
            )
        )
    return db.scalars(stmt).all()


@router.get("/{cliente_id}", response_model=ClienteOut)
def obtener(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.get(ClienteMensual, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
def crear(data: ClienteCreate, db: Session = Depends(get_db)):
    datos = data.model_dump()
    datos["patente"] = normalizar_patente(datos["patente"])

    if datos["activo"]:
        validar_cupo(db, datos["cochera_id"], excluir_id=None, chequear_cupo=True)
    elif datos["cochera_id"] is not None:
        validar_cupo(db, datos["cochera_id"], excluir_id=None, chequear_cupo=False)

    cliente = ClienteMensual(**datos)
    db.add(cliente)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="El DNI ya está registrado")
    db.refresh(cliente)
    return cliente


@router.put("/{cliente_id}", response_model=ClienteOut)
def actualizar(cliente_id: int, data: ClienteUpdate, db: Session = Depends(get_db)):
    cliente = db.get(ClienteMensual, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    if cambios.get("patente"):
        cambios["patente"] = normalizar_patente(cambios["patente"])

    nuevo_activo = cambios.get("activo", cliente.activo)
    nueva_cochera = cambios.get("cochera_id", cliente.cochera_id)
    reactiva = nuevo_activo and not cliente.activo
    cambia_cochera = "cochera_id" in cambios and cambios["cochera_id"] != cliente.cochera_id

    if nuevo_activo and (reactiva or cambia_cochera):
        validar_cupo(db, nueva_cochera, excluir_id=cliente.id, chequear_cupo=reactiva)

    for campo, valor in cambios.items():
        setattr(cliente, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="El DNI ya está registrado")
    db.refresh(cliente)
    return cliente

def sumar_meses(fecha: datetime, meses: int) -> datetime:
    total = fecha.month - 1 + meses
    anio = fecha.year + total // 12
    mes = total % 12 + 1
    dia = min(fecha.day, calendar.monthrange(anio, mes)[1])
    return fecha.replace(year=anio, month=mes, day=dia)


@router.post("/{cliente_id}/renovar", response_model=ClienteOut)
def renovar(cliente_id: int, meses: int = 1, db: Session = Depends(get_db)):
    cliente = db.get(ClienteMensual, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if not cliente.activo:
        validar_cupo(db, cliente.cochera_id, excluir_id=cliente.id, chequear_cupo=True)
        cliente.activo = True

    ahora = datetime.now()
    base = cliente.vencimiento if cliente.vencimiento and cliente.vencimiento > ahora else ahora
    cliente.vencimiento = sumar_meses(base, meses).replace(hour=23, minute=59, second=59)

    db.commit()
    db.refresh(cliente)
    return cliente

@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.get(ClienteMensual, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(cliente)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)