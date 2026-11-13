from getpass import getpass

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Usuario
from app.security import hash_password


def main():
    username = input("Usuario (sin espacios): ").strip().lower()
    nombre = input("Nombre para mostrar: ").strip()
    rol = input("Rol (operador / admin): ").strip().lower()
    if rol not in ("operador", "admin"):
        print("Rol inválido")
        return
    password = getpass("Contraseña: ")

    db = SessionLocal()
    try:
        if db.scalar(select(Usuario).where(Usuario.username == username)):
            print("Ese usuario ya existe")
            return
        db.add(
            Usuario(
                username=username,
                nombre=nombre,
                rol=rol,
                password_hash=hash_password(password),
            )
        )
        db.commit()
        print(f"Usuario '{username}' creado con rol {rol}")
    finally:
        db.close()


if __name__ == "__main__":
    main()