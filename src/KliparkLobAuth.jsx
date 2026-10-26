import { useState } from "react";
import "./KliparkLobAuth.css";
import { registerUser, loginUser, resetPassword, friendlyError } from "./authService";

// El acceso por celular sigue siendo una simulación: se activa cuando conectemos Phone Auth de Firebase.
const PHONE_LOGIN = false;


const CATEGORIAS = ["Comida", "Bebidas", "Postres"];
const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v);
const fakeApi = () => new Promise((r) => setTimeout(r, 600)); // Sustituir por tu backend

/* ---------- Piezas reutilizables ---------- */
function Logo() {
  return (
    <div className="kl-logo">
      <svg viewBox="0 0 64 64" fill="none" stroke="#6b4fd8" strokeWidth="3.5" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 24 14 10h36l6 14v4a8 8 0 0 1-16 0 8 8 0 0 1-16 0 8 8 0 0 1-16 0z" />
        <path d="M12 36v18h40V36M26 54V42h12v12" />
      </svg>
      <b>KliparkLob</b>
      <span>Tu tienda, más cerca de ti</span>
    </div>
  );
}

function Field({ label, error, type = "text", value, onChange, prefix, ...rest }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  const id = "f-" + label.replace(/\s/g, "");
  return (
    <div className="kl-field">
      <label htmlFor={id}>{label}</label>
      <div className={"kl-input" + (error ? " bad" : "")}>
        {prefix && <span className="pre">{prefix}</span>}
        <input id={id} type={isPass && show ? "text" : type} value={value}
          onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} {...rest} />
        {isPass && (
          <button type="button" className="kl-eye" onClick={() => setShow(!show)}>
            {show ? "Ocultar" : "Mostrar"}
          </button>
        )}
      </div>
      {error && <div className="kl-err" role="alert">{error}</div>}
    </div>
  );
}

const Back = ({ onClick }) => (
  <button type="button" className="kl-back" onClick={onClick} aria-label="Volver">←</button>
);

/* ---------- Pantallas ---------- */
function Welcome({ go }) {
  return (
    <>
      <Logo />
      <h1 style={{ textAlign: "center", marginTop: 24 }}>Bienvenido</h1>
      <p className="sub" style={{ textAlign: "center" }}>Compra, vende y apoya negocios locales en un solo lugar.</p>
      <button className="kl-btn" onClick={() => go("login")}>Iniciar sesión</button>
      <button className="kl-btn ghost" onClick={() => go("role")}>Registrarse</button>
      <div className="kl-center">
        <button className="kl-link" onClick={() => go("done", { role: "invitado" })}>Continuar como invitado</button>
      </div>
    </>
  );
}

function Login({ go, role, setRole }) {
  const [method, setMethod] = useState(PHONE_LOGIN ? "cel" : "mail");
  const [f, setF] = useState({ cel: "", email: "", pass: "" });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const isNeg = role === "negocio";
  const useCel = !isNeg && method === "cel";

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (useCel) {
      if (f.cel.replace(/\D/g, "").length !== 10) er.cel = "Escribe tu celular de 10 dígitos.";
    } else {
      if (!emailOk(f.email)) er.email = "Escribe un correo válido.";
      if (!f.pass) er.pass = "Escribe tu contraseña.";
    }
    setErr(er);
    if (Object.keys(er).length) return;
    if (useCel) { // Pendiente: Phone Auth de Firebase (hoy desactivado con PHONE_LOGIN)
      setBusy(true);
      await fakeApi();
      setBusy(false);
      return go("code", { after: "done", codeFor: `+52 ${f.cel}`, profile: { cel: f.cel } });
    }
    setBusy(true);
    try {
      const profile = await loginUser(f.email, f.pass, role);
      go("done", { logged: true, profile });
    } catch (ex) {
      setErr({ form: friendlyError(ex) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Back onClick={() => go("welcome")} />
      <h1>Iniciar sesión</h1>
      <p className="sub">Elige cómo quieres entrar.</p>

      <div className={"kl-seg " + (isNeg ? "neg" : "cli")} role="group" aria-label="Tipo de cuenta">
        <button type="button" aria-pressed={!isNeg} onClick={() => setRole("cliente")}>Soy cliente</button>
        <button type="button" aria-pressed={isNeg} onClick={() => setRole("negocio")}>Soy negocio</button>
      </div>

      {!isNeg && PHONE_LOGIN && (
        <div className="kl-seg" role="group" aria-label="Método">
          <button type="button" aria-pressed={method === "cel"} onClick={() => setMethod("cel")}>Celular</button>
          <button type="button" aria-pressed={method === "mail"} onClick={() => setMethod("mail")}>Correo</button>
        </div>
      )}

      {useCel ? (
        <Field label="Celular" prefix="+52" type="tel" inputMode="numeric" autoComplete="tel-national"
          placeholder="10 dígitos" value={f.cel} onChange={(v) => set("cel")(v.replace(/\D/g, "").slice(0, 10))} error={err.cel} />
      ) : (
        <>
          <Field label="Correo electrónico" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={err.email} />
          <Field label="Contraseña" type="password" autoComplete="current-password" value={f.pass} onChange={set("pass")} error={err.pass} />
          <div style={{ textAlign: "right", marginTop: -8 }}>
            <button type="button" className="kl-link" onClick={() => go("forgot")}>¿Olvidaste tu contraseña?</button>
          </div>
        </>
      )}

      {err.form && <div className="kl-err" role="alert">{err.form}</div>}
      <button className="kl-btn" disabled={busy}>
        {busy ? "Un momento…" : useCel ? "Enviar código" : "Entrar"}
      </button>
      {useCel && <p className="kl-hint">Te enviaremos un código por WhatsApp o SMS.</p>}

      <div className="kl-center">
        ¿No tienes cuenta? <button type="button" className="kl-link" onClick={() => go("role")}>Regístrate</button>
      </div>
    </form>
  );
}

function Role({ go, setRole }) {
  const pick = (r) => { setRole(r); go(r === "negocio" ? "regNegocio" : "regCliente"); };
  return (
    <>
      <Back onClick={() => go("welcome")} />
      <h1>Crear cuenta</h1>
      <p className="sub">¿Cómo te gustaría registrarte?</p>
      <button className="kl-role neg" onClick={() => pick("negocio")}>
        <span className="ic" aria-hidden="true">🏪</span>
        <span><b>Soy un negocio</b><small>Registra tu tienda y empieza a vender.</small></span>
      </button>
      <button className="kl-role cli" onClick={() => pick("cliente")}>
        <span className="ic" aria-hidden="true">🙋</span>
        <span><b>Soy un cliente</b><small>Descubre productos, haz tus pedidos y más.</small></span>
      </button>
      <div className="kl-center">
        ¿Ya tienes cuenta? <button className="kl-link" onClick={() => go("login")}>Iniciar sesión</button>
      </div>
    </>
  );
}

function Register({ go, role }) {
  const isNeg = role === "negocio";
  const [f, setF] = useState({ nombre: "", categoria: "", email: "", cel: "", pass: "" });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.nombre.trim().length < 2) er.nombre = isNeg ? "Escribe el nombre de tu negocio." : "Escribe tu nombre completo.";
    if (isNeg && !f.categoria) er.categoria = "Elige una categoría.";
    if (!emailOk(f.email)) er.email = "Escribe un correo válido.";
    if (f.pass.length < 8) er.pass = "Usa al menos 8 caracteres.";
    if (f.cel.length !== 10) er.cel = "Escribe tu celular de 10 dígitos.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const profile = await registerUser({ role, ...f });
      go("done", { registered: true, profile });
    } catch (ex) {
      setErr({ form: friendlyError(ex) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Back onClick={() => go("role")} />
      <h1>{isNeg ? "Registro de negocio" : "Registro de cliente"}</h1>
      <p className="sub">{isNeg ? "Completa la información de tu negocio." : "Crea tu cuenta para empezar a comprar."}</p>

      <Field label={isNeg ? "Nombre del negocio" : "Nombre completo"} value={f.nombre} onChange={set("nombre")} error={err.nombre} autoComplete="name" />
      {isNeg && (
        <div className="kl-field">
          <label htmlFor="cat">Categoría</label>
          <div className={"kl-input" + (err.categoria ? " bad" : "")}>
            <select id="cat" value={f.categoria} onChange={(e) => set("categoria")(e.target.value)}>
              <option value="">Selecciona una</option>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {err.categoria && <div className="kl-err" role="alert">{err.categoria}</div>}
        </div>
      )}
      <Field label="Correo electrónico" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={err.email} />
      <Field label="Contraseña" type="password" autoComplete="new-password" value={f.pass} onChange={set("pass")} error={err.pass} />
      <Field label="Celular" prefix="+52" type="tel" inputMode="numeric" value={f.cel}
        onChange={(v) => set("cel")(v.replace(/\D/g, "").slice(0, 10))} error={err.cel} />
    

      {err.form && <div className="kl-err" role="alert">{err.form}</div>}
      <button className="kl-btn" disabled={busy}>{busy ? "Creando…" : "Crear cuenta"}</button>
      <div className="kl-center" style={{ paddingTop: 10 }}>
        ¿Ya tienes cuenta? <button type="button" className="kl-link" onClick={() => go("login")}>Iniciar sesión</button>
      </div>
    </form>
  );
}

function Code({ go, ctx, role }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return setErr("El código tiene 6 dígitos.");
    await fakeApi(); // Validar el código en tu backend
    go("done", { ...ctx, registered: ctx.registered });
  };
  return (
    <form onSubmit={submit} className="kl-code" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Back onClick={() => go("login")} />
      <h1>Verifica tu identidad</h1>
      <p className="sub">Enviamos un código de 6 dígitos a <b>{ctx.codeFor}</b>.</p>
      <input inputMode="numeric" autoComplete="one-time-code" aria-label="Código de verificación" placeholder="••••••"
        value={code} maxLength={6} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErr(""); }} />
      {err && <div className="kl-err" role="alert">{err}</div>}
      <button className="kl-btn" style={{ marginTop: 18 }}>Verificar</button>
      <div className="kl-center" style={{ marginTop: 0 }}>
        {sent ? "Código reenviado." : <>¿No llegó? <button type="button" className="kl-link" onClick={() => setSent(true)}>Reenviar código</button></>}
      </div>
      <p className="kl-hint">Demo: acepta cualquier código de 6 dígitos.</p>
    </form>
  );
}

function Forgot({ go }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!emailOk(email)) return setErr("Escribe un correo válido.");
    try {
      await resetPassword(email);
    } catch (ex) {
      // Por privacidad no revelamos si el correo existe.
      if (ex.code !== "auth/user-not-found") return setErr(friendlyError(ex));
    }
    setOk(true);
  };
  return (
    <form onSubmit={submit} noValidate>
      <Back onClick={() => go("login")} />
      <h1>Recuperar contraseña</h1>
      {ok ? (
        <>
          <p className="sub">Si el correo tiene una cuenta, recibirás un enlace para crear una contraseña nueva. El enlace caduca en poco tiempo.</p>
          <button type="button" className="kl-btn" onClick={() => go("login")}>Volver a iniciar sesión</button>
        </>
      ) : (
        <>
          <p className="sub">Escribe tu correo y te enviaremos un enlace.</p>
          <Field label="Correo electrónico" type="email" value={email} onChange={(v) => { setEmail(v); setErr(""); }} error={err} />
          <button className="kl-btn">Enviar enlace</button>
        </>
      )}
    </form>
  );
}

function Done({ ctx, role, finish }) {
  const guest = ctx.role === "invitado";
  const neg = role === "negocio" && !guest;
  return (
    <div className="kl-done">
      <div className="kl-badge" aria-hidden="true">✓</div>
      <h1>{guest ? "Explora sin cuenta" : ctx.registered ? "¡Listo!" : "¡Hola de nuevo!"}</h1>
      <p className="sub">
        {guest
          ? "Puedes ver negocios y productos. Para pagar, chatear o ganar puntos, inicia sesión."
          : ctx.registered
          ? "Tu cuenta ha sido creada. Te enviamos un correo para verificarla."
          : neg ? "Entrando a tu panel de negocio." : "Entrando a tu inicio."}
      </p>
      {neg && ctx.registered && (
        <p className="kl-note">Tu negocio está en revisión. Mientras tanto, ya puedes configurar tu tienda.</p>
      )}
      <button className="kl-btn" onClick={() => finish(guest ? "invitado" : role, ctx.profile || {})}>
        {guest ? "Explorar" : neg ? "Ir a mi panel" : "Comenzar"}
      </button>
    </div>
  );
}

/* ---------- App ---------- */
export default function KliparkLobAuth({ initialScreen = "welcome", onAuth = () => {} }) {
  const [screen, setScreen] = useState(initialScreen);
  const [role, setRole] = useState("cliente");
  const [ctx, setCtx] = useState({});
  const go = (s, c = {}) => { setCtx(c); setScreen(s); };

  return (
    <div className="kl">
      <main className="kl-card">
        {screen === "welcome" && <Welcome go={go} />}
        {screen === "login" && <Login go={go} role={role} setRole={setRole} />}
        {screen === "role" && <Role go={go} setRole={setRole} />}
        {(screen === "regCliente" || screen === "regNegocio") && <Register go={go} role={role} />}
        {screen === "code" && <Code go={go} ctx={ctx} role={role} />}
        {screen === "forgot" && <Forgot go={go} />}
        {screen === "done" && <Done ctx={ctx} role={role} finish={onAuth} />}
      </main>
    </div>
  );
}