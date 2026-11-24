import {
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
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

/* ---------- Google y teléfono ---------- */

/** Revisa el perfil de una cuenta que entró con Google o teléfono. Si no tiene, pide completarlo. */
async function resolveSocial(user, expectedRole) {
  const profile = await getProfile(user.uid);
  if (!profile) {
    return { needsProfile: true, user: { uid: user.uid, email: user.email || "", nombre: user.displayName || "", cel: (user.phoneNumber || "").replace(/^\+52/, "") } };
  }
  if (expectedRole && profile.rol !== expectedRole) {
    await signOut(auth);
    throw { code: "app/wrong-role", rol: profile.rol };
  }
  return { profile };
}

export async function loginWithGoogle(expectedRole) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  return resolveSocial(cred.user, expectedRole);
}

let phoneVerifier = null;
const clearVerifier = () => { try { phoneVerifier?.clear(); } catch { /* ya limpio */ } phoneVerifier = null; };

/** Envía el código SMS. `cel10` = 10 dígitos (México, +52). Devuelve la confirmación para validar el código. */
export async function sendPhoneCode(cel10, containerId = "recaptcha-container") {
  clearVerifier();
  phoneVerifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  try {
    return await signInWithPhoneNumber(auth, `+52${cel10}`, phoneVerifier);
  } catch (e) {
    clearVerifier();
    throw e;
  }
}

export async function confirmPhoneCode(confirmation, code, expectedRole) {
  const cred = await confirmation.confirm(code);
  return resolveSocial(cred.user, expectedRole);
}

/** Crea el perfil (users/{uid}) de una cuenta que entró con Google o teléfono. */
export async function completeProfile({ role, nombre, categoria, cel }) {
  const user = auth.currentUser;
  if (!user) throw { code: "app/no-profile" };
  const data = {
    rol: role,
    nombre: nombre.trim(),
    email: user.email || "",
    cel: cel || "",
    estado: role === "negocio" ? "en_revision" : "activo",
    creadoEn: serverTimestamp(),
  };
  if (role === "negocio") data.categoria = categoria;
  await setDoc(userRef(user.uid), data);
  if (role === "negocio") await ensureNegocio(user.uid, data).catch(() => {});
  updateProfile(user, { displayName: data.nombre }).catch(() => {});
  const { creadoEn, ...profile } = data;
  return { uid: user.uid, ...profile };
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
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Cerraste la ventana de Google antes de terminar.";
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.";
    case "auth/account-exists-with-different-credential":
      return "Ese correo ya tiene una cuenta con otro método. Entra con tu correo y contraseña.";
    case "auth/operation-not-allowed":
      return "Este método de acceso no está activado en Firebase (Authentication → Sign-in method).";
    case "auth/invalid-phone-number":
      return "El número de celular no es válido.";
    case "auth/invalid-verification-code":
      return "El código es incorrecto.";
    case "auth/code-expired":
      return "El código venció. Pide uno nuevo.";
    case "auth/captcha-check-failed":
      return "No se pudo verificar que eres una persona. Intenta de nuevo.";
    case "auth/billing-not-enabled":
      return "Los SMS requieren activar la facturación del proyecto en Firebase. Usa Google o correo.";
    case "auth/quota-exceeded":
      return "Se alcanzó el límite de SMS. Usa Google o correo.";
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