import React, { useState, useEffect, useRef } from 'react';

/* Reloj que se actualiza cada segundo (para las cuentas regresivas) */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export const fmtLeft = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
export const fmtHour = (ms) => new Date(ms).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const short = (id) => id.slice(0, 6).toUpperCase();

const C = { coral: '#FF5A36', ink: '#141416', mint: '#10B981', amber: '#F59E0B', line: '#e5e7eb', mute: '#6b7280' };
const card = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, boxShadow: '0 4px 18px -6px rgba(20,20,22,.12)' };
const btn = (bg = '#fff', fg = C.ink, border = C.line) => ({ background: bg, color: fg, border: `1px solid ${border}`, borderRadius: 12, padding: '9px 14px', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' });

function Items({ order }) {
  return (
    <div style={{ marginTop: 10 }}>
      {order.items.map((it, i) => (
        <div key={(it.key || it.id) + i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, padding: '3px 0' }}>
          <span>
            {it.quantity} × {it.name}
            {it.detalle?.length > 0 && <small style={{ display: 'block', color: C.mute }}>{it.detalle.join(' · ')}</small>}
            {it.nota && <small style={{ display: 'block', color: C.mute, fontStyle: 'italic' }}>“{it.nota}”</small>}
          </span>
          <strong>{money(it.price * it.quantity)}</strong>
        </div>
      ))}
    </div>
  );
}

function Head({ order, badge, badgeBg }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong style={{ fontSize: 16 }}>Pedido #{short(order.id)}</strong>
        <span style={{ background: badgeBg, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 99 }}>{badge}</span>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: C.mute }}>
        {order.clienteNombre} · {order.recoger ? 'Recoger en local' : 'Entrega a domicilio'}
        {order.clienteCel ? ` · ${order.clienteCel}` : ''}
      </p>
      {!order.recoger && order.direccion && <p style={{ margin: '2px 0 0', fontSize: 13, color: C.mute }}>Entregar en: {order.direccion}</p>}
    </>
  );
}

/**
 * Panel de pedidos del negocio, organizado por estado.
 * Props: orders, autoPedidos, prepBaseMin, onToggleAuto, onSaveBase,
 *        onAccept(order) [manual], onExtend(order,min), onFinishing(order), onFinish(order), onDeliver(order), onCancel(order),
 *        autoFailed (ids que no se aceptaron solos), notice
 */
export default function OrdersBoard({ orders, autoPedidos, autoTotal = false, cloud = false, onToggleTotal, prepBaseMin, onToggleAuto, onSaveBase, onAccept, onExtend, onFinishing, onFinish, onDeliver, onCancel, autoFailed = [] }) {
  const now = useNow();
  const [base, setBase] = useState(String(prepBaseMin || 15));
  const [showHist, setShowHist] = useState(false);
  const asked = useRef(new Set());
  useEffect(() => setBase(String(prepBaseMin || 15)), [prepBaseMin]);

  const pend = orders.filter((o) => o.estado === 0);
  const prep = orders.filter((o) => o.estado === 1).sort((a, b) => (a.listoMs || 0) - (b.listoMs || 0));
  const ready = orders.filter((o) => o.estado === 2);
  const hist = orders.filter((o) => o.estado >= 3).slice(0, 10);

  // Paso 9: cuando se cumple el tiempo, avisar al negocio ("programado para finalizar")
  useEffect(() => {
    prep.forEach((o) => {
      if (!autoTotal && !cloud && o.listoMs && o.listoMs <= now && !o.porFinalizar && !asked.current.has(o.id)) {
        asked.current.add(o.id);
        onFinishing?.(o);
        try { if (window.Notification?.permission === 'granted') new Notification('Pedido por finalizar', { body: `El pedido #${short(o.id)} ya cumplió su tiempo estimado.` }); } catch { /* sin permiso */ }
      }
    });
  }, [now, orders]);

  const askPermission = () => { try { window.Notification?.requestPermission(); } catch { /* ignorar */ } };

  return (
    <div>
      {/* Configuración */}
      <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <label style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', maxWidth: 520 }}>
          <input type="checkbox" checked={autoPedidos} onChange={(e) => onToggleAuto(e.target.checked)} style={{ width: 22, height: 22 }} />
          <span>
            <strong>Aceptar pedidos automáticamente</strong>
            <small style={{ display: 'block', color: C.mute }}>Si el negocio está abierto y hay existencias, el pedido pasa solo a «En preparación». Si no, se cancela con el motivo o espera tu decisión.</small>
          </span>
        </label>
        <label style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', maxWidth: 520, opacity: autoPedidos ? 1 : 0.5 }}>
          <input type="checkbox" checked={autoTotal} disabled={!autoPedidos} onChange={(e) => onToggleTotal(e.target.checked)} style={{ width: 22, height: 22 }} />
          <span>
            <strong>Modo automático completo</strong>
            <small style={{ display: 'block', color: C.mute }}>Al cumplirse el tiempo el pedido pasa solo a «Listos» y avisa al cliente; 30 min después se cierra como entregado. Si el negocio está cerrado, el pedido se cancela con aviso. Tú solo puedes agregar retrasos o cancelar.</small>
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: C.mute }}>Tiempo base de preparación (min)
            <input type="number" min="1" max="180" value={base} onChange={(e) => setBase(e.target.value)} style={{ display: 'block', marginTop: 4, width: 110, border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 10px', font: 'inherit' }} />
          </label>
          <button type="button" style={{ ...btn(C.ink, '#fff', C.ink), marginTop: 18 }} onClick={() => onSaveBase(Number(base))}>Guardar</button>
          {typeof window !== 'undefined' && window.Notification && window.Notification.permission === 'default' && (
            <button type="button" style={{ ...btn(), marginTop: 18 }} onClick={askPermission}>🔔 Activar avisos</button>
          )}
        </div>
      </div>

      {/* Por aceptar (solo si hay: modo manual o pedidos que no se pudieron aceptar solos) */}
      {pend.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800 }}>Por aceptar ({pend.length})</h3>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
            {pend.map((o) => {
              const waitingAuto = autoPedidos && !autoFailed.includes(o.id);
              return (
                <div key={o.id} style={{ ...card, borderColor: C.amber }}>
                  <Head order={o} badge={waitingAuto ? 'Validando…' : 'Esperando aceptación'} badgeBg="#FEF3C7" />
                  <Items order={o} />
                  {autoFailed.includes(o.id) && <p style={{ color: '#B45309', fontSize: 13, margin: '8px 0 0' }}>No se aceptó solo (revisa que el negocio esté abierto). Decide tú.</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {!waitingAuto && <button type="button" style={btn(C.coral, '#fff', C.coral)} onClick={() => onAccept(o)}>Aceptar y preparar</button>}
                    <button type="button" style={btn()} onClick={() => onCancel(o)}>Cancelar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Dos columnas por estado */}
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', alignItems: 'start' }}>
        <section>
          <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800 }}>En preparación ({prep.length})</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {prep.length === 0 && <div style={{ ...card, color: C.mute, fontSize: 14 }}>Sin pedidos en preparación.</div>}
            {prep.map((o) => {
              const left = (o.listoMs || now) - now;
              const due = o.listoMs && left <= 0;
              return (
                <div key={o.id} style={{ ...card, borderColor: due ? C.amber : C.line, background: due ? '#FFFBEB' : '#fff' }}>
                  <Head order={o} badge={due ? 'Programado para finalizar' : 'En preparación'} badgeBg={due ? '#FDE68A' : '#FFEDD5'} />
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 34, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: due ? '#B45309' : C.ink }}>{due ? '00:00' : fmtLeft(left)}</span>
                    <span style={{ fontSize: 13, color: C.mute }}>
                      {due ? '¡Tiempo cumplido!' : 'restante'}{o.listoMs ? ` · listo ~${fmtHour(o.listoMs)}` : ''}
                      {o.retrasoMin > 0 && ` · +${o.retrasoMin} min de retraso`}
                    </span>
                  </div>
                  <Items order={o} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="button" style={btn(due ? C.mint : C.coral, '#fff', due ? C.mint : C.coral)} onClick={() => onFinish(o)}>Confirmar pedido listo</button>
                    <span style={{ fontSize: 12, color: C.mute }}>Retraso:</span>
                    {[5, 10, 15].map((m) => <button key={m} type="button" style={btn()} onClick={() => onExtend(o, m)}>+{m} min</button>)}
                    <button type="button" style={{ ...btn(), marginLeft: 'auto', color: '#b91c1c' }} onClick={() => onCancel(o)}>Cancelar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800 }}>Listos ({ready.length})</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {ready.length === 0 && <div style={{ ...card, color: C.mute, fontSize: 14 }}>Aún no hay pedidos listos.</div>}
            {ready.map((o) => (
              <div key={o.id} style={{ ...card, borderColor: C.mint }}>
                <Head order={o} badge="Listo" badgeBg="#D1FAE5" />
                <Items order={o} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <strong>{money(o.total)}</strong>
                  <button type="button" style={btn(C.ink, '#fff', C.ink)} onClick={() => onDeliver(o)}>{o.recoger ? 'Marcar como recogido' : 'Confirmar entrega'}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Historial */}
      {hist.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <button type="button" style={btn()} onClick={() => setShowHist((v) => !v)}>{showHist ? 'Ocultar' : 'Ver'} historial reciente ({hist.length})</button>
          {showHist && (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {hist.map((o) => (
                <div key={o.id} style={{ ...card, padding: 12, opacity: 0.85 }}>
                  <Head order={o} badge={o.estado === 4 ? 'Cancelado' : 'Entregado'} badgeBg={o.estado === 4 ? '#FEE2E2' : '#E5E7EB'} />
                  {o.estado === 4 && o.motivo && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#b91c1c' }}>Motivo: {o.motivo}{o.cancelPor === 'sistema' ? ' (automático)' : ''}</p>}
                  <Items order={o} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}