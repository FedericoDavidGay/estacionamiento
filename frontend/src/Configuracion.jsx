import { useEffect, useState } from "react";
import { api } from "./api";

export default function Configuracion({ onVolver, onAviso }) {
  const [generales, setGenerales] = useState(null);
  const [tarifas, setTarifas] = useState([]);
  const [nueva, setNueva] = useState({ nombre: "", duracion_minutos: "", precio: "" });

  async function cargar() {
    try {
      const [g, t] = await Promise.all([api.configGenerales(), api.tarifas()]);
      setGenerales(g);
      setTarifas(t);
    } catch (e) {
      onAviso("error", e.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardarGenerales(e) {
    e.preventDefault();
    try {
      const g = await api.guardarGenerales({
        total_cocheras: Number(generales.total_cocheras),
        max_cocheras_mensuales: Number(generales.max_cocheras_mensuales),
        tolerancia_minutos: Number(generales.tolerancia_minutos),
      });
      setGenerales(g);
      onAviso("ok", "Configuración general guardada");
    } catch (err) {
      onAviso("error", err.message);
    }
  }

  async function guardarTarifa(t) {
    try {
      await api.editarTarifa(t.id, {
        nombre: t.nombre,
        duracion_minutos: Number(t.duracion_minutos),
        precio: Number(t.precio),
        activo: t.activo,
      });
      onAviso("ok", `Tarifa "${t.nombre}" actualizada`);
      cargar();
    } catch (err) {
      onAviso("error", err.message);
    }
  }

  async function eliminarTarifa(t) {
    if (!window.confirm(`¿Eliminar la tarifa "${t.nombre}"?`)) return;
    try {
      await api.eliminarTarifa(t.id);
      onAviso("ok", `Tarifa "${t.nombre}" eliminada`);
      cargar();
    } catch (err) {
      onAviso("error", err.message);
    }
  }

  async function crearTarifa(e) {
    e.preventDefault();
    try {
      await api.crearTarifa({
        nombre: nueva.nombre,
        duracion_minutos: Number(nueva.duracion_minutos),
        precio: Number(nueva.precio),
        activo: true,
      });
      setNueva({ nombre: "", duracion_minutos: "", precio: "" });
      onAviso("ok", "Tarifa creada");
      cargar();
    } catch (err) {
      onAviso("error", err.message);
    }
  }

  function cambiarTarifa(id, campo, valor) {
    setTarifas((prev) => prev.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)));
  }

  if (!generales) return <p className="text-slate-500">Cargando configuración...</p>;

  const input = "min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
        <button onClick={onVolver} className="text-slate-500 hover:text-slate-800">
          ← Volver al panel
        </button>
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">General</h3>
        <form onSubmit={guardarGenerales} className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Cocheras totales
            <input
              type="number"
              min="1"
              value={generales.total_cocheras}
              onChange={(e) => setGenerales({ ...generales, total_cocheras: e.target.value })}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Cupo de cocheras mensuales
            <input
              type="number"
              min="0"
              value={generales.max_cocheras_mensuales}
              onChange={(e) => setGenerales({ ...generales, max_cocheras_mensuales: e.target.value })}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Tolerancia (minutos gratis)
            <input
              type="number"
              min="0"
              value={generales.tolerancia_minutos}
              onChange={(e) => setGenerales({ ...generales, tolerancia_minutos: e.target.value })}
              className={input}
            />
          </label>
          <div className="md:col-span-3">
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700">
              Guardar general
            </button>
          </div>
        </form>
      </section>

      <section className="min-w-0 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Tarifas</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b text-slate-500">
            <tr>
              <th className="py-2">Nombre</th>
              <th>Minutos</th>
              <th>Precio</th>
              <th>Activa</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="py-2">
                  <input
                    value={t.nombre}
                    onChange={(e) => cambiarTarifa(t.id, "nombre", e.target.value)}
                    className={input}
                  />
                </td>
                <td>
                                    <input
                    type="number"
                    value={t.duracion_minutos}
                    onChange={(e) => cambiarTarifa(t.id, "duracion_minutos", e.target.value)}
                    className="w-28 min-w-0 rounded-lg border border-slate-300 px-3 py-2"
                  />
                </td>
                <td>
                                    <input
                    type="number"
                    value={t.duracion_minutos}
                    onChange={(e) => cambiarTarifa(t.id, "duracion_minutos", e.target.value)}
                    className="w-32 min-w-0 rounded-lg border border-slate-300 px-3 py-2"
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={t.activo}
                    onChange={(e) => cambiarTarifa(t.id, "activo", e.target.checked)}
                  />
                </td>
                <td className="text-right">
                  <button
                    onClick={() => guardarTarifa(t)}
                    className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => eliminarTarifa(t)}
                    className="ml-2 rounded-md border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <form onSubmit={crearTarifa} className="mt-6 flex flex-wrap items-end gap-3 border-t pt-4">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Nombre
            <input
              value={nueva.nombre}
              onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
              className={input}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Minutos
            <input
              type="number"
              min="1"
              value={nueva.duracion_minutos}
              onChange={(e) => setNueva({ ...nueva, duracion_minutos: e.target.value })}
              className={`${input} w-28`}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Precio
            <input
              type="number"
              min="0"
              value={nueva.precio}
              onChange={(e) => setNueva({ ...nueva, precio: e.target.value })}
              className={`${input} w-32`}
              required
            />
          </label>
          <button className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-500">
            Agregar tarifa
          </button>
        </form>
      </section>
    </div>
  );
}