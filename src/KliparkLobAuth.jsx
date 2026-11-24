import { useState } from "react";
import { registerUser, loginUser, loginWithGoogle, sendPhoneCode, confirmPhoneCode, completeProfile, resetPassword, friendlyError } from "./authService";

// Activa/desactiva el acceso por celular (SMS). Puede requerir facturación en Firebase; si falla se avisa en pantalla.
const PHONE_LOGIN = true;

const CATEGORIAS = ["Comida", "Bebidas", "Postres"];
const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v);

const INPUT = "w-full rounded-2xl border-2 bg-white/90 px-4 py-3.5 text-[15px] font-medium text-brand-charcoal outline-none transition placeholder:text-gray-400 focus:border-brand-coral focus:ring-4 focus:ring-brand-coral/10";
const BTN = "flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-coral px-5 py-4 font-display text-[15px] font-extrabold text-white shadow-[0_12px_28px_-6px_rgba(255,90,54,0.5)] transition hover:bg-brand-coralDark active:scale-[0.98] disabled:opacity-60";
const BTN_GHOST = "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white/90 px-5 py-3.5 font-display text-[15px] font-bold text-brand-charcoal transition hover:border-brand-coral/50 active:scale-[0.98] disabled:opacity-60";
const LINK = "font-bold text-brand-coral underline underline-offset-2 hover:text-brand-coralDark";

/* ---------- Piezas ---------- */
function Logo({ small = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-coral to-orange-500 text-white shadow-md ${small ? "h-10 w-10" : "h-12 w-12"}`}>
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M8 24 14 10h36l6 14v4a8 8 0 0 1-16 0 8 8 0 0 1-16 0 8 8 0 0 1-16 0z" /><path d="M12 36v18h40V36M26 54V42h12v12" />
        </svg>
      </span>
      <span className="flex flex-col">
        <b className="font-display text-xl font-extrabold leading-none tracking-tight text-brand-charcoal">Klipark<span className="text-brand-coral">Lob</span></b>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Tu tienda, más cerca de ti</span>
      </span>
    </div>
  );
}

function Field({ label, error, type = "text", value, onChange, prefix, ...rest }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  const id = "f-" + label.replace(/\s/g, "");
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-500">{label}</label>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-4 text-sm font-bold text-gray-500">{prefix}</span>}
        <input id={id} type={isPass && show ? "text" : type} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error}
          className={`${INPUT} ${error ? "border-red-400" : "border-gray-200"} ${prefix ? "pl-14" : ""} ${isPass ? "pr-24" : ""}`} {...rest} />
        {isPass && <button type="button" onClick={() => setShow(!show)} className="absolute right-4 text-xs font-bold text-brand-coral">{show ? "Ocultar" : "Mostrar"}</button>}
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function Select({ label, error, value, onChange, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT} ${error ? "border-red-400" : "border-gray-200"}`}>{children}</select>
      {error && <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

const Back = ({ onClick }) => (
  <button type="button" onClick={onClick} aria-label="Volver" className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-lg font-bold text-brand-charcoal transition hover:bg-white">←</button>
);

const Title = ({ children, sub }) => (
  <div className="mb-6">
    <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-charcoal">{children}</h1>
    {sub && <p className="mt-1.5 text-sm text-gray-500">{sub}</p>}
  </div>
);

const ErrorBox = ({ children }) => children ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{children}</p> : null;

const Divider = ({ children }) => (
  <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-gray-400">
    <span className="h-px flex-1 bg-gray-200" />{children}<span className="h-px flex-1 bg-gray-200" />
  </div>
);

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function GoogleButton({ label = "Continuar con Google", role, go, setRole }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const click = async () => {
    setBusy(true); setErr("");
    try {
      const res = await loginWithGoogle(role);
      if (res.needsProfile) return go("complete", { user: res.user });
      setRole(res.profile.rol);
      go("done", { logged: true, profile: res.profile });
    } catch (ex) { setErr(friendlyError(ex)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <button type="button" onClick={click} disabled={busy} className={BTN_GHOST}><GoogleIcon />{busy ? "Abriendo Google…" : label}</button>
      <ErrorBox>{err}</ErrorBox>
    </div>
  );
}

function Segmented({ role, setRole }) {
  return (
    <div role="group" aria-label="Tipo de cuenta" className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-gray-200 bg-gray-100/80 p-1">
      {[["cliente", "Soy cliente"], ["negocio", "Soy negocio"]].map(([v, l]) => (
        <button key={v} type="button" aria-pressed={role === v} onClick={() => setRole(v)}
          className={`rounded-xl py-2.5 text-sm font-bold transition ${role === v ? "bg-brand-charcoal text-white shadow" : "text-gray-600 hover:bg-white/70"}`}>{l}</button>
      ))}
    </div>
  );
}

/* ---------- Pantallas ---------- */
function Welcome({ go }) {
  return (
    <>
      <div className="mb-8 lg:hidden"><Logo /></div>
      <Title sub="Compra, vende y apoya negocios locales en un solo lugar.">Bienvenido</Title>
      <div className="space-y-3">
        <button className={BTN} onClick={() => go("login")}>Iniciar sesión</button>
        <button className={BTN_GHOST} onClick={() => go("role")}>Crear una cuenta</button>
      </div>
      <p className="mt-6 text-center"><button className="text-sm font-bold text-gray-500 underline underline-offset-2 hover:text-brand-coral" onClick={() => go("done", { role: "invitado" })}>Continuar como invitado</button></p>
    </>
  );
}

function Login({ go, role, setRole }) {
  const [f, setF] = useState({ email: "", pass: "" });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!emailOk(f.email)) er.email = "Escribe un correo válido.";
    if (!f.pass) er.pass = "Escribe tu contraseña.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const profile = await loginUser(f.email, f.pass, role);
      go("done", { logged: true, profile });
    } catch (ex) { setErr({ form: friendlyError(ex) }); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Back onClick={() => go("welcome")} />
      <Title sub="Elige cómo quieres entrar.">Iniciar sesión</Title>
      <Segmented role={role} setRole={setRole} />

      <div className="space-y-2.5">
        <GoogleButton role={role} go={go} setRole={setRole} />
        {PHONE_LOGIN && <button type="button" onClick={() => go("phone")} className={BTN_GHOST}>📱 Continuar con teléfono</button>}
      </div>
      <Divider>o con tu correo</Divider>

      <div className="space-y-4">
        <Field label="Correo electrónico" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={err.email} />
        <Field label="Contraseña" type="password" autoComplete="current-password" value={f.pass} onChange={set("pass")} error={err.pass} />
        <div className="text-right"><button type="button" className="text-xs font-bold text-brand-coral underline underline-offset-2" onClick={() => go("forgot")}>¿Olvidaste tu contraseña?</button></div>
        <ErrorBox>{err.form}</ErrorBox>
        <button className={BTN} disabled={busy}>{busy ? "Un momento…" : "Entrar"}</button>
      </div>
      <p className="mt-5 text-center text-sm text-gray-500">¿No tienes cuenta? <button type="button" className={LINK} onClick={() => go("role")}>Regístrate</button></p>
    </form>
  );
}

function Role({ go, setRole }) {
  const pick = (r) => { setRole(r); go(r === "negocio" ? "regNegocio" : "regCliente"); };
  const Card = ({ r, icon, title, text }) => (
    <button type="button" onClick={() => pick(r)} className="group flex w-full items-center gap-4 rounded-[22px] border-2 border-gray-200 bg-white/90 p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-coral hover:shadow-lg">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-coralLight text-3xl" aria-hidden="true">{icon}</span>
      <span><b className="block font-display text-lg font-extrabold text-brand-charcoal">{title}</b><small className="text-sm text-gray-500">{text}</small></span>
      <span className="ml-auto text-xl text-gray-300 transition group-hover:text-brand-coral">→</span>
    </button>
  );
  return (
    <>
      <Back onClick={() => go("welcome")} />
      <Title sub="¿Cómo te gustaría registrarte?">Crear cuenta</Title>
      <div className="space-y-3">
        <Card r="negocio" icon="🏪" title="Soy un negocio" text="Registra tu tienda y empieza a vender." />
        <Card r="cliente" icon="🙋" title="Soy un cliente" text="Descubre productos y haz tus pedidos." />
      </div>
      <p className="mt-6 text-center text-sm text-gray-500">¿Ya tienes cuenta? <button className={LINK} onClick={() => go("login")}>Iniciar sesión</button></p>
    </>
  );
}

function Register({ go, role, setRole }) {
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
    } catch (ex) { setErr({ form: friendlyError(ex) }); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Back onClick={() => go("role")} />
      <Title sub={isNeg ? "Completa la información de tu negocio." : "Crea tu cuenta para empezar a comprar."}>{isNeg ? "Registro de negocio" : "Registro de cliente"}</Title>

      <GoogleButton label="Registrarme con Google" role={undefined} go={(s, c) => go(s, { ...c, role })} setRole={setRole} />
      <Divider>o con tu correo</Divider>

      <div className="space-y-4">
        <Field label={isNeg ? "Nombre del negocio" : "Nombre completo"} value={f.nombre} onChange={set("nombre")} error={err.nombre} autoComplete="name" />
        {isNeg && (
          <Select label="Categoría" value={f.categoria} onChange={set("categoria")} error={err.categoria}>
            <option value="">Selecciona una</option>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        )}
        <Field label="Correo electrónico" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={err.email} />
        <Field label="Contraseña" type="password" autoComplete="new-password" value={f.pass} onChange={set("pass")} error={err.pass} />
        <Field label="Celular" prefix="+52" type="tel" inputMode="numeric" value={f.cel} onChange={(v) => set("cel")(v.replace(/\D/g, "").slice(0, 10))} error={err.cel} />
        <ErrorBox>{err.form}</ErrorBox>
        <button className={BTN} disabled={busy}>{busy ? "Creando…" : "Crear cuenta"}</button>
      </div>
      <p className="mt-5 text-center text-sm text-gray-500">¿Ya tienes cuenta? <button type="button" className={LINK} onClick={() => go("login")}>Iniciar sesión</button></p>
    </form>
  );
}

/* Teléfono: 1) pedir el número, 2) validar el código */
function Phone({ go, role, setRole }) {
  const [cel, setCel] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (cel.length !== 10) return setErr("Escribe tu celular de 10 dígitos.");
    setBusy(true); setErr("");
    try { setConfirmation(await sendPhoneCode(cel)); } catch (ex) { setErr(friendlyError(ex)); } finally { setBusy(false); }
  };
  const verify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return setErr("El código tiene 6 dígitos.");
    setBusy(true); setErr("");
    try {
      const res = await confirmPhoneCode(confirmation, code, role);
      if (res.needsProfile) return go("complete", { user: { ...res.user, cel } });
      setRole(res.profile.rol);
      go("done", { logged: true, profile: res.profile });
    } catch (ex) { setErr(friendlyError(ex)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={confirmation ? verify : send} noValidate>
      <Back onClick={() => (confirmation ? setConfirmation(null) : go("login"))} />
      {!confirmation ? (
        <>
          <Title sub="Te enviaremos un código por SMS.">Entrar con teléfono</Title>
          <Segmented role={role} setRole={setRole} />
          <div className="space-y-4">
            <Field label="Celular" prefix="+52" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10 dígitos" value={cel} onChange={(v) => { setCel(v.replace(/\D/g, "").slice(0, 10)); setErr(""); }} />
            <ErrorBox>{err}</ErrorBox>
            <button className={BTN} disabled={busy}>{busy ? "Enviando…" : "Enviar código"}</button>
          </div>
        </>
      ) : (
        <>
          <Title sub={<>Enviamos un código de 6 dígitos a <b>+52 {cel}</b>.</>}>Verifica tu número</Title>
          <div className="space-y-4">
            <input inputMode="numeric" autoComplete="one-time-code" aria-label="Código de verificación" placeholder="••••••" value={code} maxLength={6}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErr(""); }}
              className={`${INPUT} border-gray-200 text-center font-display text-3xl font-extrabold tracking-[0.5em]`} />
            <ErrorBox>{err}</ErrorBox>
            <button className={BTN} disabled={busy}>{busy ? "Verificando…" : "Verificar"}</button>
            <p className="text-center text-sm text-gray-500">¿No llegó? <button type="button" className={LINK} onClick={() => { setConfirmation(null); setCode(""); }}>Cambiar número o reenviar</button></p>
          </div>
        </>
      )}
      <div id="recaptcha-container" />
    </form>
  );
}

/* Primer ingreso con Google/teléfono: elegir tipo de cuenta y completar datos */
function Complete({ go, ctx, role: roleProp, setRole }) {
  const u = ctx.user || {};
  const fixed = ctx.role; // viene del registro (ya eligió cliente/negocio)
  const [role, setLocal] = useState(fixed || roleProp || "cliente");
  const [f, setF] = useState({ nombre: u.nombre || "", categoria: "", cel: u.cel || "" });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const isNeg = role === "negocio";
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.nombre.trim().length < 2) er.nombre = isNeg ? "Escribe el nombre de tu negocio." : "Escribe tu nombre completo.";
    if (isNeg && !f.categoria) er.categoria = "Elige una categoría.";
    if (f.cel && f.cel.length !== 10) er.cel = "El celular debe tener 10 dígitos.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const profile = await completeProfile({ role, ...f });
      setRole(role);
      go("done", { registered: true, profile });
    } catch (ex) { setErr({ form: friendlyError(ex) }); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Title sub={u.email ? `Entraste como ${u.email}. Falta un último paso.` : "Falta un último paso para crear tu cuenta."}>¿Cómo vas a usar KliparkLob?</Title>
      {!fixed && <Segmented role={role} setRole={setLocal} />}
      <div className="space-y-4">
        <Field label={isNeg ? "Nombre del negocio" : "Nombre completo"} value={f.nombre} onChange={set("nombre")} error={err.nombre} autoComplete="name" />
        {isNeg && (
          <Select label="Categoría" value={f.categoria} onChange={set("categoria")} error={err.categoria}>
            <option value="">Selecciona una</option>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        )}
        <Field label="Celular (opcional)" prefix="+52" type="tel" inputMode="numeric" value={f.cel} onChange={(v) => set("cel")(v.replace(/\D/g, "").slice(0, 10))} error={err.cel} />
        <ErrorBox>{err.form}</ErrorBox>
        <button className={BTN} disabled={busy}>{busy ? "Creando…" : "Crear mi cuenta"}</button>
      </div>
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
    try { await resetPassword(email); } catch (ex) {
      if (ex.code !== "auth/user-not-found") return setErr(friendlyError(ex)); // por privacidad no revelamos si existe
    }
    setOk(true);
  };
  return (
    <form onSubmit={submit} noValidate>
      <Back onClick={() => go("login")} />
      <Title sub={ok ? "Si el correo tiene una cuenta, recibirás un enlace para crear una contraseña nueva. El enlace caduca en poco tiempo." : "Escribe tu correo y te enviaremos un enlace."}>Recuperar contraseña</Title>
      {ok ? <button type="button" className={BTN} onClick={() => go("login")}>Volver a iniciar sesión</button> : (
        <div className="space-y-4">
          <Field label="Correo electrónico" type="email" value={email} onChange={(v) => { setEmail(v); setErr(""); }} error={err} />
          <button className={BTN}>Enviar enlace</button>
        </div>
      )}
    </form>
  );
}

function Done({ ctx, role, finish }) {
  const guest = ctx.role === "invitado";
  const neg = role === "negocio" && !guest;
  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-brand-mintLight text-4xl font-extrabold text-brand-mint" aria-hidden="true">✓</div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-charcoal">{guest ? "Explora sin cuenta" : ctx.registered ? "¡Listo!" : "¡Hola de nuevo!"}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {guest ? "Puedes ver negocios y productos. Para pedir, inicia sesión."
          : ctx.registered ? "Tu cuenta ha sido creada."
          : neg ? "Entrando a tu panel de negocio." : "Entrando a tu inicio."}
      </p>
      {neg && ctx.registered && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Tu negocio está en revisión. Mientras tanto, ya puedes configurar tu tienda.</p>}
      <button className={`${BTN} mt-7`} onClick={() => finish(guest ? "invitado" : role, ctx.profile || {})}>
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
    <div className="mv-root min-h-screen bg-gradient-to-br from-orange-100 via-brand-surface to-emerald-100 bg-fixed text-brand-charcoal">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1fr_460px]">
        {/* Panel de marca */}
        <aside className="hidden lg:block">
          <Logo />
          <h2 className="mt-10 font-display text-5xl font-extrabold leading-[1.05] tracking-tight">Pide directo a los <span className="text-brand-coral">negocios que te encantan</span></h2>
          <p className="mt-5 max-w-md text-lg text-gray-600">Cocinas y tiendas independientes, sin intermediarios. Paga en efectivo al recibir.</p>
          <ul className="mt-8 space-y-3 text-sm font-semibold text-gray-700">
            {["Pedidos con seguimiento en tiempo real", "Personaliza tu platillo a tu gusto", "El 100% de tu compra va al local"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-coral text-xs text-white">✓</span>{t}</li>
            ))}
          </ul>
        </aside>

        {/* Tarjeta de cristal */}
        <main className="rounded-[32px] border border-white/80 bg-white/70 p-7 shadow-[0_24px_60px_-12px_rgba(20,20,22,0.25),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:p-9">
          {screen === "welcome" && <Welcome go={go} />}
          {screen === "login" && <Login go={go} role={role} setRole={setRole} />}
          {screen === "role" && <Role go={go} setRole={setRole} />}
          {(screen === "regCliente" || screen === "regNegocio") && <Register go={go} role={role} setRole={setRole} />}
          {screen === "phone" && <Phone go={go} role={role} setRole={setRole} />}
          {screen === "complete" && <Complete go={go} ctx={ctx} role={role} setRole={setRole} />}
          {screen === "forgot" && <Forgot go={go} />}
          {screen === "done" && <Done ctx={ctx} role={role} finish={onAuth} />}
        </main>
      </div>
    </div>
  );
}