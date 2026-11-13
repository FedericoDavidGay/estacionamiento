import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import Login from "./Login.jsx";
import { getToken, setToken } from "./api";

function Gate() {
  const [logueado, setLogueado] = useState(!!getToken());

  useEffect(() => {
    const salir = () => setLogueado(false);
    window.addEventListener("auth:logout", salir);
    return () => window.removeEventListener("auth:logout", salir);
  }, []);

  if (!logueado) {
    return <Login onLogin={() => setLogueado(true)} />;
  }

  return (
    <>
      <button
        onClick={() => {
          setToken(null);
          setLogueado(false);
        }}
        className="fixed bottom-4 right-4 z-50 rounded-lg bg-white px-3 py-1 text-sm text-slate-600 shadow hover:bg-slate-50"
      >
        Salir
      </button>
      <App />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Gate />
  </StrictMode>
);