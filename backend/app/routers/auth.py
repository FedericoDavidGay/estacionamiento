from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario
from security import crear_token, get_current_user, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    usuario = db.scalar(
        select(Usuario).where(Usuario.username == data.username.strip().lower())
    )
    if usuario is None or not usuario.activo or not verify_password(
        data.password, usuario.password_hash
    ):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    return {
        "token": crear_token(usuario.id),
        "usuario": {"id": usuario.id, "nombre": usuario.nombre, "rol": usuario.rol},
    }


@router.get("/me")
def me(usuario: Usuario = Depends(get_current_user)):
    return {
        "id": usuario.id,
        "username": usuario.username,
        "nombre": usuario.nombre,
        "rol": usuario.rol,
    }