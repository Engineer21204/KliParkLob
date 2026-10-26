import { useState } from "react";
import { createProduct, updateProduct, removeProduct, compressImage, friendlyProductError } from "./productService";

const CATEGORIAS = ["Comida", "Bebidas", "Postres"];
const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const LOW_STOCK = 5; // aviso de pocas unidades
const EMPTY = { name: "", price: "", description: "", categoria: "", imagen: "", stock: "" };
const stockLabel = (p, limit = LOW_STOCK) => typeof p.stock !== "number" ? "Sin control de existencias" : p.stock === 0 ? "Agotado" : p.stock <= limit ? `⚠ Pocas unidades: ${p.stock}` : `Existencias: ${p.stock}`;

/** Catálogo del negocio: lista, alta, edición y borrado de productos (con foto y descripción). */
export default function BusinessProducts({ negocioId, items, onChange, loadError, lowStock = LOW_STOCK }) {
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(loadError || "");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null); // producto pendiente de confirmar
  const [fileKey, setFileKey] = useState(0); // para limpiar el selector de archivo
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
        const patch = { name: form.name.trim(), price, description: form.description.trim(), categoria: form.categoria, imagen: form.imagen, stock };
        await updateProduct(editing, patch);
        onChange(items.map((p) => (p.id === editing ? { ...p, ...patch } : p)));
        setMsg("Producto actualizado.");
      } else {
        const created = await createProduct(negocioId, form);
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
    setForm({ name: p.name, price: String(p.price), description: p.description || "", categoria: p.categoria || "", imagen: p.imagen || "", stock: String(p.stock ?? "") });
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

  return (
    <div className="orders">
      <section className="panel">
        <h2>Catálogo del negocio</h2>
        {items === null && <p className="muted" style={{ marginTop: 12 }}>Cargando productos…</p>}
        {items?.length === 0 && <p className="muted" style={{ marginTop: 12 }}>Aún no tienes productos. Agrega el primero con el formulario.</p>}
        {items?.map((p) => (
          <div className="product" key={p.id}>
            <div className="product-art">{p.imagen ? <img src={p.imagen} alt="" /> : <span aria-hidden="true">🛍️</span>}</div>
            <div className="product-info">
              <h3>{p.name}</h3>
              <p className="muted">{money(p.price)}{p.categoria ? ` · ${p.categoria}` : ""}</p>
              {p.description && <p className="muted">{p.description}</p>}
              <p className="muted"><strong>{stockLabel(p, lowStock)}</strong>{" "}
                <button type="button" className="link-btn" aria-label={`Quitar una unidad de ${p.name}`} onClick={() => changeStock(p, -1)}>− 1</button>{" "}
                <button type="button" className="link-btn" aria-label={`Agregar una unidad de ${p.name}`} onClick={() => changeStock(p, 1)}>+ 1</button>
              </p>
              <p className="muted">
                <label><input type="checkbox" checked={p.available} onChange={() => toggle(p)} /> Disponible</label>{" "}
                <button type="button" className="link-btn" onClick={() => startEdit(p)}>Editar</button>{" "}
                <button type="button" className="link-btn" onClick={() => setToDelete(p)}>Eliminar</button>
              </p>
            </div>
          </div>
        ))}
      </section>

      <form className="panel" onSubmit={submit}>
        <h2>{editing ? "Editar producto" : "Agregar producto"}</h2>
        <label className="field">Nombre
          <input required maxLength={100} value={form.name} onChange={set("name")} placeholder="Agua de jamaica" />
        </label>
        <label className="field">Precio en MXN
          <input required type="number" min="0.01" step="0.01" value={form.price} onChange={set("price")} placeholder="25" />
        </label>
        <label className="field">Descripción
          <textarea maxLength={500} rows={3} value={form.description} onChange={set("description")} placeholder="Agua fresca de 500 ml, sin conservadores." />
        </label>
        <label className="field">Existencias (unidades disponibles)
          <input required type="number" min="0" step="1" value={form.stock} onChange={set("stock")} placeholder="20" />
        </label>
        <label className="field">Categoría
          <select value={form.categoria} onChange={set("categoria")}>
            <option value="">Sin categoría</option>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">Foto (opcional)
          <input key={fileKey} type="file" accept="image/*" onChange={pickImage} />
        </label>
        {form.imagen && (
          <div className="prod-preview">
            <img src={form.imagen} alt="Vista previa del producto" />
            <button type="button" className="link-btn" onClick={() => { setForm({ ...form, imagen: "" }); setFileKey((k) => k + 1); }}>Quitar foto</button>
          </div>
        )}
        <button type="submit" className="primary" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar producto"}</button>{" "}
        {editing && <button type="button" className="secondary" onClick={reset}>Cancelar</button>}
        <p className="muted" aria-live="polite" style={{ marginTop: 12 }}>{msg}</p>
      </form>

      {toDelete && (
        <div className="modal-bg" onClick={() => setToDelete(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="del-title"
            onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && setToDelete(null)}>
            <h2 id="del-title">¿Eliminar producto?</h2>
            <p className="muted">«{toDelete.name}» se quitará del catálogo y los clientes ya no lo verán. Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button type="button" className="secondary" autoFocus onClick={() => setToDelete(null)}>Cancelar</button>
              <button type="button" className="danger" onClick={confirmRemove}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}