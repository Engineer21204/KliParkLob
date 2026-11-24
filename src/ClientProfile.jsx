import { useState } from "react";
import { saveProfile } from "./authService";

const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const INPUT = "w-full rounded-2xl border-2 border-gray-200 bg-white/90 px-4 py-3.5 text-[15px] font-medium text-brand-charcoal outline-none transition placeholder:text-gray-400 focus:border-brand-coral focus:ring-4 focus:ring-brand-coral/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500";
const GLASS = "rounded-[28px] border border-white/80 bg-white/70 p-6 shadow-[0_18px_44px_-14px_rgba(20,20,22,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:p-8";

const Label = ({ children }) => <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-500">{children}</span>;

function Stat({ icon, label, value, hint }) {
  return (
    <div className={`${GLASS} !p-5 flex items-center gap-4`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-coralLight text-2xl" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
        <p className="font-display text-2xl font-extrabold leading-tight text-brand-charcoal">{value}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
    </div>
  );
}

/** Perfil del cliente: datos personales, dirección de entrega y resumen de actividad. */
export default function ClientProfile({ uid, me, orders, onSaved, onSeeOrders }) {
  const [form, setForm] = useState({ nombre: me.nombre || "", cel: me.cel || "", direccion: me.direccion || "" });
  const [msg, setMsg] = useState({ text: "", ok: false });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: k === "cel" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value });

  const valid = orders.filter((o) => o.estado !== 4);
  const active = valid.filter((o) => o.estado < 3).length;
  const spent = valid.filter((o) => o.estado === 3).reduce((sum, o) => sum + o.total, 0);
  const initial = (form.nombre || me.email || "?").trim().charAt(0).toUpperCase();

  async function submit(e) {
    e.preventDefault();
    if (form.nombre.trim().length < 2) return setMsg({ text: "Escribe tu nombre.", ok: false });
    if (form.cel && form.cel.length !== 10) return setMsg({ text: "El celular debe tener 10 dígitos.", ok: false });
    setBusy(true);
    try {
      const patch = await saveProfile(uid, form);
      onSaved(patch);
      setMsg({ text: "Perfil guardado.", ok: true });
    } catch {
      setMsg({ text: "No se pudo guardar. Revisa tu conexión y las reglas de Firestore.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="mb-7 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-coral to-orange-500 font-display text-2xl font-extrabold text-white shadow-lg">{initial}</span>
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-charcoal">Mi perfil</h1>
          <p className="text-sm text-gray-500">Tus datos y tu dirección de entrega.</p>
        </div>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon="🧾" label="Pedidos realizados" value={valid.length} hint="Sin contar cancelados" />
        <Stat icon="⏳" label="Pedidos en curso" value={active} hint="Esperando entrega" />
        <Stat icon="✅" label="Total entregado" value={money(spent)} hint="En pedidos completados" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form className={GLASS} onSubmit={submit} noValidate>
          <h2 className="mb-5 font-display text-xl font-extrabold text-brand-charcoal">Mis datos</h2>
          <div className="space-y-4">
            <label className="block"><Label>Nombre completo</Label>
              <input required maxLength={100} value={form.nombre} onChange={set("nombre")} autoComplete="name" className={INPUT} />
            </label>
            <label className="block"><Label>Correo electrónico</Label>
              <input value={me.email || ""} disabled className={INPUT} />
            </label>
            <label className="block"><Label>Celular</Label>
              <input type="tel" inputMode="numeric" value={form.cel} onChange={set("cel")} placeholder="10 dígitos" autoComplete="tel-national" className={INPUT} />
            </label>
            <label className="block"><Label>Dirección de entrega</Label>
              <textarea maxLength={200} rows={3} value={form.direccion} onChange={set("direccion")} placeholder="Calle, número, colonia y referencias." className={`${INPUT} resize-none`} />
              <span className="mt-1 block text-right text-[11px] text-gray-400">{form.direccion.length}/200</span>
            </label>
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-2xl bg-brand-coral px-5 py-4 font-display text-[15px] font-extrabold text-white shadow-[0_12px_28px_-6px_rgba(255,90,54,0.5)] transition hover:bg-brand-coralDark active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:px-8">
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
            <p aria-live="polite" className={`text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
          </div>
        </form>

        <section className={`${GLASS} h-fit`}>
          <h2 className="font-display text-xl font-extrabold text-brand-charcoal">Mi actividad</h2>
          <p className="mb-6 mt-2 text-sm text-gray-500">Revisa el estado de tus pedidos y repite tus favoritos.</p>
          <button type="button" onClick={onSeeOrders} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand-coral px-5 py-3.5 font-display text-[15px] font-extrabold text-brand-coral transition hover:bg-brand-coral hover:text-white active:scale-[0.98]">
            Ver mis pedidos →
          </button>
        </section>
      </div>
    </div>
  );
}