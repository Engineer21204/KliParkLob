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
      if (p.stock !== products[i].stock) batch.update(doc(db, "products", p.id), { stock: p.stock });
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
    if (p.stock !== products[i].stock) batch.update(doc(db, "products", p.id), { stock: p.stock });
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

/* ---------- Estado automático del negocio ---------- */

/**
 * Calcula el estado del negocio usando la zona horaria
 * de Chilpancingo, México.
 *
 * Estados:
 * abierto, cerrado, abre-pronto, cierra-pronto,
 * sin-horario.
 */
export function getBusinessStatus(horario, manualAbierto = true, fecha = new Date()) {
  if (manualAbierto === false) {
    return {
      estado: "cerrado",
      mensaje: "Cerrado temporalmente",
      abierto: false
    };
  }

  if (!horario || typeof horario !== "object") {
    return {
      estado: "sin-horario",
      mensaje: "Horario no configurado",
      abierto: false
    };
  }

  const zona = "America/Mexico_City";

  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(fecha);

  const valores = Object.fromEntries(
    partes.map(p => [p.type, p.value])
  );

  const dias = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];

  const ids = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado"
  ];

  const diaActual = dias.indexOf(valores.weekday.toLowerCase());
  const minutoActual =
    Number(valores.hour) * 60 + Number(valores.minute);

  if (diaActual < 0) {
    return {
      estado: "sin-horario",
      mensaje: "Horario no disponible",
      abierto: false
    };
  }

  const minutosSemana = 7 * 24 * 60;
  const minutoAbsoluto = diaActual * 1440 + minutoActual;

  const intervalos = [];

  // Construir los horarios semanales.
  ids.forEach((id, indice) => {
    const dia = horario[id];

    if (!dia?.activo || !dia.apertura || !dia.cierre) {
      return;
    }

    const convertir = hora => {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
        return null;
      }

      const [h, m] = hora.split(":").map(Number);
      return h * 60 + m;
    };

    const apertura = convertir(dia.apertura);
    const cierre = convertir(dia.cierre);

    if (apertura === null || cierre === null || apertura === cierre) {
      return;
    }

    const inicio = indice * 1440 + apertura;

    let duracion = cierre - apertura;

    // Permitir horarios que terminan al día siguiente.
    if (duracion < 0) {
      duracion += 1440;
    }

    intervalos.push({
      inicio,
      duracion
    });
  });

  if (!intervalos.length) {
    return {
      estado: "sin-horario",
      mensaje: "Sin horario de servicio",
      abierto: false
    };
  }

  let minutosParaAbrir = Infinity;
  let minutosParaCerrar = Infinity;

  for (const intervalo of intervalos) {
    const transcurrido =
      (minutoAbsoluto - intervalo.inicio + minutosSemana) %
      minutosSemana;

    if (transcurrido < intervalo.duracion) {
      minutosParaCerrar = Math.min(
        minutosParaCerrar,
        intervalo.duracion - transcurrido
      );
    } else {
      const faltante =
        (intervalo.inicio - minutoAbsoluto + minutosSemana) %
        minutosSemana;

      minutosParaAbrir = Math.min(minutosParaAbrir, faltante);
    }
  }

  // Prioridad: si está abierto, comprobar si está por cerrar.
  if (minutosParaCerrar !== Infinity) {
    if (minutosParaCerrar <= 10) {
      return {
        estado: "cierra-pronto",
        mensaje: "Cierra pronto",
        abierto: true,
        minutos: minutosParaCerrar
      };
    }

    return {
      estado: "abierto",
      mensaje: "Abierto",
      abierto: true
    };
  }

  // Comprobar si falta poco para la siguiente apertura.
  if (minutosParaAbrir > 0 && minutosParaAbrir <= 10) {
    return {
      estado: "abre-pronto",
      mensaje: "Abre pronto",
      abierto: false,
      minutos: minutosParaAbrir
    };
  }

  return {
    estado: "cerrado",
    mensaje: "Cerrado",
    abierto: false
  };
}

