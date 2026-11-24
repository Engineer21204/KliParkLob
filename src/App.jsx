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
    return (
      <div className="mv-root flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-100 via-brand-surface to-emerald-100">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-coral/20 border-t-brand-coral" />
          <p className="font-display text-sm font-bold text-gray-500">Cargando…</p>
        </div>
      </div>
    );
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