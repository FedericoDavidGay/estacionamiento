import { useEffect, useState } from "react";
import { api } from "./api";

const pesos = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const fecha = (iso) =>
  iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "-";

const FILTROS_VACIOS = { patente: "", desde: "", hasta: "", forma_pago: "", tipo: "" };

export default function Reportes({ onVolver, onAviso }) {
  const [tab, setTab] = useState("meses");
  const [meses, setMeses] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    api
      .meses()
      .then(setMeses)
      .catch((e) => onAviso("error", e.message));
  }, []);

  async function verMes(mesTexto) {
    const [anio, mes] = mesTexto.split("-").map(Number);
    try {
      setDetalle(await api.detalleMes(anio, mes));
    } catch (e) {
      onAviso("error", e.message);
    }
  }

  async function buscar(e) {
    e.preventDefault();
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    try {
      setResultado(await api.buscarReportes(params));
    } catch (err) {
      onAviso("error", err.message);
    }
  }

  const input = "rounded-lg border border-slate-300 px-3 py-2";
  const boton = (activo) =>
    `rounded-lg px-4 py-2 ${
      activo ? "bg-slate-800 text-white" : "bg-white text-slate-700 shadow-sm hover:bg-slate-50"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Reportes</h2>
        <button onClick={onVolver} className="text-slate-500 hover:text-slate-800">
          ← Volver al panel
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("meses")} className={boton(tab === "meses")}>
          Meses
        </button>
        <button onClick={() => setTab("buscar")} className={boton(tab === "buscar")}>
          Búsqueda avanzada
        </button>
      </div>

      {tab === "meses" && (
        <>
          <section className="rounded-xl bg-white p-5 shadow-sm">
            {meses.length === 0 ? (
              <p className="text-slate-500">Todavía no hay salidas cobradas.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-slate-500">
                  <tr>
                    <th className="py-2">Mes</th>
                    <th>Autos</th>
                    <th>Ingresos</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m) => (
                    <tr key={m.mes} className="border-b last:border-0">
                      <td className="py-2 font-semibold">{m.mes}</td>
                      <td>{m.autos}</td>
                      <td>{pesos(m.ingresos)}</td>
                      <td className="text-right">
                        <button
                          onClick={() => verMes(m.mes)}
                          className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {detalle && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">
                Detalle {String(detalle.mes).padStart(2, "0")}/{detalle.anio}
              </h3>
              <div className="my-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-500">Autos cobrados</p>
                  <p className="text-xl font-semibold">{detalle.autos}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-500">Ingresos</p>
                  <p className="text-xl font-semibold">{pesos(detalle.ingresos_total)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-500">Por forma de pago</p>
                  {Object.entries(detalle.por_forma_pago).map(([k, v]) => (
                    <p key={k} className="text-sm">
                      {k}: {pesos(v)}
                    </p>
                  ))}
                </div>
              </div>
              <TablaEstadias estadias={detalle.estadias} />
            </section>
          )}
        </>
      )}

      {tab === "buscar" && (
        <>
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <form onSubmit={buscar} className="grid gap-4 md:grid-cols-5">
              <input
                placeholder="Patente"
                value={filtros.patente}
                onChange={(e) => setFiltros({ ...filtros, patente: e.target.value })}
                className={`${input} uppercase`}
              />
              <input
                type="date"
                value={filtros.desde}
                onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
                className={input}
              />
              <input
                type="date"
                value={filtros.hasta}
                onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
                className={input}
              />
              <select
                value={filtros.forma_pago}
                onChange={(e) => setFiltros({ ...filtros, forma_pago: e.target.value })}
                className={input}
              >
                <option value="">Toda forma de pago</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="qr">QR</option>
              </select>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                className={input}
              >
                <option value="">Todo tipo</option>
                <option value="comun">Común</option>
                <option value="mensual">Mensual</option>
              </select>
              <div className="flex gap-2 md:col-span-5">
                <button className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700">
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFiltros(FILTROS_VACIOS);
                    setResultado(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </section>

          {resultado && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <p className="mb-4 text-slate-700">
                {resultado.cantidad} resultado(s) · Total: <b>{pesos(resultado.total)}</b>
              </p>
              <TablaEstadias estadias={resultado.estadias} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TablaEstadias({ estadias }) {
  if (estadias.length === 0) return <p className="text-slate-500">Sin movimientos.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b text-slate-500">
        <tr>
          <th className="py-2">Patente</th>
          <th>Tipo</th>
          <th>Entrada</th>
          <th>Salida</th>
          <th>Minutos</th>
          <th>Pago</th>
          <th>Monto</th>
        </tr>
      </thead>
      <tbody>
        {estadias.map((e) => (
          <tr key={e.id} className="border-b last:border-0">
            <td className="py-2 font-semibold">{e.patente}</td>
            <td>{e.tipo === "mensual" ? "Mensual" : "Común"}</td>
            <td>{fecha(e.fecha_entrada)}</td>
            <td>{fecha(e.fecha_salida)}</td>
            <td>{e.minutos ?? "-"}</td>
            <td>{e.forma_pago ?? "-"}</td>
            <td>{pesos(e.monto)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}