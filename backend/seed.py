from decimal import Decimal

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import Configuracion, Cochera, TipoTarifa


def seed():
    db = SessionLocal()
    try:
        # 1. Cocheras: 30 en total, las primeras 10 mensuales
        if db.scalar(select(func.count(Cochera.id))) == 0:
            for n in range(1, 31):
                tipo = "mensual" if n <= 10 else "comun"
                db.add(Cochera(numero=str(n), tipo=tipo, estado="libre"))
            print("Cocheras cargadas: 30 (10 mensuales)")
        else:
            print("Las cocheras ya existen, no se cargan de nuevo")

        # 2. Tarifas: precios de ejemplo, editalos después desde la configuración
        if db.scalar(select(func.count(TipoTarifa.id))) == 0:
            tarifas = [
                ("Media hora", 30, Decimal("500.00")),
                ("Hora", 60, Decimal("900.00")),
                ("Medio día", 720, Decimal("3000.00")),
                ("Día completo", 1440, Decimal("5000.00")),
                ("Semana", 10080, Decimal("25000.00")),
                ("Quincena", 21600, Decimal("45000.00")),
                ("Mes", 43200, Decimal("80000.00")),
            ]
            for nombre, minutos, precio in tarifas:
                db.add(TipoTarifa(nombre=nombre, duracion_minutos=minutos, precio=precio, activo=True))
            print("Tarifas cargadas: 7")
        else:
            print("Las tarifas ya existen, no se cargan de nuevo")

        # 3. Configuración: el límite de mensuales se guarda acá
        configuracion_inicial = {
            "total_cocheras": "30",
            "max_cocheras_mensuales": "10",
        }
        for clave, valor in configuracion_inicial.items():
            existe = db.scalar(select(Configuracion).where(Configuracion.clave == clave))
            if existe is None:
                db.add(Configuracion(clave=clave, valor=valor))
        print("Configuración verificada")

        db.commit()
        print("Carga inicial terminada")
    finally:
        db.close()


if __name__ == "__main__":
    seed()