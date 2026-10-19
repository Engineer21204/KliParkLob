import { useState } from "react";
import KliparkLobAuth from "./KliparkLobAuth";
import KliparkDashboard from "./KliparkDashboard";

export default function App() {
  const [session, setSession] = useState(null);
  const [authScreen, setAuthScreen] = useState("welcome");
  function leaveSession(screen = "welcome") {
    setSession(null);
    setAuthScreen(screen);
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
