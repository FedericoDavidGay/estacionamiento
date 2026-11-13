import { useState } from "react";
import { api } from "./api";

const pesos = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const fecha = (iso) =>
  iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "-";

export default function Vehiculos({ onVolver, onAviso }) {
  const [patente, setPatente] = useState("");
  const [ficha, setFicha] = useState(null);

  async function buscar(e) {
    e?.preventDefault();
    if (!patente.trim()) return;
    try {
      setFicha(await api.vehiculo(patente));
    } catch (err) {
      setFicha(null);
      onAviso("error", err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Buscar vehículo</h2>
        <button onClick={onVolver} className="text-slate-500 hover:text-slate-800">
          ← Volver al panel
        </button>
      </div>

      <form onSubmit={buscar} className="flex gap-2">
        <input
          value={patente}
          onChange={(e) => setPatente(e.target.value)}
          placeholder="Patente, ej: AB123CD"
          className="w-72 rounded-lg border border-slate-300 px-3 py-2 uppercase"
        />
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700">
          Buscar
        </button>
      </form>

      {ficha && (
        <>
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-slate-800">{ficha.patente}</p>
              <span
                className={`rounded-full px-3 py-1 text-sm ${
                  ficha.adentro ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {ficha.adentro ? "Adentro" : "Afuera"}
              </span>
            </div>

            {ficha.cliente ? (
              <p className="mt-2 text-sm text-slate-600">
                Cliente mensual: <b>{ficha.cliente.nombre}</b>
                {ficha.cliente.cochera_id && ` · Cochera ${ficha.cliente.cochera_id}`}
                {!ficha.cliente.activo && " · (inactivo)"}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No es cliente mensual.</p>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-500">Visitas</p>
                <p className="text-xl font-semibold">{ficha.visitas}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-500">Total cobrado</p>
                <p className="text-xl font-semibold">{pesos(ficha.total_cobrado)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-500">Promedio de permanencia</p>
                <p className="text-xl font-semibold">
                  {ficha.promedio_minutos != null ? `${ficha.promedio_minutos} min` : "-"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-500">Última visita</p>
                <p className="text-sm font-semibold">{fecha(ficha.ultima_visita)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-slate-800">Historial</h3>
            {ficha.historial.length === 0 ? (
              <p className="text-slate-500">Sin movimientos.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-slate-500">
                  <tr>
                    <th className="py-2">Entrada</th>
                    <th>Salida</th>
                    <th>Tipo</th>
                    <th>Minutos</th>
                    <th>Pago</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.historial.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2">{fecha(e.fecha_entrada)}</td>
                      <td>{fecha(e.fecha_salida)}</td>
                      <td>{e.tipo === "mensual" ? "Mensual" : "Común"}</td>
                      <td>{e.minutos ?? "-"}</td>
                      <td>{e.forma_pago ?? "-"}</td>
                      <td>{e.estado === "cerrada" ? pesos(e.monto) : "En curso"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}