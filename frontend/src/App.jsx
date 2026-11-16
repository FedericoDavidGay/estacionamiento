import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import Configuracion from "./Configuracion";
import Clientes from "./Clientes";
import Reportes from "./Reportes";
import Vehiculos from "./Vehiculos";
import Layout from "./Layout";

const formatoPesos = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const hora = (iso) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

const minutosDesde = (iso) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));

const duracion = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

function Kpi({ icono, titulo, valor, color = "azul", barra }) {
  const borde = color === "azul" ? "border-azul" : "border-naranja";
  const fondo = color === "azul" ? "bg-azul/10" : "bg-naranja/10";
  return (
    <div className={`flex h-full flex-col rounded-xl border-l-4 bg-white p-3 shadow-sm ${borde}`}>
      <div className="flex items-center gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg ${fondo}`}
        >
          {icono}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500">{titulo}</p>
          <p className="truncate text-lg font-bold text-slate-800">{valor}</p>
        </div>
      </div>
      <div className="mt-auto pt-2">
        <div className="h-1.5 w-full rounded-full bg-slate-200">
          <div
            className={`h-1.5 rounded-full bg-naranja ${barra === undefined ? "opacity-0" : ""}`}
            style={{ width: `${barra ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function App({ usuario, onSalir }) {
  const [vista, setVista] = useState("panel");
  const [resumen, setResumen] = useState(null);
  const [activas, setActivas] = useState([]);
  const [movs, setMovs] = useState([]);
  const [patenteIngreso, setPatenteIngreso] = useState("");
  const [patenteCobro, setPatenteCobro] = useState("");
  const [calculo, setCalculo] = useState(null);
  const [formaPago, setFormaPago] = useState("efectivo");
  const [mensaje, setMensaje] = useState(null);
  const ingresoRef = useRef(null);
  const cobroRef = useRef(null);

  const avisar = (tipo, texto) => setMensaje({ tipo, texto });

  const cargar = useCallback(async () => {
    try {
      const [r, a, hist] = await Promise.all([
        api.resumen(),
        api.activas(),
        api.buscarReportes({}),
      ]);
      setResumen(r);
      setActivas(a);
      setMovs(
        [
          ...a.map((e) => ({
            id: "in" + e.id,
            tipo: "Ingreso",
            patente: e.patente,
            fecha: e.fecha_entrada,
          })),
          ...hist.estadias.map((e) => ({
            id: "out" + e.id,
            tipo: "Salida",
            patente: e.patente,
            fecha: e.fecha_salida,
          })),
        ]
          .sort((x, y) => new Date(y.fecha) - new Date(x.fecha))
          .slice(0, 6)
      );
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

  const total = resumen?.cocheras_comunes_total ?? 0;
  const libres = resumen?.cocheras_comunes_libres ?? 0;
  const ocupadas = total - libres;
  const pctOcupadas = total ? Math.round((ocupadas / total) * 100) : 0;
  const pctLibres = total ? Math.round((libres / total) * 100) : 0;

  const input =
    "min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-azul focus:outline-none";

  return (
    <Layout vista={vista} onNavegar={setVista} onSalir={onSalir} usuario={usuario}>
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
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Saludo: ancho completo */}
          <div className="shrink-0">
            <h1 className="text-[18px] font-bold text-azul md:text-[22px]">
              ¡Hola, {usuario?.nombre?.split(" ")[0] ?? ""}!
            </h1>
            <p className="text-xs text-slate-500 md:text-sm">
              Acá tenés el resumen del estacionamiento.
            </p>
          </div>

          {/* Indicadores: ancho completo */}
          {resumen && (
            <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi
                icono="🚗"
                titulo="Vehículos adentro"
                valor={`${resumen.adentro} / ${total}`}
                barra={pctOcupadas}
              />
              <Kpi
                icono="🅿️"
                titulo="Cocheras libres"
                valor={`${libres} / ${total}`}
                color="naranja"
                barra={pctLibres}
              />
              <Kpi
                icono="👥"
                titulo="Mensuales activos"
                valor={`${resumen.mensuales_activos} / ${resumen.mensuales_maximo ?? 0}`}
                barra={
                  resumen.mensuales_maximo
                    ? Math.round((resumen.mensuales_activos / resumen.mensuales_maximo) * 100)
                    : 0
                }
              />
              <Kpi
                icono="💰"
                titulo="Ingresos hoy"
                valor={formatoPesos(resumen.ingresos_hoy)}
                color="naranja"
              />
            </div>
          )}

          {/* Grilla inferior: 3 columnas + 1 columna */}
          <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-4">
            {/* Columna izquierda (3/4) */}
            <div className="flex min-w-0 flex-col gap-3 lg:col-span-3 lg:min-h-0">
              <div className="grid shrink-0 gap-3 md:grid-cols-2">
                <section className="rounded-xl bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-base font-semibold text-azul">🚗 Ingreso manual</h2>
                  <form onSubmit={ingresar} className="flex gap-2">
                    <input
                      ref={ingresoRef}
                      value={patenteIngreso}
                      onChange={(e) => setPatenteIngreso(e.target.value)}
                      placeholder="Patente (ej. AB123CD)"
                      className={`${input} text-sm uppercase`}
                    />
                    <button className="shrink-0 rounded-lg bg-naranja px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
                      → Ingresar
                    </button>
                  </form>
                </section>

                <section className="rounded-xl bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-base font-semibold text-azul">💲 Cobro rápido</h2>
                  <div className="flex gap-2">
                    <input
                      ref={cobroRef}
                      value={patenteCobro}
                      onChange={(e) => setPatenteCobro(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && buscar()}
                      placeholder="Patente"
                      className={`${input} text-sm uppercase`}
                    />
                    <button
                      onClick={() => buscar()}
                      className="shrink-0 rounded-lg bg-naranja px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      🔍 Buscar
                    </button>
                  </div>

                  {calculo && (
                    <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-semibold text-azul">{calculo.patente}</p>
                      <p className="text-slate-600">
                        Entrada: {hora(calculo.fecha_entrada)} · {calculo.minutos} min ·{" "}
                        {calculo.tipo === "mensual" ? "mensual" : "común"}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-2xl font-bold text-slate-800">
                          {formatoPesos(calculo.monto)}
                        </p>
                        <select
                          value={formaPago}
                          onChange={(e) => setFormaPago(e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="tarjeta">Tarjeta</option>
                          <option value="qr">QR</option>
                        </select>
                      </div>
                      <button
                        onClick={cobrar}
                        className="w-full rounded-lg bg-green-600 px-3 py-2 font-semibold text-white hover:bg-green-500"
                      >
                        Cobrar y salir
                      </button>
                    </div>
                  )}
                </section>
              </div>

              <section className="flex flex-col rounded-xl bg-white p-4 shadow-sm lg:min-h-0 lg:flex-1">
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <h2 className="text-base font-semibold text-azul">Autos adentro</h2>
                  <button onClick={cargar} className="text-xs text-slate-500 hover:text-azul">
                    ⟳ Actualizar
                  </button>
                </div>
                {activas.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay autos adentro.</p>
                ) : (
                  <div className="max-h-72 overflow-auto lg:max-h-none lg:min-h-0 lg:flex-1">
                    <table className="w-full min-w-[560px] text-left text-xs md:text-sm">
                      <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Patente</th>
                          <th className="px-2">Tipo</th>
                          <th className="px-2">Cochera</th>
                          <th className="px-2">Entrada</th>
                          <th className="px-2">Tiempo</th>
                          <th className="px-2">Estado</th>
                          <th className="px-2 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activas.map((a) => (
                          <tr key={a.id} className="border-b last:border-0">
                            <td className="px-2 py-2 font-bold text-azul">{a.patente}</td>
                            <td className="px-2">{a.tipo === "mensual" ? "Mensual" : "Común"}</td>
                            <td className="px-2">{a.cochera_id ?? "-"}</td>
                            <td className="px-2">{hora(a.fecha_entrada)}</td>
                            <td className="px-2">{duracion(minutosDesde(a.fecha_entrada))}</td>
                            <td className="px-2 text-green-700">● Dentro</td>
                            <td className="px-2 text-right">
                              <button
                                onClick={() => {
                                  setPatenteCobro(a.patente);
                                  buscar(a.patente);
                                }}
                                className="rounded-md border border-naranja px-2 py-1 text-naranja hover:bg-naranja/10"
                              >
                                $ Cobrar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* Columna derecha (1/4) */}
            <div className="flex min-w-0 flex-col gap-3 lg:col-span-1 lg:min-h-0">
              <section className="hidden shrink-0 rounded-xl bg-white p-4 shadow-sm lg:block">
                <h2 className="mb-3 text-base font-semibold text-azul">Ocupación actual</h2>
                <div className="flex items-center gap-4">
                  <div
                    className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(#333593 ${pctOcupadas * 3.6}deg, #e2e8f0 0deg)`,
                    }}
                  >
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-white">
                      <span className="text-lg font-bold text-slate-800">{pctOcupadas}%</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-azul" /> Ocupadas <b>{ocupadas}</b>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Libres <b>{libres}</b>
                    </p>
                  </div>
                </div>
              </section>

              <section className="flex flex-col rounded-xl bg-white p-4 shadow-sm lg:min-h-0 lg:flex-1">
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <h2 className="text-base font-semibold text-azul">Últimos movimientos</h2>
                  <button
                    onClick={() => setVista("reportes")}
                    className="text-xs font-semibold text-naranja hover:underline"
                  >
                    Ver todos →
                  </button>
                </div>
                {movs.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin movimientos.</p>
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-auto lg:max-h-none lg:min-h-0 lg:flex-1">
                    {movs.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-xs">
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                            m.tipo === "Ingreso"
                              ? "bg-green-100 text-green-700"
                              : "bg-naranja/10 text-naranja"
                          }`}
                        >
                          {m.tipo === "Ingreso" ? "→" : "←"}
                        </span>
                        <span className="w-14 text-slate-500">{m.tipo}</span>
                        <span className="flex-1 font-semibold text-azul">{m.patente}</span>
                        <span className="text-slate-500">{hora(m.fecha)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}