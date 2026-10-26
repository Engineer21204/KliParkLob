import { useState } from "react";
import { saveProfile } from "./authService";

const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

/** Perfil del cliente: datos personales, dirección de entrega y resumen de actividad. */
export default function ClientProfile({ uid, me, orders, onSaved, onSeeOrders }) {
  const [form, setForm] = useState({ nombre: me.nombre || "", cel: me.cel || "", direccion: me.direccion || "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: k === "cel" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value });

  const valid = orders.filter((o) => o.estado !== 4);
  const active = valid.filter((o) => o.estado < 3).length;
  const spent = valid.filter((o) => o.estado === 3).reduce((sum, o) => sum + o.total, 0);

  async function submit(e) {
    e.preventDefault();
    if (form.nombre.trim().length < 2) return setMsg("Escribe tu nombre.");
    if (form.cel && form.cel.length !== 10) return setMsg("El celular debe tener 10 dígitos.");
    setBusy(true);
    try {
      const patch = await saveProfile(uid, form);
      onSaved(patch);
      setMsg("Perfil guardado.");
    } catch {
      setMsg("No se pudo guardar. Revisa tu conexión y las reglas de Firestore.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="stats">
        <div className="stat"><span className="muted">Pedidos realizados</span><strong>{valid.length}</strong><small>Sin contar cancelados</small></div>
        <div className="stat"><span className="muted">Pedidos en curso</span><strong>{active}</strong><small>Esperando entrega</small></div>
        <div className="stat"><span className="muted">Total entregado</span><strong>{money(spent)}</strong><small>En pedidos completados</small></div>
      </div>
      <div className="orders">
        <form className="panel" onSubmit={submit}>
          <h2>Mis datos</h2>
          <label className="field">Nombre completo
            <input required maxLength={100} value={form.nombre} onChange={set("nombre")} autoComplete="name" />
          </label>
          <label className="field">Correo electrónico
            <input value={me.email || ""} disabled />
          </label>
          <label className="field">Celular
            <input type="tel" inputMode="numeric" value={form.cel} onChange={set("cel")} placeholder="10 dígitos" autoComplete="tel-national" />
          </label>
          <label className="field">Dirección de entrega
            <textarea maxLength={200} rows={3} value={form.direccion} onChange={set("direccion")} placeholder="Calle, número, colonia y referencias." />
          </label>
          <button type="submit" className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
          <p className="muted" aria-live="polite" style={{ marginTop: 12 }}>{msg}</p>
        </form>
        <section className="panel">
          <h2>Mi actividad</h2>
          <p className="muted" style={{ margin: "12px 0 20px" }}>Revisa el estado de tus pedidos y repite tus favoritos.</p>
          <button type="button" className="primary" onClick={onSeeOrders}>Ver mis pedidos</button>
        </section>
      </div>
    </>
  );
}