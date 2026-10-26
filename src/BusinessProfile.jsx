import { useState } from "react";
import { deleteField } from "firebase/firestore";
import { updateNegocio, friendlyMarketError } from "./marketService";
import { compressImage } from "./productService";

const CATEGORIAS = ["Comida", "Bebidas", "Postres", "Ropa", "Belleza", "Hogar", "Tecnología", "Papelería", "Otro"];

/** Formulario para editar el perfil público del negocio (lo que ven los clientes). */
export default function BusinessProfile({ uid, negocio }) {
  const [form, setForm] = useState({
    nombre: negocio.nombre || "", categoria: negocio.categoria || "Otro", descripcion: negocio.descripcion || "",
    telefono: negocio.telefono || "", horario: negocio.horario || "", umbral: String(negocio.umbral ?? 5), logo: negocio.logo || "",
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
    if (!form.nombre.trim()) return setMsg("Escribe el nombre de tu negocio.");
    if (form.telefono && form.telefono.replace(/\D/g, "").length !== 10) return setMsg("El teléfono debe tener 10 dígitos.");
    if (!Number.isInteger(umbral) || umbral < 0 || umbral > 999) return setMsg("El aviso de pocas unidades debe ser un número entero entre 0 y 999.");
    setBusy(true);
    try {
      await updateNegocio(uid, {
        nombre: form.nombre.trim(), categoria: form.categoria, descripcion: form.descripcion.trim().slice(0, 300),
        telefono: form.telefono.replace(/\D/g, ""), horario: form.horario.trim(), umbral,
        logo: form.logo || deleteField(),
      });
      setMsg("Perfil guardado. Así lo verán tus clientes.");
    } catch (ex) {
      setMsg(friendlyMarketError(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit} style={{ marginTop: 14 }}>
      <h2>Perfil del negocio</h2>
      <p className="muted">Esta información aparece en la tarjeta y el menú que ven los clientes.</p>
      <label className="field">Nombre del negocio
        <input required maxLength={100} value={form.nombre} onChange={set("nombre")} />
      </label>
      <label className="field">Categoría
        <select value={form.categoria} onChange={set("categoria")}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <label className="field">Descripción (máx. 300 caracteres)
        <textarea maxLength={300} rows={3} value={form.descripcion} onChange={set("descripcion")} placeholder="Cuenta qué hace especial a tu negocio." />
      </label>
      <label className="field">Teléfono de contacto
        <input type="tel" inputMode="numeric" value={form.telefono} onChange={set("telefono")} placeholder="10 dígitos" />
      </label>
      <label className="field">Horario
        <input maxLength={80} value={form.horario} onChange={set("horario")} placeholder="Lun a sáb · 9:00 a 20:00" />
      </label>
      <label className="field">Avisar cuando queden esta cantidad de unidades o menos
        <input type="number" min="0" max="999" step="1" value={form.umbral} onChange={set("umbral")} />
      </label>
      <label className="field">Logo (opcional)
        <input key={fileKey} type="file" accept="image/*" onChange={pickLogo} />
      </label>
      {form.logo && (
        <div className="prod-preview">
          <img src={form.logo} alt="Vista previa del logo" />
          <button type="button" className="link-btn" onClick={() => { setForm({ ...form, logo: "" }); setFileKey((k) => k + 1); }}>Quitar logo</button>
        </div>
      )}
      <button type="submit" className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar perfil"}</button>
      <p className="muted" aria-live="polite" style={{ marginTop: 12 }}>{msg}</p>
    </form>
  );
}