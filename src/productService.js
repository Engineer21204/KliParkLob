import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  query, where, serverTimestamp, deleteField,
} from "firebase/firestore";
import { db } from "./firebase";

const col = collection(db, "products");
const MAX_CHARS = 600000; 

export async function listProducts(negocioId) {
  const snap = await getDocs(query(col, where("negocioId", "==", negocioId)));
  return snap.docs
    .map((d) => {
      const { creadoEn, ...data } = d.data();
      return { id: d.id, ...data }; 
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

const clean = ({ name, price, description, categoria, imagen, available, stock, opciones, prepMin }) => ({
  name: name.trim(),
  price: Number(price),
  description: description.trim(),
  categoria: categoria || "",
  stock: Math.max(0, Math.floor(Number(stock) || 0)), 
  available: available ?? true,
  ...(imagen ? { imagen } : {}),
  ...(Number(prepMin) > 0 ? { prepMin: Math.round(Number(prepMin)) } : {}),
  ...(opciones?.length ? { opciones } : {}), 
});

export async function createProduct(negocioId, data) {
  const product = { ...clean(data), negocioId };
  const ref = await addDoc(col, { ...product, creadoEn: serverTimestamp() });
  return { id: ref.id, ...product };
}

export async function updateProduct(id, patch) {
  const data = { ...patch };
  if ("imagen" in data && !data.imagen) data.imagen = deleteField(); 
  if ("opciones" in data && !data.opciones?.length) data.opciones = deleteField(); 
  if ("prepMin" in data && !(Number(data.prepMin) > 0)) data.prepMin = deleteField();
  await updateDoc(doc(db, "products", id), data);
}

export const removeProduct = (id) => deleteDoc(doc(db, "products", id));

export function compressImage(file, max = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Elige un archivo de imagen (JPG, PNG o WebP)."));
    if (file.size > 10 * 1024 * 1024) return reject(new Error("La imagen pesa más de 10 MB. Elige una más ligera."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let q = quality;
      let out = canvas.toDataURL("image/jpeg", q);
      while (out.length > MAX_CHARS && q > 0.35) {
        q -= 0.1;
        out = canvas.toDataURL("image/jpeg", q);
      }
      if (out.length > MAX_CHARS) reject(new Error("No se pudo reducir la imagen lo suficiente. Prueba con otra."));
      else resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

export function friendlyProductError(e) {
  switch (e?.code) {
    case "permission-denied":
      return "Sin permiso. Revisa que publicaste las reglas de Firestore y que tu cuenta sea de negocio.";
    case "unavailable":
    case "auth/network-request-failed":
      return "No hay conexión. Revisa tu internet.";
    default:
      return "Ocurrió un error. Inténtalo de nuevo.";
  }
}