import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { getProfile, logout } from "./authService";
import KliparkLobAuth from "./KliparkLobAuth";
import KliparkDashboard from "./KliparkDashboard";

export default function App() {
  const [session, setSession] = useState(null);
  const [authScreen, setAuthScreen] = useState("welcome");
  const [checking, setChecking] = useState(true);

  // Al abrir la app: si ya había una sesión de Firebase, la restauramos.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub(); // solo nos interesa el estado inicial
      if (user) {
        try {
          const profile = await getProfile(user.uid);
          if (profile) setSession({ role: profile.rol, profile });
        } catch {
          /* sin perfil o sin conexión: se queda en el login */
        }
      }
      setChecking(false);
    });
    return unsub;
  }, []);

  async function leaveSession(screen = "welcome") {
    try { await logout(); } catch { /* ignorar */ }
    setSession(null);
    setAuthScreen(screen);
  }

  if (checking) {
    return <div className="kl"><main className="kl-card"><p className="sub">Cargando…</p></main></div>;
  }
  if (!session) {
    return <KliparkLobAuth initialScreen={authScreen}
      onAuth={(role, profile = {}) => setSession({ role, profile })} />;
  }
  return <KliparkDashboard key={session.role}
    accountRole={session.role} profile={session.profile}
    onLogout={() => leaveSession()}
    onRequestLogin={() => leaveSession("login")} />;
}