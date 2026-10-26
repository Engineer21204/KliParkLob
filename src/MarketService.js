import { collection, doc, onSnapshot, addDoc, updateDoc, setDoc, getDoc, query, where, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

/* ---------- Negocios (perfil público) ---------- */

/** Crea el perfil público del negocio si todavía no existe (negocios/{uid}). */
export async function ensureNegocio(uid, { nombre, categoria }) {
  const ref = doc(db, "negocios", uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    nombre, categoria: categoria || "Otro", descripcion: "", abierto: true,
    estado: "en_revision", creadoEn: serverTimestamp(),
  });
}

/** Lista de negocios en tiempo real (la ven todos los clientes). */
export function watchNegocios(onData, onError) {
  return onSnapshot(collection(db, "negocios"), (snap) =>
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))), onError);
}

export function watchNegocio(uid, onData, onError) {
  return onSnapshot(doc(db, "negocios", uid), (s) => onData(s.exists() ? { id: s.id, ...s.data() } : null), onError);
}

export const updateNegocio = (uid, patch) => updateDoc(doc(db, "negocios", uid), patch);

/* ---------- Pedidos ---------- */

/** field = "clienteId" (mis pedidos) o "negocioId" (pedidos que recibe mi negocio). */
export function watchOrders(field, uid, onData, onError) {
  return onSnapshot(query(collection(db, "pedidos"), where(field, "==", uid)), (snap) =>
    onData(snap.docs.map((d) => {
      const data = d.data({ serverTimestamps: "estimate" });
      return { id: d.id, ...data, creado: data.creadoEn?.toMillis?.() ?? Date.now() };
    }).sort((a, b) => b.creado - a.creado)), onError);
}

export const createOrder = (order) =>
  addDoc(collection(db, "pedidos"), { ...order, estado: 0, creadoEn: serverTimestamp() });

export const advanceOrder = (id, estado) => updateDoc(doc(db, "pedidos", id), { estado });

/** Existencias después de surtir un pedido (solo productos con control de existencias). */
export const stockAfter = (products, items) => products.map((p) => {
  const item = items.find((i) => i.id === p.id);
  return item && typeof p.stock === "number" ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p;
});

/** Cancela el pedido; si ya se había aceptado, devuelve las existencias al inventario. */
export async function cancelOrder(order, products) {
  let updated = products;
  const batch = writeBatch(db);
  if (order.estado >= 1) {
    updated = products.map((p) => {
      const item = order.items.find((i) => i.id === p.id);
      return item && typeof p.stock === "number" ? { ...p, stock: p.stock + item.quantity } : p;
    });
    updated.forEach((p, i) => {
      if (p.stock !== products[i].stock) batch.update(doc(db, "productos", p.id), { stock: p.stock });
    });
  }
  batch.update(doc(db, "pedidos", order.id), { estado: 4 });
  await batch.commit();
  return updated;
}

/** Acepta el pedido y descuenta las existencias en una sola operación. Devuelve el catálogo actualizado. */
export async function acceptOrder(order, products) {
  const updated = stockAfter(products, order.items);
  const batch = writeBatch(db);
  updated.forEach((p, i) => {
    if (p.stock !== products[i].stock) batch.update(doc(db, "productos", p.id), { stock: p.stock });
  });
  batch.update(doc(db, "pedidos", order.id), { estado: 1 });
  await batch.commit();
  return updated;
}

export function friendlyMarketError(e) {
  switch (e?.code) {
    case "permission-denied": return "Sin permiso. Revisa que publicaste las reglas nuevas de Firestore.";
    case "unavailable": return "No hay conexión. Revisa tu internet.";
    default: return "Ocurrió un error. Inténtalo de nuevo.";
  }
}