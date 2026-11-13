from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ClienteMensual, Estadia
from app.routers.clientes import normalizar_patente
from app.schemas import EstadiaOut

router = APIRouter(prefix="/vehiculos", tags=["vehiculos"])


@router.get("/{patente}")
def ficha(patente: str, db: Session = Depends(get_db)):
    p = normalizar_patente(patente)

    estadias = db.scalars(
        select(Estadia).where(Estadia.patente == p).order_by(Estadia.fecha_entrada.desc())
    ).all()
    cliente = db.scalar(select(ClienteMensual).where(ClienteMensual.patente == p))

    if not estadias and cliente is None:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    cerradas = [e for e in estadias if e.estado == "cerrada"]
    total = sum((e.monto or Decimal("0") for e in cerradas), Decimal("0"))
    minutos = [e.minutos for e in cerradas if e.minutos is not None]

    return {
        "patente": p,
        "cliente": {
            "id": cliente.id,
            "nombre": f"{cliente.apellido}, {cliente.nombre}",
            "activo": cliente.activo,
            "vencimiento": cliente.vencimiento,
            "cochera_id": cliente.cochera_id,
        }
        if cliente
        else None,
        "adentro": any(e.estado == "activa" for e in estadias),
        "visitas": len(estadias),
        "cobradas": len(cerradas),
        "total_cobrado": total,
        "promedio_minutos": round(sum(minutos) / len(minutos)) if minutos else None,
        "primera_visita": estadias[-1].fecha_entrada if estadias else None,
        "ultima_visita": estadias[0].fecha_entrada if estadias else None,
        "historial": [EstadiaOut.model_validate(e) for e in estadias],
    }