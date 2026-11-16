from datetime import date, datetime, time, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_db
from models import ClienteMensual, Cochera, Configuracion, Estadia
from routers.clientes import normalizar_patente
from schemas import EstadiaOut

router = APIRouter(prefix="/reportes", tags=["reportes"])


def _inicio_mes(anio: int, mes: int) -> datetime:
    return datetime(anio, mes, 1)


def _inicio_mes_siguiente(anio: int, mes: int) -> datetime:
    return datetime(anio + 1, 1, 1) if mes == 12 else datetime(anio, mes + 1, 1)


@router.get("/resumen")
def resumen(db: Session = Depends(get_db)):
    """Estado actual del estacionamiento y recaudación del día."""
    inicio_hoy = datetime.combine(date.today(), time.min)

    comunes_total = db.scalar(
        select(func.count(Cochera.id)).where(Cochera.tipo == "comun", Cochera.activa.is_(True))
    )
    comunes_ocupadas = db.scalar(
        select(func.count(Estadia.id)).where(Estadia.estado == "activa", Estadia.tipo == "comun")
    )
    adentro = db.scalar(select(func.count(Estadia.id)).where(Estadia.estado == "activa"))
    mensuales_activos = db.scalar(
        select(func.count(ClienteMensual.id)).where(ClienteMensual.activo.is_(True))
    )
    max_mensuales = int(
        db.scalar(select(Configuracion.valor).where(Configuracion.clave == "max_cocheras_mensuales"))
        or 0
    )
    ingresos_hoy = db.scalar(
        select(func.coalesce(func.sum(Estadia.monto), 0)).where(
            Estadia.estado == "cerrada", Estadia.fecha_salida >= inicio_hoy
        )
    )
    autos_hoy = db.scalar(
        select(func.count(Estadia.id)).where(
            Estadia.estado == "cerrada", Estadia.fecha_salida >= inicio_hoy
        )
    )

    return {
        "adentro": adentro,
        "cocheras_comunes_total": comunes_total,
        "cocheras_comunes_libres": comunes_total - comunes_ocupadas,
        "mensuales_activos": mensuales_activos,
        "autos_salidos_hoy": autos_hoy,
        "mensuales_maximo": max_mensuales,
        "ingresos_hoy": ingresos_hoy,
    }


@router.get("/meses")
def meses(db: Session = Depends(get_db)):
    """Lista de meses con cantidad de autos e ingresos totales."""
    mes = func.date_trunc("month", Estadia.fecha_salida)
    filas = db.execute(
        select(mes, func.count(Estadia.id), func.coalesce(func.sum(Estadia.monto), 0))
        .where(Estadia.estado == "cerrada")
        .group_by(mes)
        .order_by(mes.desc())
    ).all()
    return [
        {"mes": f[0].strftime("%Y-%m"), "autos": f[1], "ingresos": f[2]}
        for f in filas
    ]


@router.get("/mes/{anio}/{mes}")
def detalle_mes(anio: int, mes: int, db: Session = Depends(get_db)):
    """Detalle de un mes: total, forma de pago y listado de autos."""
    estadias = db.scalars(
        select(Estadia)
        .where(
            Estadia.estado == "cerrada",
            Estadia.fecha_salida >= _inicio_mes(anio, mes),
            Estadia.fecha_salida < _inicio_mes_siguiente(anio, mes),
        )
        .order_by(Estadia.fecha_salida)
    ).all()

    total = sum((e.monto or Decimal("0") for e in estadias), Decimal("0"))
    por_forma_pago: dict[str, Decimal] = {}
    for e in estadias:
        clave = e.forma_pago or "sin dato"
        por_forma_pago[clave] = por_forma_pago.get(clave, Decimal("0")) + (e.monto or Decimal("0"))

    return {
        "anio": anio,
        "mes": mes,
        "autos": len(estadias),
        "ingresos_total": total,
        "por_forma_pago": por_forma_pago,
        "estadias": [EstadiaOut.model_validate(e) for e in estadias],
    }


@router.get("/buscar")
def buscar(
    patente: str | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    forma_pago: str | None = None,
    tipo: str | None = None,
    db: Session = Depends(get_db),
):
    """Búsqueda avanzada de estadías cerradas. Todos los filtros son opcionales."""
    stmt = select(Estadia).where(Estadia.estado == "cerrada")

    if patente:
        stmt = stmt.where(Estadia.patente == normalizar_patente(patente))
    if desde:
        stmt = stmt.where(Estadia.fecha_salida >= datetime.combine(desde, time.min))
    if hasta:
        stmt = stmt.where(
            Estadia.fecha_salida < datetime.combine(hasta + timedelta(days=1), time.min)
        )
    if forma_pago:
        stmt = stmt.where(Estadia.forma_pago == forma_pago)
    if tipo:
        stmt = stmt.where(Estadia.tipo == tipo)

    estadias = db.scalars(stmt.order_by(Estadia.fecha_salida.desc())).all()
    total = sum((e.monto or Decimal("0") for e in estadias), Decimal("0"))

    return {
        "cantidad": len(estadias),
        "total": total,
        "estadias": [EstadiaOut.model_validate(e) for e in estadias],
    }