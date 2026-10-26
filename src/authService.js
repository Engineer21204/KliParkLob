import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { ensureNegocio } from "./marketService";

const userRef = (uid) => doc(db, "users", uid);

/** Lee el perfil guardado en Firestore (users/{uid}). Devuelve null si no existe. */
export async function getProfile(uid) {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return null;
  const { creadoEn, ...data } = snap.data();
  if (data.rol === "negocio") ensureNegocio(uid, data).catch(() => {}); // perfil público (también para cuentas anteriores)
  return { uid, ...data };
}

/** Guarda los datos editables del perfil del usuario (users/{uid}). */
export async function saveProfile(uid, { nombre, cel, direccion }) {
  const patch = { nombre: nombre.trim(), cel: cel || "", direccion: (direccion || "").trim().slice(0, 200) };
  await updateDoc(userRef(uid), patch);
  if (auth.currentUser) updateProfile(auth.currentUser, { displayName: patch.nombre }).catch(() => {});
  return patch;
}

/** Crea la cuenta en Authentication y su perfil (con el rol) en Firestore. */
export async function registerUser({ role, nombre, email, cel, categoria, pass }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  try {
    await updateProfile(cred.user, { displayName: nombre.trim() });
    const data = {
      rol: role, // "cliente" | "negocio"
      nombre: nombre.trim(),
      email: email.trim(),
      cel,
      estado: role === "negocio" ? "en_revision" : "activo",
      creadoEn: serverTimestamp(),
    };
    if (role === "negocio") data.categoria = categoria;
    await setDoc(userRef(cred.user.uid), data);
    if (role === "negocio") await ensureNegocio(cred.user.uid, data).catch(() => {});
    sendEmailVerification(cred.user).catch(() => {}); // si falla, no bloquea el registro
    const { creadoEn, ...profile } = data;
    return { uid: cred.user.uid, ...profile };
  } catch (e) {
    await cred.user.delete().catch(() => {}); // evita cuentas sin perfil
    throw e;
  }
}

/** Inicia sesión y comprueba que la cuenta sea del tipo elegido (cliente o negocio). */
export async function loginUser(email, pass, expectedRole) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const profile = await getProfile(cred.user.uid);
  if (!profile) {
    await signOut(auth);
    throw { code: "app/no-profile" };
  }
  if (profile.rol !== expectedRole) {
    await signOut(auth);
    throw { code: "app/wrong-role", rol: profile.rol };
  }
  return profile;
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());
export const logout = () => signOut(auth);

/** Traduce los errores de Firebase a mensajes para el usuario. */
export function friendlyError(e) {
  switch (e?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ese correo ya tiene una cuenta. Inicia sesión.";
    case "auth/weak-password":
      return "La contraseña es muy débil. Usa al menos 8 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "No hay conexión. Revisa tu internet.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada.";
    case "app/wrong-role":
      return `Esta cuenta es de ${e.rol}. Cambia la opción "Soy ${e.rol}" arriba.`;
    case "app/no-profile":
      return "No encontramos el perfil de esta cuenta. Contacta a soporte.";
    case "permission-denied":
      return "No tienes permiso para esta acción. Revisa las reglas de Firestore.";
    default:
      return "Ocurrió un error. Inténtalo de nuevo.";
  }
}