import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import Configuracion from "./Configuracion";
import Clientes from "./Clientes";
import Reportes from "./Reportes";
import Vehiculos from "./Vehiculos";

const formatoPesos = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const hora = (iso) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

function Card({ titulo, valor }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{valor}</p>
    </div>
  );
}

export default function App() {
  const [vista, setVista] = useState("panel");
  const [resumen, setResumen] = useState(null);
  const [activas, setActivas] = useState([]);
  const [patenteIngreso, setPatenteIngreso] = useState("");
  const [patenteCobro, setPatenteCobro] = useState("");
  const [calculo, setCalculo] = useState(null);
  const [formaPago, setFormaPago] = useState("efectivo");
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto }

  const avisar = (tipo, texto) => setMensaje({ tipo, texto });

  const cargar = useCallback(async () => {
    try {
      const [r, a] = await Promise.all([api.resumen(), api.activas()]);
      setResumen(r);
      setActivas(a);
    } catch (e) {
      avisar("error", "No se pudo conectar con la API: " + e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar]);

  async function ingresar(e) {
    e.preventDefault();
    if (!patenteIngreso.trim()) return;
    try {
      const est = await api.ingreso(patenteIngreso);
      avisar(
        "ok",
        `Ingresó ${est.patente} (${est.tipo === "mensual" ? "cliente mensual" : "cochera común"})`
      );
      setPatenteIngreso("");
      cargar();
    } catch (err) {
      avisar("error", err.message);
    }
  }

  async function buscar(patente = patenteCobro) {
    if (!patente.trim()) return;
    try {
      const c = await api.buscar(patente);
      setCalculo(c);
      setPatenteCobro(c.patente);
      setMensaje(null);
    } catch (err) {
      setCalculo(null);
      avisar("error", err.message);
    }
  }

  async function cobrar() {
    try {
      const est = await api.cobrar(calculo.patente, formaPago);
      const extra = est.tipo === "comun" ? " Cochera liberada." : "";
      avisar("ok", `Cobrado ${formatoPesos(est.monto)} a ${est.patente}.${extra}`);
      setCalculo(null);
      setPatenteCobro("");
      cargar();
    } catch (err) {
      avisar("error", err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      {mensaje && (
        <div
          className={`mb-4 rounded-lg p-3 ${
            mensaje.tipo === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {mensaje.texto}
        </div>
      )}
      {vista === "config" ? (
        <Configuracion onVolver={() => setVista("panel")} onAviso={avisar} />
      ) : vista === "clientes" ? (
        <Clientes onVolver={() => setVista("panel")} onAviso={avisar} />
      ) : vista === "reportes" ? (
        <Reportes onVolver={() => setVista("panel")} onAviso={avisar} />
      ) : vista === "vehiculos" ? (
        <Vehiculos onVolver={() => setVista("panel")} onAviso={avisar} />
      ) : (
        <>
          <header className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Estacionamiento</h1>
              <p className="text-slate-500">Panel del día</p>
            </div>
            <div className="mt-2 flex gap-4">
              <button
                onClick={() => setVista("vehiculos")}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Buscar vehículo
              </button>
              <button
                onClick={() => setVista("reportes")}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Reportes
              </button>
              <button
                onClick={() => setVista("clientes")}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Clientes mensuales
              </button>
              <button
                onClick={() => setVista("config")}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Configuración ⚙
              </button>
            </div>
          </header>

          

          {resumen && (
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
              <Card titulo="Adentro" valor={resumen.adentro} />
              <Card
                titulo="Cocheras libres"
                valor={`${resumen.cocheras_comunes_libres} / ${resumen.cocheras_comunes_total}`}
              />
              <Card titulo="Mensuales activos" valor={resumen.mensuales_activos} />
              <Card titulo="Salidas hoy" valor={resumen.autos_salidos_hoy} />
              <Card titulo="Ingresos hoy" valor={formatoPesos(resumen.ingresos_hoy)} />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <section className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-slate-800">Ingreso manual</h2>
                <form onSubmit={ingresar} className="flex gap-2">
                  <input
                    value={patenteIngreso}
                    onChange={(e) => setPatenteIngreso(e.target.value)}
                    placeholder="Patente, ej: AB123CD"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 uppercase"
                  />
                  <button className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700">
                    Ingresar
                  </button>
                </form>
              </section>

              <section className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-slate-800">Cobro</h2>
                <div className="flex gap-2">
                  <input
                    value={patenteCobro}
                    onChange={(e) => setPatenteCobro(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && buscar()}
                    placeholder="Patente"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 uppercase"
                  />
                  <button
                    onClick={() => buscar()}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
                  >
                    Buscar
                  </button>
                </div>

                {calculo && (
                  <div className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
                    <p className="font-semibold text-slate-800">{calculo.patente}</p>
                    <p className="text-sm text-slate-600">
                      Entrada: {hora(calculo.fecha_entrada)} · Tiempo: {calculo.minutos} min
                    </p>
                    <p className="text-sm text-slate-600">
                      Tipo: {calculo.tipo === "mensual" ? "cliente mensual" : "común"}
                    </p>
                    <p className="text-3xl font-bold text-slate-800">
                      {formatoPesos(calculo.monto)}
                    </p>
                    <select
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="qr">QR</option>
                    </select>
                    <button
                      onClick={cobrar}
                      className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-500"
                    >
                      Cobrar y salir
                    </button>
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Autos adentro</h2>
                <button onClick={cargar} className="text-sm text-slate-500 hover:text-slate-800">
                  Actualizar
                </button>
              </div>
              {activas.length === 0 ? (
                <p className="text-slate-500">No hay autos adentro.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500">
                    <tr>
                      <th className="py-2">Patente</th>
                      <th>Tipo</th>
                      <th>Cochera</th>
                      <th>Entrada</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activas.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 font-semibold text-slate-800">{a.patente}</td>
                        <td>{a.tipo === "mensual" ? "Mensual" : "Común"}</td>
                        <td>{a.cochera_id ?? "-"}</td>
                        <td>{hora(a.fecha_entrada)}</td>
                        <td className="text-right">
                          <button
                            onClick={() => {
                              setPatenteCobro(a.patente);
                              buscar(a.patente);
                            }}
                            className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
                          >
                            Cobrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}