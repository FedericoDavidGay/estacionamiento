const BASE = "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => null);

  if (res.status === 401 && !path.startsWith("/auth/")) {
    setToken(null);
    window.dispatchEvent(new Event("auth:logout"));
  }
  if (!res.ok) {
    throw new Error(data?.detail || `Error ${res.status}`);
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  resumen: () => request("/reportes/resumen"),
  activas: () => request("/estadias/activas"),
  ingreso: (patente) =>
    request("/estadias/ingreso", {
      method: "POST",
      body: JSON.stringify({ patente }),
    }),
  buscar: (patente) =>
    request(`/estadias/buscar/${encodeURIComponent(patente)}`),
  cobrar: (patente, forma_pago) =>
    request(`/estadias/buscar/${encodeURIComponent(patente)}/cobrar`, {
      method: "POST",
      body: JSON.stringify({ forma_pago }),
    }),

    configGenerales: () => request("/configuracion/generales"),
  guardarGenerales: (datos) =>
    request("/configuracion/generales", {
      method: "PUT",
      body: JSON.stringify(datos),
    }),
  tarifas: () => request("/configuracion/tarifas"),
  crearTarifa: (datos) =>
    request("/configuracion/tarifas", {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  editarTarifa: (id, datos) =>
    request(`/configuracion/tarifas/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),
  
  clientes: (q = "") =>
    request(`/clientes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  crearCliente: (datos) =>
    request("/clientes", { method: "POST", body: JSON.stringify(datos) }),
  editarCliente: (id, datos) =>
    request(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(datos) }),
  eliminarCliente: (id) => request(`/clientes/${id}`, { method: "DELETE" }),

  meses: () => request("/reportes/meses"),
  detalleMes: (anio, mes) => request(`/reportes/mes/${anio}/${mes}`),
  buscarReportes: (params) =>
    request(`/reportes/buscar?${new URLSearchParams(params).toString()}`),

  vehiculo: (patente) => request(`/vehiculos/${encodeURIComponent(patente)}`),
  eliminarTarifa: (id) => request(`/configuracion/tarifas/${id}`, { method: "DELETE" }),
};