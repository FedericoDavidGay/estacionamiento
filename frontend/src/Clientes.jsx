import { useEffect, useState } from "react";
import { api } from "./api";

const VACIO = {
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  patente: "",
  vehiculo_tipo: "",
  vehiculo_modelo: "",
  cochera_id: "",
  vencimiento: "",
  precio_mensual: "",
  observaciones: "",
  activo: true,
};

export default function Clientes({ onVolver, onAviso }) {
  const [lista, setLista] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cupo, setCupo] = useState(null); // { max }
  const [editando, setEditando] = useState(null); // null | "nuevo" | id
  const [form, setForm] = useState(VACIO);

  async function cargar(q = busqueda) {
    try {
      const [c, g] = await Promise.all([api.clientes(q), api.configGenerales()]);
      setLista(c);
      setCupo({ max: g.max_cocheras_mensuales });
    } catch (e) {
      onAviso("error", e.message);
    }
  }

  useEffect(() => {
    cargar("");
  }, []);

  const activos = lista.filter((c) => c.activo).length;

  function nuevo() {
    setForm(VACIO);
    setEditando("nuevo");
  }

  function editar(c) {
    setForm({
      ...VACIO,
      ...c,
      telefono: c.telefono ?? "",
      email: c.email ?? "",
      vehiculo_tipo: c.vehiculo_tipo ?? "",
      vehiculo_modelo: c.vehiculo_modelo ?? "",
      observaciones: c.observaciones ?? "",
      cochera_id: c.cochera_id ?? "",
      vencimiento: c.vencimiento ? c.vencimiento.slice(0, 10) : "",
    });
    setEditando(c.id);
  }

  function armarDatos() {
    return {
      nombre: form.nombre,
      apellido: form.apellido,
      dni: form.dni,
      telefono: form.telefono || null,
      email: form.email || null,
      patente: form.patente,
      vehiculo_tipo: form.vehiculo_tipo || null,
      vehiculo_modelo: form.vehiculo_modelo || null,
      cochera_id: form.cochera_id === "" ? null : Number(form.cochera_id),
      vencimiento: form.vencimiento ? `${form.vencimiento}T23:59:59` : null,
      precio_mensual: Number(form.precio_mensual),
      observaciones: form.observaciones || null,
      activo: form.activo,
    };
  }

  async function guardar(e) {
    e.preventDefault();
    try {
      if (editando === "nuevo") {
        await api.crearCliente(armarDatos());
        onAviso("ok", "Cliente agregado");
      } else {
        await api.editarCliente(editando, armarDatos());
        onAviso("ok", "Cliente actualizado");
      }
      setEditando(null);
      cargar();
    } catch (err) {
      onAviso("error", err.message);
    }
  }

  async function eliminar(c) {
    if (!window.confirm(`¿Dar de baja a ${c.nombre} ${c.apellido}?`)) return;
    try {
      await api.eliminarCliente(c.id);
      onAviso("ok", "Cliente dado de baja");
      cargar();
    } catch (err) {
      onAviso("error", err.message);
    }
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2";
  const campo = (label, name, props = {}) => (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      {label}
      <input
        className={input}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        {...props}
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Clientes mensuales</h2>
        <button onClick={onVolver} className="text-slate-500 hover:text-slate-800">
          ← Volver al panel
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && cargar(busqueda)}
            placeholder="Buscar por nombre, DNI o patente"
            className="w-72 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            onClick={() => cargar(busqueda)}
            className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
          >
            Buscar
          </button>
        </div>
        <div className="flex items-center gap-3">
          {cupo && (
            <span className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              Cupo: {activos} / {cupo.max} activos
            </span>
          )}
          <button
            onClick={nuevo}
            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-500"
          >
            + Nuevo cliente
          </button>
        </div>
      </div>

      {editando !== null && (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">
            {editando === "nuevo" ? "Nuevo cliente" : "Editar cliente"}
          </h3>
          <form onSubmit={guardar} className="grid gap-4 md:grid-cols-3">
            {campo("Nombre *", "nombre", { required: true })}
            {campo("Apellido *", "apellido", { required: true })}
            {campo("DNI *", "dni", { required: true })}
            {campo("Teléfono", "telefono")}
            {campo("Email", "email", { type: "email" })}
            {campo("Patente *", "patente", { required: true, className: `${input} uppercase` })}
            {campo("Tipo de vehículo", "vehiculo_tipo")}
            {campo("Modelo", "vehiculo_modelo")}
            {campo("Cochera (número de id)", "cochera_id", { type: "number" })}
            {campo("Vencimiento", "vencimiento", { type: "date" })}
            {campo("Precio mensual *", "precio_mensual", { type: "number", required: true })}
            {campo("Observaciones", "observaciones")}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              />
              Activo
            </label>
            <div className="flex gap-2 md:col-span-3">
              <button className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700">
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl bg-white p-5 shadow-sm">
        {lista.length === 0 ? (
          <p className="text-slate-500">No hay clientes para mostrar.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2">Apellido y nombre</th>
                <th>DNI</th>
                <th>Patente</th>
                <th>Cochera</th>
                <th>Precio</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2">{c.apellido}, {c.nombre}</td>
                  <td>{c.dni}</td>
                  <td className="font-semibold">{c.patente}</td>
                  <td>{c.cochera_id ?? "-"}</td>
                  <td>${Number(c.precio_mensual).toLocaleString("es-AR")}</td>
                  <td>{c.activo ? "Activo" : "Inactivo"}</td>
                  <td className="space-x-2 text-right">
                    <button
                      onClick={() => editar(c)}
                      className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(c)}
                      className="rounded-md border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50"
                    >
                      Baja
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}