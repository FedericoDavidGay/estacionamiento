import { useEffect, useState } from "react";

const MENU = [
  { id: "panel", label: "Inicio", icono: "🏠" },
  { id: "vehiculos", label: "Vehículos", icono: "🚗" },
  { id: "clientes", label: "Clientes mensuales", icono: "👥" },
  { id: "reportes", label: "Reportes", icono: "📊" },
  { id: "config", label: "Configuración", icono: "⚙️" },
];

export default function Layout({ vista, onNavegar, onSalir, usuario, children }) {
  const [colapsado, setColapsado] = useState(
    () => localStorage.getItem("menuColapsado") === "1"
  );
  const [menuMovil, setMenuMovil] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    localStorage.setItem("menuColapsado", colapsado ? "1" : "0");
  }, [colapsado]);

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const fecha = ahora.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  const hora = ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const inicial = usuario?.nombre?.charAt(0).toUpperCase() ?? "?";

  const anchoSidebar = colapsado ? "lg:w-16" : "lg:w-52";
  const margenMain = colapsado ? "lg:ml-16" : "lg:ml-52";
  const inicioHeader = colapsado ? "lg:left-16" : "lg:left-52";

  function ir(id) {
    onNavegar(id);
    setMenuMovil(false);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f2f4fa] text-sm">
      {menuMovil && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuMovil(false)}
        />
      )}

      {/* Menú lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-52 flex-col bg-azul text-white transition-all duration-200 ${
          menuMovil ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${anchoSidebar}`}
      >
        <div className="flex h-14 items-center gap-2 px-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-naranja text-sm font-bold">
            E
          </div>
          <span className={`truncate font-bold ${colapsado ? "lg:hidden" : ""}`}>
            Estacionamiento
          </span>
          <button
            onClick={() => setMenuMovil(false)}
            className="ml-auto rounded-lg p-1 hover:bg-white/10 lg:hidden"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 pt-2">
          {MENU.map((item) => {
            const activo = vista === item.id;
            return (
              <button
                key={item.id}
                onClick={() => ir(item.id)}
                title={item.label}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  activo ? "bg-naranja shadow" : "hover:bg-azul-oscuro"
                }`}
              >
                <span className="text-base">{item.icono}</span>
                <span className={`font-medium ${colapsado ? "lg:hidden" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Barra superior fija */}
      <header
        className={`fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between bg-azul px-3 text-white transition-all duration-200 ${inicioHeader}`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuMovil(true)}
            className="rounded-lg p-1.5 text-lg hover:bg-white/10 lg:hidden"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <button
            onClick={() => setColapsado(!colapsado)}
            className="hidden rounded-lg p-1.5 text-lg hover:bg-white/10 lg:block"
            aria-label="Contraer o expandir menú"
          >
            ☰
          </button>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide md:text-base">ESTACIONAMIENTO</p>
            <p className="hidden text-[10px] text-white/70 sm:block">SISTEMA DE GESTIÓN</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <span className="hidden text-xs xl:block">📅 {fechaCap}</span>
          <span className="text-xs">🕒 {hora}</span>
          <div className="hidden h-6 border-l border-white/30 sm:block" />
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-azul">
              {inicial}
            </div>
            <div className="hidden leading-tight md:block">
              <p className="text-xs font-semibold">{usuario?.nombre ?? "Usuario"}</p>
              <p className="text-[10px] text-white/70">
                {usuario?.rol === "admin" ? "Administrador" : "Operador"}
              </p>
            </div>
          </div>
          <button
            onClick={onSalir}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Contenido: ocupa solo el espacio disponible, sin desbordar */}
      <main className={`flex h-screen min-w-0 flex-1 flex-col pt-14 transition-all duration-200 ${margenMain}`}>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-4">{children}</div>
      </main>
    </div>
  );
}