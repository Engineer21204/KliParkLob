
import { useState } from "react";
import { deleteField } from "firebase/firestore";
import { updateNegocio, friendlyMarketError } from "./marketService";
import { compressImage } from "./productService";

const CATEGORIAS = [
  "Comida", "Bebidas", "Postres"
];

const DIAS = [
  { id: "lunes", nombre: "Lun" },
  { id: "martes", nombre: "Mar" },
  { id: "miercoles", nombre: "Mié" },
  { id: "jueves", nombre: "Jue" },
  { id: "viernes", nombre: "Vie" },
  { id: "sabado", nombre: "Sáb" },
  { id: "domingo", nombre: "Dom" }
];

// Crea un horario inicial sin días habilitados.
function horarioInicial(horario) {
  return Object.fromEntries(
    DIAS.map(({ id }) => {
      const dia = horario && typeof horario === "object"
        ? horario[id]
        : null;

      return [
        id,
        {
          activo: dia?.activo === true,
          apertura: dia?.apertura || "",
          cierre: dia?.cierre || ""
        }
      ];
    })
  );
}

/** Formulario para editar el perfil público del negocio. */
export default function BusinessProfile({ uid, negocio }) {
  const [form, setForm] = useState({
    nombre: negocio.nombre || "",
    categoria: negocio.categoria || "Otro",
    descripcion: negocio.descripcion || "",
    telefono: negocio.telefono || "",
    horario: horarioInicial(negocio.horario),
    umbral: String(negocio.umbral ?? 5),
    logo: negocio.logo || ""
  });

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const set = (k) => (e) =>
    setForm((previous) => ({
      ...previous,
      [k]: e.target.value
    }));

  // Cambiar si un día tiene servicio o no.
  function toggleDia(id) {
    setForm((previous) => ({
      ...previous,
      horario: {
        ...previous.horario,
        [id]: {
          ...previous.horario[id],
          activo: !previous.horario[id].activo
        }
      }
    }));
  }

  // Modificar la apertura o el cierre de un día.
  function cambiarHora(id, campo, valor) {
    setForm((previous) => ({
      ...previous,
      horario: {
        ...previous.horario,
        [id]: {
          ...previous.horario[id],
          [campo]: valor
        }
      }
    }));
  }

  async function pickLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setForm((f) => ({ ...f, logo: "" }));

      const logo = await compressImage(file, 256);

      setForm((f) => ({ ...f, logo }));
      setMsg("");
    } catch (ex) {
      setMsg(ex.message);
      setFileKey((k) => k + 1);
    }
  }

  async function submit(e) {
    e.preventDefault();

    const umbral = Number(form.umbral);

    if (!form.nombre.trim()) {
      return setMsg("Escribe el nombre de tu negocio.");
    }

    if (
      form.telefono &&
      form.telefono.replace(/\D/g, "").length !== 10
    ) {
      return setMsg("El teléfono debe tener 10 dígitos.");
    }

    if (
      !Number.isInteger(umbral) ||
      umbral < 0 ||
      umbral > 999
    ) {
      return setMsg(
        "El aviso de pocas unidades debe ser un número entero entre 0 y 999."
      );
    }

    // Comprobar que los días habilitados tengan un horario válido.
    for (const dia of DIAS) {
      const horarioDia = form.horario[dia.id];

      if (!horarioDia.activo) continue;

      if (!horarioDia.apertura || !horarioDia.cierre) {
        return setMsg(
          `Completa la hora de apertura y cierre de ${dia.nombre}.`
        );
      }

      if (horarioDia.apertura === horarioDia.cierre) {
        return setMsg(
          `La apertura y el cierre de ${dia.nombre} no pueden ser iguales.`
        );
      }
    }

    setBusy(true);
    setMsg("");

    try {
      await updateNegocio(uid, {
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        descripcion: form.descripcion.trim().slice(0, 300),
        telefono: form.telefono.replace(/\D/g, ""),
        horario: form.horario,
        umbral,
        logo: form.logo || deleteField()
      });

      setMsg("Perfil y horarios guardados correctamente.");
    } catch (ex) {
      setMsg(friendlyMarketError(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="panel"
      onSubmit={submit}
      style={{ marginTop: 14 }}
    >
      <h2>Perfil del negocio</h2>

      <p className="muted">
        Esta información aparece en la tarjeta y el menú
        que ven los clientes.
      </p>

      <label className="field">
        Nombre del negocio
        <input
          required
          maxLength={100}
          value={form.nombre}
          onChange={set("nombre")}
        />
      </label>

      <label className="field">
        Categoría
        <select
          value={form.categoria}
          onChange={set("categoria")}
        >
          {CATEGORIAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className="field">
        Descripción (máx. 300 caracteres)
        <textarea
          maxLength={300}
          rows={3}
          value={form.descripcion}
          onChange={set("descripcion")}
          placeholder="Cuenta qué hace especial a tu negocio."
        />
      </label>

      <label className="field">
        Teléfono de contacto
        <input
          type="tel"
          inputMode="numeric"
          value={form.telefono}
          onChange={set("telefono")}
          placeholder="10 dígitos"
        />
      </label>

      {/* CONFIGURACIÓN DE HORARIOS */}
      <div className="schedule-section">
        <h2>Horario de atención</h2>

        <p className="muted">
          Selecciona los días en que tu negocio ofrece
          servicio y establece sus horarios.
        </p>

        <div className="schedule-list">
          {DIAS.map(({ id, nombre }) => {
            const dia = form.horario[id];

            return (
              <div className="schedule-day" key={id}>
                <div className="schedule-day-header">
                  <label className="schedule-toggle">
                    <input
                      type="checkbox"
                      checked={dia.activo}
                      onChange={() => toggleDia(id)}
                    />
                    <strong>{nombre}</strong>
                  </label>

                  <span className={`schedule-status ${
                    dia.activo ? "active" : "inactive"
                  }`}>
                    {dia.activo ? "Con servicio" : "Descanso"}
                  </span>
                </div>

                {dia.activo && (
                  <div className="schedule-hours">
                    <label className="field">
                      Apertura
                      <input
                        type="time"
                        required
                        value={dia.apertura}
                        onChange={(e) =>
                          cambiarHora(id, "apertura", e.target.value)
                        }
                      />
                    </label>

                    <span className="schedule-separator">
                      hasta
                    </span>

                    <label className="field">
                      Cierre
                      <input
                        type="time"
                        required
                        value={dia.cierre}
                        onChange={(e) =>
                          cambiarHora(id, "cierre", e.target.value)
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="muted schedule-help">
          Los horarios se utilizarán para determinar
          automáticamente si tu negocio está abierto,
          próximo a abrir o próximo a cerrar.
        </p>
      </div>

      <label className="field">
        Avisar cuando queden esta cantidad de unidades o menos
        <input
          type="number"
          min="0"
          max="999"
          step="1"
          value={form.umbral}
          onChange={set("umbral")}
        />
      </label>

      <label className="field">
        Logo (opcional)
        <input
          key={fileKey}
          type="file"
          accept="image/*"
          onChange={pickLogo}
        />
      </label>

      {form.logo && (
        <div className="prod-preview">
          <img src={form.logo} alt="Vista previa del logo" />

          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setForm((f) => ({ ...f, logo: "" }));
              setFileKey((k) => k + 1);
            }}
          >
            Quitar logo
          </button>
        </div>
      )}

      <button
        type="submit"
        className="primary"
        disabled={busy}
      >
        {busy ? "Guardando…" : "Guardar perfil"}
      </button>

      <p
        className="muted"
        aria-live="polite"
        style={{ marginTop: 12 }}
      >
        {msg}
      </p>
    </form>
  );
}
