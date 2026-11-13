from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine
from routers import auth, clientes, configuracion, estadias, reportes, vehiculos
from security import get_current_user, solo_admin

app = FastAPI(title="Estacionamiento API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # O puedes poner la URL de Vercel una vez que te la den
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clientes.router, dependencies=[Depends(get_current_user)])
app.include_router(estadias.router, dependencies=[Depends(get_current_user)])
app.include_router(reportes.router, dependencies=[Depends(get_current_user)])
app.include_router(vehiculos.router, dependencies=[Depends(get_current_user)])
app.include_router(configuracion.router, dependencies=[Depends(solo_admin)])


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "db": "ok"}