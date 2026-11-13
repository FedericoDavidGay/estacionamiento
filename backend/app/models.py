from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Cochera(Base):
    __tablename__ = "cocheras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(10), unique=True)
    tipo: Mapped[str] = mapped_column(String(20), default="comun")  # comun | mensual | discapacitados
    estado: Mapped[str] = mapped_column(String(20), default="libre")  # libre | ocupada | reservada
    activa: Mapped[bool] = mapped_column(Boolean, default=True)

    cliente_mensual: Mapped["ClienteMensual | None"] = relationship(back_populates="cochera")


class TipoTarifa(Base):
    __tablename__ = "tipos_tarifa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50))
    duracion_minutos: Mapped[int] = mapped_column(Integer)
    precio: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Configuracion(Base):
    __tablename__ = "configuracion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clave: Mapped[str] = mapped_column(String(50), unique=True)
    valor: Mapped[str] = mapped_column(Text)


class ClienteMensual(Base):
    __tablename__ = "clientes_mensuales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    apellido: Mapped[str] = mapped_column(String(100))
    dni: Mapped[str] = mapped_column(String(20), unique=True)
    telefono: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(120))
    patente: Mapped[str] = mapped_column(String(10))
    vehiculo_tipo: Mapped[str | None] = mapped_column(String(50))
    vehiculo_modelo: Mapped[str | None] = mapped_column(String(80))
    cochera_id: Mapped[int | None] = mapped_column(ForeignKey("cocheras.id"), unique=True)
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    vencimiento: Mapped[datetime | None] = mapped_column(DateTime)
    precio_mensual: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    observaciones: Mapped[str | None] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    cochera: Mapped[Cochera | None] = relationship(back_populates="cliente_mensual")

class Estadia(Base):
    __tablename__ = "estadias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patente: Mapped[str] = mapped_column(String(10), index=True)
    tipo: Mapped[str] = mapped_column(String(20))  # comun | mensual
    cochera_id: Mapped[int | None] = mapped_column(ForeignKey("cocheras.id"))
    cliente_id: Mapped[int | None] = mapped_column(ForeignKey("clientes_mensuales.id"))
    fecha_entrada: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    fecha_salida: Mapped[datetime | None] = mapped_column(DateTime)
    minutos: Mapped[int | None] = mapped_column(Integer)
    tarifa_id: Mapped[int | None] = mapped_column(ForeignKey("tipos_tarifa.id"))
    monto: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    forma_pago: Mapped[str | None] = mapped_column(String(30))
    estado: Mapped[str] = mapped_column(String(20), default="activa", index=True)  # activa | cerrada

class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    nombre: Mapped[str] = mapped_column(String(100))
    rol: Mapped[str] = mapped_column(String(20), default="operador")  # operador | admin
    activo: Mapped[bool] = mapped_column(Boolean, default=True)