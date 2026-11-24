import { useState } from "react";
import ProductOptionsEditor, { cleanOptions } from "./ProductOptionEditor";
import { createProduct, updateProduct, removeProduct, compressImage, friendlyProductError } from "./productService";

const CATEGORIAS = ["Comida", "Bebidas", "Postres"];
const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const LOW_STOCK = 5; 
const EMPTY = { name: "", price: "", description: "", categoria: "", imagen: "", stock: "", prepMin: "" };
const stockLabel = (p, limit = LOW_STOCK) => typeof p.stock !== "number" ? "Sin control de existencias" : p.stock === 0 ? "Agotado" : p.stock <= limit ? `⚠ Pocas unidades: ${p.stock}` : `Existencias: ${p.stock}`;

export default function BusinessProducts({ negocioId, items, onChange, loadError, lowStock = LOW_STOCK }) {
  const [form, setForm] = useState(EMPTY);
  const [opciones, setOpciones] = useState([]);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(loadError || "");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null); 
  const [fileKey, setFileKey] = useState(0); 
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function pickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imagen = await compressImage(file);
      setForm((f) => ({ ...f, imagen }));
      setMsg("");
    } catch (ex) {
      setMsg(ex.message);
      setFileKey((k) => k + 1);
    }
  }

  function reset() {
    setForm(EMPTY);
    setOpciones([]);
    setEditing(null);
    setFileKey((k) => k + 1);
  }

  async function submit(e) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price <= 0) return setMsg("Escribe un nombre y un precio mayor que cero.");
    if (form.description.length > 500) return setMsg("La descripción puede tener hasta 500 caracteres.");
    const stock = Number(form.stock);
    if (form.stock === "" || !Number.isInteger(stock) || stock < 0) return setMsg("Las existencias deben ser un número entero, 0 o mayor.");
    setBusy(true);
    try {
      if (editing) {
        const patch = { name: form.name.trim(), price, description: form.description.trim(), categoria: form.categoria, imagen: form.imagen, stock, opciones: cleanOptions(opciones), prepMin: Number(form.prepMin) > 0 ? Math.round(Number(form.prepMin)) : null };
        await updateProduct(editing, patch);
        onChange(items.map((p) => (p.id === editing ? { ...p, ...patch } : p)));
        setMsg("Producto actualizado.");
      } else {
        const created = await createProduct(negocioId, { ...form, opciones: cleanOptions(opciones) });
        onChange([...items, created]);
        setMsg("Producto agregado al catálogo.");
      }
      reset();
    } catch (ex) {
      setMsg(friendlyProductError(ex));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p) {
    setEditing(p.id);
    setForm({ name: p.name, price: String(p.price), description: p.description || "", categoria: p.categoria || "", imagen: p.imagen || "", stock: String(p.stock ?? ""), prepMin: String(p.prepMin ?? "") });
    setOpciones(p.opciones || []);
    setFileKey((k) => k + 1);
    setMsg("");
  }

  async function changeStock(p, delta) {
    const stock = Math.max(0, (p.stock || 0) + delta);
    try {
      await updateProduct(p.id, { stock });
      onChange(items.map((x) => (x.id === p.id ? { ...x, stock } : x)));
    } catch (ex) {
      setMsg(friendlyProductError(ex));
    }
  }

  async function toggle(p) {
    try {
      await updateProduct(p.id, { available: !p.available });
      onChange(items.map((x) => (x.id === p.id ? { ...x, available: !p.available } : x)));
    } catch (ex) {
      setMsg(friendlyProductError(ex));
    }
  }

  async function confirmRemove() {
    const p = toDelete;
    setToDelete(null);
    try {
      await removeProduct(p.id);
      onChange(items.filter((x) => x.id !== p.id));
      if (editing === p.id) reset();
      setMsg("Producto eliminado.");
    } catch (ex) {
      setMsg(friendlyProductError(ex));
    }
  }

  const input = "w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-brand-charcoal outline-none transition placeholder:text-gray-400 focus:border-brand-coral focus:ring-4 focus:ring-brand-coral/10";
  const lab = "block text-xs font-extrabold uppercase tracking-wider text-gray-500";
  const card = "rounded-[26px] border border-white/80 bg-white/85 p-6 shadow-[0_4px_20px_-2px_rgba(20,20,22,0.08)] backdrop-blur sm:p-7";
  const stockTone = (p) => typeof p.stock !== "number" ? "bg-gray-100 text-gray-500" : p.stock === 0 ? "bg-red-100 text-red-700" : p.stock <= lowStock ? "bg-amber-100 text-amber-800" : "bg-brand-mintLight text-emerald-700";

  return (
    <div className="mv-root grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
      {/* Catálogo */}
      <section className={card}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold text-brand-charcoal">Catálogo del negocio</h2>
          {items?.length > 0 && <span className="text-sm font-bold text-gray-400">{items.length} productos</span>}
        </div>
        {items === null && <p className="mt-4 text-sm text-gray-500">Cargando productos…</p>}
        {items?.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Aún no tienes productos. Agrega el primero con el formulario.</div>
        )}

        <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {items?.map((p) => (
            <li key={p.id} className={`rounded-[22px] border p-4 transition ${editing === p.id ? "border-brand-coral bg-brand-coralLight/40" : "border-gray-100 bg-white"} ${p.available === false ? "opacity-70" : ""}`}>
              <div className="flex gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                  {p.imagen ? <img src={p.imagen} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-3xl" aria-hidden="true">🛍️</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg font-extrabold text-brand-charcoal">{p.name}</h3>
                  <p className="text-sm font-bold text-brand-coral">{money(p.price)}<span className="font-medium text-gray-400">{p.categoria ? ` · ${p.categoria}` : ""}{p.prepMin ? ` · ${p.prepMin} min` : ""}</span></p>
                  {p.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{p.description}</p>}
                  {p.opciones?.length > 0 && <p className="mt-1 text-xs font-semibold text-gray-500">Personalizable: {p.opciones.map((g) => g.titulo).join(", ")}</p>}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${stockTone(p)}`}>{stockLabel(p, lowStock)}</span>
                  <span className="flex items-center rounded-full border border-gray-200 bg-white">
                    <button type="button" aria-label={`Quitar una unidad de ${p.name}`} onClick={() => changeStock(p, -1)} className="h-8 w-8 text-base font-bold text-gray-600 transition hover:bg-gray-100 rounded-full">−</button>
                    <button type="button" aria-label={`Agregar una unidad de ${p.name}`} onClick={() => changeStock(p, 1)} className="h-8 w-8 text-base font-bold text-brand-coral transition hover:bg-brand-coralLight rounded-full">+</button>
                  </span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-600">
                  <button type="button" role="switch" aria-checked={!!p.available} onClick={() => toggle(p)} className={`relative h-6 w-11 rounded-full transition ${p.available ? "bg-brand-mint" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${p.available ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                  Disponible
                </label>
              </div>

              <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                <button type="button" onClick={() => startEdit(p)} className="rounded-xl border-2 border-gray-200 px-4 py-2 text-xs font-bold text-brand-charcoal transition hover:border-brand-coral/50">Editar</button>
                <button type="button" onClick={() => setToDelete(p)} className="rounded-xl px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Formulario */}
      <form onSubmit={submit} className={`${card} space-y-5 xl:sticky xl:top-28`}>
        <h2 className="font-display text-2xl font-extrabold text-brand-charcoal">{editing ? "Editar producto" : "Agregar producto"}</h2>

        <label className={lab}>Nombre
          <input required maxLength={100} value={form.name} onChange={set("name")} placeholder="Agua de jamaica" className={`${input} mt-2 normal-case tracking-normal`} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={lab}>Precio (MXN)
            <input required type="number" min="0.01" step="0.01" value={form.price} onChange={set("price")} placeholder="25" className={`${input} mt-2 normal-case tracking-normal`} />
          </label>
          <label className={lab}>Existencias
            <input required type="number" min="0" step="1" value={form.stock} onChange={set("stock")} placeholder="20" className={`${input} mt-2 normal-case tracking-normal`} />
          </label>
        </div>
        <label className={lab}>Descripción
          <textarea maxLength={500} rows={3} value={form.description} onChange={set("description")} placeholder="Agua fresca de 500 ml, sin conservadores." className={`${input} mt-2 resize-none normal-case tracking-normal`} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={lab}>Preparación (min)
            <input type="number" min="1" max="180" step="1" value={form.prepMin} onChange={set("prepMin")} placeholder="10" className={`${input} mt-2 normal-case tracking-normal`} />
          </label>
          <label className={lab}>Categoría
            <select value={form.categoria} onChange={set("categoria")} className={`${input} mt-2 normal-case tracking-normal`}>
              <option value="">Sin categoría</option>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <ProductOptionsEditor value={opciones} onChange={setOpciones} />

        <div>
          <span className={lab}>Foto (opcional)</span>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-[11px] font-bold text-gray-400">
              {form.imagen ? <img src={form.imagen} alt="Vista previa del producto" className="h-full w-full object-cover" /> : "Foto"}
            </div>
            <label className="cursor-pointer rounded-2xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-charcoal transition hover:border-brand-coral/50">
              Elegir imagen
              <input key={fileKey} type="file" accept="image/*" onChange={pickImage} className="hidden" />
            </label>
            {form.imagen && <button type="button" onClick={() => { setForm({ ...form, imagen: "" }); setFileKey((k) => k + 1); }} className="text-sm font-semibold text-red-600 underline underline-offset-2">Quitar foto</button>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" disabled={busy} className="rounded-2xl bg-brand-coral px-7 py-3.5 font-display text-base font-extrabold text-white shadow-[0_12px_28px_-6px_rgba(255,90,54,0.45)] transition hover:bg-brand-coralDark active:scale-95 disabled:opacity-60">
            {busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar producto"}
          </button>
          {editing && <button type="button" onClick={reset} className="rounded-2xl border-2 border-gray-200 px-5 py-3 text-sm font-bold text-brand-charcoal">Cancelar</button>}
        </div>
        <p aria-live="polite" className={`text-sm font-semibold ${/agregado|actualizado|eliminado/i.test(msg) ? "text-emerald-700" : "text-red-600"}`}>{msg}</p>
      </form>

      {toDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={() => setToDelete(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="del-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && setToDelete(null)} className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl">
            <h2 id="del-title" className="font-display text-2xl font-extrabold text-brand-charcoal">¿Eliminar producto?</h2>
            <p className="mt-2 text-sm text-gray-500">«{toDelete.name}» se quitará del catálogo y los clientes ya no lo verán. Esta acción no se puede deshacer.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" autoFocus onClick={() => setToDelete(null)} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-brand-charcoal">Cancelar</button>
              <button type="button" onClick={confirmRemove} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}