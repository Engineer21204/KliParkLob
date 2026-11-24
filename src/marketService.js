import { collection, doc, onSnapshot, addDoc, updateDoc, setDoc, getDoc, query, where, serverTimestamp, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "./firebase";


export async function ensureNegocio(uid, { nombre, categoria }) {
  const ref = doc(db, "negocios", uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    nombre, categoria: categoria || "Otro", descripcion: "", abierto: true,
    estado: "en_revision", creadoEn: serverTimestamp(),
  });
}


export function watchNegocios(onData, onError) {
  return onSnapshot(collection(db, "negocios"), (snap) =>
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))), onError);
}

export function watchNegocio(uid, onData, onError) {
  return onSnapshot(doc(db, "negocios", uid), (s) => onData(s.exists() ? { id: s.id, ...s.data() } : null), onError);
}

export const updateNegocio = (uid, patch) => updateDoc(doc(db, "negocios", uid), patch);

export function watchOrders(field, uid, onData, onError) {
  return onSnapshot(query(collection(db, "pedidos"), where(field, "==", uid)), (snap) =>
    onData(snap.docs.map((d) => {
      const data = d.data({ serverTimestamps: "estimate" });
      return { id: d.id, ...data, creado: data.creadoEn?.toMillis?.() ?? Date.now(), listoMs: data.listoEn?.toMillis?.() ?? null, listoRealMs: data.listoReal?.toMillis?.() ?? null };
    }).sort((a, b) => b.creado - a.creado)), onError);
}

export const createOrder = (order) =>
  addDoc(collection(db, "pedidos"), { ...order, estado: 0, creadoEn: serverTimestamp() });

export const advanceOrder = (id, estado) => updateDoc(doc(db, "pedidos", id), { estado });

export const stockAfter = (products, items) => products.map((p) => {
  const item = items.find((i) => i.id === p.id);
  return item && typeof p.stock === "number" ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p;
});

export async function cancelOrder(order, products, motivo = "", por = "negocio") {
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
  batch.update(doc(db, "pedidos", order.id), { estado: 4, cancelPor: por, motivo }); 
  await batch.commit();
  return updated;
}

export async function acceptOrder(order, products, opts = {}) {
  const updated = stockAfter(products, order.items);
  const batch = writeBatch(db);
  updated.forEach((p, i) => {
    if (p.stock !== products[i].stock) batch.update(doc(db, "products", p.id), { stock: p.stock });
  });
  const prepMin = Math.max(1, Math.round(Number(opts.prepMin) || 15));
  batch.update(doc(db, "pedidos", order.id), {
    estado: 1,
    prepMin,
    listoEn: Timestamp.fromMillis(Date.now() + prepMin * 60000), 
    retrasoMin: 0,
    porFinalizar: false,
    aceptadoEn: serverTimestamp(),
  });
  await batch.commit();
  return updated;
}

export const DELIVERY_EXTRA_MIN = 15;
export function calcPrepMin(items, products, negocio, recoger = false) {
  const base = Number(negocio?.prepBaseMin) > 0 ? Number(negocio.prepBaseMin) : 15;
  let max = 0, units = 0;
  (items || []).forEach((i) => {
    const p = (products || []).find((x) => x.id === i.id);
    max = Math.max(max, Number(p?.prepMin) > 0 ? Number(p.prepMin) : base);
    units += i.quantity || 0;
  });
  const total = (max || base) + Math.max(0, units - 1) * 2 + (recoger ? 0 : DELIVERY_EXTRA_MIN);
  return Math.min(180, Math.round(total));
}

export function checkOrder(order, products, negocio) {
  const st = getBusinessStatus(negocio?.horario, negocio?.abierto !== false);
  const abierto = st.estado === "sin-horario" ? negocio?.abierto !== false : st.abierto;
  if (!abierto) return { ok: false, tipo: "cerrado", motivo: "El negocio está cerrado en este momento." };
  for (const item of order.items || []) {
    const p = (products || []).find((x) => x.id === item.id);
    if (!p) return { ok: false, tipo: "producto", motivo: `“${item.name}” ya no está en el menú.` };
    if (p.available === false) return { ok: false, tipo: "producto", motivo: `“${item.name}” no está disponible.` };
    if (typeof p.stock === "number" && p.stock < item.quantity) return { ok: false, tipo: "stock", motivo: `No hay existencias suficientes de “${item.name}”.` };
  }
  return { ok: true };
}

export const extendOrder = (order, extraMin) =>
  updateDoc(doc(db, "pedidos", order.id), {
    listoEn: Timestamp.fromMillis((order.listoMs || Date.now()) + extraMin * 60000),
    retrasoMin: (order.retrasoMin || 0) + extraMin,
    porFinalizar: false,
  });

export const markFinishing = (id) => updateDoc(doc(db, "pedidos", id), { porFinalizar: true });

export const finishOrder = (id) => updateDoc(doc(db, "pedidos", id), { estado: 2, listoReal: serverTimestamp() });

export function friendlyMarketError(e) {
  switch (e?.code) {
    case "permission-denied": return "Sin permiso. Revisa que publicaste las reglas nuevas de Firestore.";
    case "unavailable": return "No hay conexión. Revisa tu internet.";
    default: return "Ocurrió un error. Inténtalo de nuevo.";
  }
}

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