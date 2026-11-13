import { useState } from "react";
import { api, setToken } from "./api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const r = await api.login(username, password);
      setToken(r.token);
      onLogin(r.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Estacionamiento</h1>
        <p className="text-slate-500">Ingresá con tu usuario</p>

        {error && <div className="rounded-lg bg-red-100 p-3 text-red-800">{error}</div>}

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuario"
          autoFocus
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          disabled={cargando}
          className="w-full rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}