from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ClienteCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    dni: str = Field(min_length=1, max_length=20)
    telefono: str | None = None
    email: str | None = None
    patente: str = Field(min_length=1, max_length=10)
    vehiculo_tipo: str | None = None
    vehiculo_modelo: str | None = None
    cochera_id: int | None = None
    vencimiento: datetime | None = None
    precio_mensual: Decimal = Field(ge=0)
    observaciones: str | None = None
    activo: bool = True


class ClienteUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    apellido: str | None = Field(default=None, min_length=1, max_length=100)
    dni: str | None = Field(default=None, min_length=1, max_length=20)
    telefono: str | None = None
    email: str | None = None
    patente: str | None = Field(default=None, min_length=1, max_length=10)
    vehiculo_tipo: str | None = None
    vehiculo_modelo: str | None = None
    cochera_id: int | None = None
    vencimiento: datetime | None = None
    precio_mensual: Decimal | None = Field(default=None, ge=0)
    observaciones: str | None = None
    activo: bool | None = None


class ClienteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    dni: str
    telefono: str | None
    email: str | None
    patente: str
    vehiculo_tipo: str | None
    vehiculo_modelo: str | None
    cochera_id: int | None
    fecha_inicio: datetime
    vencimiento: datetime | None
    precio_mensual: Decimal
    observaciones: str | None
    activo: bool

class IngresoIn(BaseModel):
    patente: str = Field(min_length=1, max_length=10)


class CobroIn(BaseModel):
    forma_pago: str = Field(default="efectivo", max_length=30)


class EstadiaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patente: str
    tipo: str
    cochera_id: int | None
    cliente_id: int | None
    fecha_entrada: datetime
    fecha_salida: datetime | None
    minutos: int | None
    tarifa_id: int | None
    monto: Decimal | None
    forma_pago: str | None
    estado: str

class ConfigGenerales(BaseModel):
    total_cocheras: int = Field(ge=1)
    max_cocheras_mensuales: int = Field(ge=0)
    tolerancia_minutos: int = Field(default=0, ge=0)


class TarifaBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    duracion_minutos: int = Field(gt=0)
    precio: Decimal = Field(ge=0)
    activo: bool = True


class TarifaCreate(TarifaBase):
    pass


class TarifaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=50)
    duracion_minutos: int | None = Field(default=None, gt=0)
    precio: Decimal | None = Field(default=None, ge=0)
    activo: bool | None = None


class TarifaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    duracion_minutos: int
    precio: Decimal
    activo: bool