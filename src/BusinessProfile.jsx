import { useState } from "react";
import { deleteField } from "firebase/firestore";
import { updateNegocio, friendlyMarketError } from "./marketService";
import { compressImage } from "./productService";

const CATEGORIAS = [
  "Comida", "Bebidas", "Postres"
];

const DIAS = [
  { id: "lunes", nombre: "Lun" },
  { id: "martes", nombre: "Mar" },
  { id: "miercoles", nombre: "Mié" },
  { id: "jueves", nombre: "Jue" },
  { id: "viernes", nombre: "Vie" },
  { id: "sabado", nombre: "Sáb" },
  { id: "domingo", nombre: "Dom" }
];

function horarioInicial(horario) {
  return Object.fromEntries(
    DIAS.map(({ id }) => {
      const dia = horario && typeof horario === "object"
        ? horario[id]
        : null;

      return [
        id,
        {
          activo: dia?.activo === true,
          apertura: dia?.apertura || "",
          cierre: dia?.cierre || ""
        }
      ];
    })
  );
}

export default function BusinessProfile({ uid, negocio }) {
  const [form, setForm] = useState({
    nombre: negocio.nombre || "",
    categoria: negocio.categoria || "Otro",
    descripcion: negocio.descripcion || "",
    telefono: negocio.telefono || "",
    horario: horarioInicial(negocio.horario),
    umbral: String(negocio.umbral ?? 5),
    logo: negocio.logo || ""
  });

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const set = (k) => (e) =>
    setForm((previous) => ({
      ...previous,
      [k]: e.target.value
    }));


  function toggleDia(id) {
    setForm((previous) => ({
      ...previous,
      horario: {
        ...previous.horario,
        [id]: {
          ...previous.horario[id],
          activo: !previous.horario[id].activo
        }
      }
    }));
  }


  function cambiarHora(id, campo, valor) {
    setForm((previous) => ({
      ...previous,
      horario: {
        ...previous.horario,
        [id]: {
          ...previous.horario[id],
          [campo]: valor
        }
      }
    }));
  }

  async function pickLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setForm((f) => ({ ...f, logo: "" }));

      const logo = await compressImage(file, 256);

      setForm((f) => ({ ...f, logo }));
      setMsg("");
    } catch (ex) {
      setMsg(ex.message);
      setFileKey((k) => k + 1);
    }
  }

  async function submit(e) {
    e.preventDefault();

    const umbral = Number(form.umbral);

    if (!form.nombre.trim()) {
      return setMsg("Escribe el nombre de tu negocio.");
    }

    if (
      form.telefono &&
      form.telefono.replace(/\D/g, "").length !== 10
    ) {
      return setMsg("El teléfono debe tener 10 dígitos.");
    }

    if (
      !Number.isInteger(umbral) ||
      umbral < 0 ||
      umbral > 999
    ) {
      return setMsg(
        "El aviso de pocas unidades debe ser un número entero entre 0 y 999."
      );
    }

    for (const dia of DIAS) {
      const horarioDia = form.horario[dia.id];

      if (!horarioDia.activo) continue;

      if (!horarioDia.apertura || !horarioDia.cierre) {
        return setMsg(
          `Completa la hora de apertura y cierre de ${dia.nombre}.`
        );
      }

      if (horarioDia.apertura === horarioDia.cierre) {
        return setMsg(
          `La apertura y el cierre de ${dia.nombre} no pueden ser iguales.`
        );
      }
    }

    setBusy(true);
    setMsg("");

    try {
      await updateNegocio(uid, {
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        descripcion: form.descripcion.trim().slice(0, 300),
        telefono: form.telefono.replace(/\D/g, ""),
        horario: form.horario,
        umbral,
        logo: form.logo || deleteField()
      });

      setMsg("Perfil y horarios guardados correctamente.");
    } catch (ex) {
      setMsg(friendlyMarketError(ex));
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-brand-charcoal outline-none transition placeholder:text-gray-400 focus:border-brand-coral focus:ring-4 focus:ring-brand-coral/10";
  const label = "block text-xs font-extrabold uppercase tracking-wider text-gray-500";

  return (
    <form onSubmit={submit} className="mv-root space-y-6">
      {/* Datos del negocio */}
      <section className="rounded-[26px] border border-white/80 bg-white/85 p-6 shadow-[0_4px_20px_-2px_rgba(20,20,22,0.08)] backdrop-blur sm:p-8">
        <h2 className="font-display text-2xl font-extrabold text-brand-charcoal">Perfil del negocio</h2>
        <p className="mt-1 text-sm text-gray-500">Esta información aparece en la tarjeta y el menú que ven los clientes.</p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className={label}>Nombre del negocio
            <input required maxLength={100} value={form.nombre} onChange={set("nombre")} className={`${input} mt-2 normal-case tracking-normal`} />
          </label>
          <label className={label}>Categoría
            <select value={form.categoria} onChange={set("categoria")} className={`${input} mt-2 normal-case tracking-normal`}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className={`${label} md:col-span-2`}>Descripción (máx. 300 caracteres)
            <textarea maxLength={300} rows={3} value={form.descripcion} onChange={set("descripcion")} placeholder="Cuenta qué hace especial a tu negocio." className={`${input} mt-2 resize-none normal-case tracking-normal`} />
            <span className="mt-1 block text-right text-[11px] font-semibold normal-case tracking-normal text-gray-400">{form.descripcion.length}/300</span>
          </label>
          <label className={label}>Teléfono de contacto
            <input type="tel" inputMode="numeric" value={form.telefono} onChange={set("telefono")} placeholder="10 dígitos" className={`${input} mt-2 normal-case tracking-normal`} />
          </label>
          <label className={label}>Avisar con esta cantidad de unidades o menos
            <input type="number" min="0" max="999" step="1" value={form.umbral} onChange={set("umbral")} className={`${input} mt-2 normal-case tracking-normal`} />
          </label>
        </div>

        {/* Logo */}
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-xs font-bold text-gray-400">
            {form.logo ? <img src={form.logo} alt="Vista previa del logo" className="h-full w-full object-cover" /> : "Logo"}
          </div>
          <div>
            <span className={label}>Logo (opcional)</span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-2xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-charcoal transition hover:border-brand-coral/50">
                Elegir imagen
                <input key={fileKey} type="file" accept="image/*" onChange={pickLogo} className="hidden" />
              </label>
              {form.logo && (
                <button type="button" onClick={() => { setForm((f) => ({ ...f, logo: "" })); setFileKey((k) => k + 1); }} className="text-sm font-semibold text-red-600 underline underline-offset-2">Quitar logo</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Horario */}
      <section className="rounded-[26px] border border-white/80 bg-white/85 p-6 shadow-[0_4px_20px_-2px_rgba(20,20,22,0.08)] backdrop-blur sm:p-8">
        <h2 className="font-display text-2xl font-extrabold text-brand-charcoal">Horario de atención</h2>
        <p className="mt-1 text-sm text-gray-500">Activa los días en que ofreces servicio y define sus horarios.</p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DIAS.map(({ id, nombre }) => {
            const dia = form.horario[id];
            return (
              <div key={id} className={`rounded-2xl border-2 p-4 transition ${dia.activo ? "border-brand-coral/40 bg-brand-coralLight/50" : "border-gray-200 bg-gray-50/70"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display font-extrabold text-brand-charcoal">{nombre}</p>
                    <p className={`text-xs font-bold ${dia.activo ? "text-brand-coral" : "text-gray-400"}`}>{dia.activo ? "Con servicio" : "Descanso"}</p>
                  </div>
                  <button type="button" role="switch" aria-checked={dia.activo} aria-label={`Servicio el ${nombre}`} onClick={() => toggleDia(id)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${dia.activo ? "bg-brand-coral" : "bg-gray-300"}`}>
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${dia.activo ? "left-6" : "left-1"}`} />
                  </button>
                </div>
                {dia.activo && (
                  <div className="mt-3 flex items-center gap-2">
                    <input type="time" required value={dia.apertura} onChange={(e) => cambiarHora(id, "apertura", e.target.value)} aria-label={`Apertura ${nombre}`} className={`${input} !px-3 !py-2`} />
                    <span className="text-xs font-bold text-gray-400">a</span>
                    <input type="time" required value={dia.cierre} onChange={(e) => cambiarHora(id, "cierre", e.target.value)} aria-label={`Cierre ${nombre}`} className={`${input} !px-3 !py-2`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-gray-500">Los horarios determinan automáticamente si tu negocio está abierto, por abrir o por cerrar.</p>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className="rounded-2xl bg-brand-coral px-8 py-4 font-display text-base font-extrabold text-white shadow-[0_12px_28px_-6px_rgba(255,90,54,0.45)] transition hover:bg-brand-coralDark active:scale-95 disabled:opacity-60">
          {busy ? "Guardando…" : "Guardar perfil"}
        </button>
        <p aria-live="polite" className={`text-sm font-semibold ${msg.startsWith("Perfil") ? "text-emerald-700" : "text-red-600"}`}>{msg}</p>
      </div>
    </form>
  );
}