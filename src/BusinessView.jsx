import React from 'react';
import { Store, Package, Utensils, ArrowRight } from './Icons';

const money = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
const fmtHour = ms => new Date(ms).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
const STATUS = ['Esperando', 'En preparación', 'Listo', 'Entregado', 'Cancelado'];

export function BizTopBar({ nav, page, onNav, name, initials, open, onToggleOpen, onLogout }) {
  return (
    <header className="mv-root sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto w-full max-w-[1800px] rounded-[28px] border border-white/70 bg-white/70 shadow-[0_8px_32px_rgba(20,20,22,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150">
        <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-coral to-orange-500 text-white shadow-md">
              <Store aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="hidden flex-col sm:flex">
              <span className="font-display text-xl font-extrabold leading-none tracking-tight text-brand-charcoal">Klipark<span className="text-brand-coral">Lob</span></span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Panel del negocio</span>
            </span>
          </div>

          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl border border-white/70 bg-white/50 p-1 backdrop-blur" aria-label="Navegación del negocio">
            {nav.map(({ label, Icon, badge }) => {
              const on = page === label;
              return (
                <button key={label} type="button" aria-current={on ? 'page' : undefined} onClick={() => onNav(label)}
                  className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${on ? 'bg-brand-charcoal text-white shadow' : 'text-gray-600 hover:bg-white/80'}`}>
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <span className="hidden md:inline">{label}</span>
                  {badge > 0 && <span className="rounded-full bg-brand-coral px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">{badge}</span>}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            <button type="button" onClick={onToggleOpen} aria-pressed={open}
              className={`hidden items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-bold backdrop-blur transition sm:flex ${open ? 'border-emerald-200/70 bg-emerald-100/70 text-emerald-800' : 'border-gray-300 bg-gray-200/70 text-gray-600'}`}>
              <span className={`h-2 w-2 rounded-full ${open ? 'bg-brand-mint' : 'bg-gray-400'}`} />
              {open ? 'Abierto · Pausar' : 'Pausado · Abrir'}
            </button>
            <span className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/50 px-3 py-2 backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-charcoal font-display text-xs font-bold text-white">{initials}</span>
              <span className="hidden max-w-[130px] truncate text-xs font-bold text-brand-charcoal xl:inline">{name}</span>
            </span>
            <button type="button" onClick={onLogout} className="text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-brand-coral">Cerrar sesión</button>
          </div>
        </div>
      </div>
    </header>
  );
}

const Stat = ({ label, value, hint, tone }) => (
  <div className="rounded-[24px] border border-white/80 bg-white/80 p-6 shadow-[0_4px_20px_-2px_rgba(20,20,22,0.08)] backdrop-blur">
    <span className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${tone}`}>{label}</span>
    <p className="mt-3 font-display text-4xl font-extrabold text-brand-charcoal">{value}</p>
    <p className="mt-1 text-sm text-gray-500">{hint}</p>
  </div>
);

const Panel = ({ children, className = '' }) => (
  <section className={`rounded-[24px] border border-white/80 bg-white/80 p-6 shadow-[0_4px_20px_-2px_rgba(20,20,22,0.08)] backdrop-blur ${className}`}>{children}</section>
);

export function BizSummary({ name, open, sales, doneCount, pendingCount, totalCount, active, products, low, auto, total, onGo, onToggleOpen }) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-charcoal sm:text-4xl">{hello}, {name}.</h1>
          <p className="mt-1 text-sm text-gray-500">Tus pedidos y tu operación, en un solo lugar.</p>
        </div>
        <button type="button" onClick={onToggleOpen} className={`rounded-2xl px-5 py-3 text-sm font-bold shadow-lg transition active:scale-95 ${open ? 'bg-brand-mint text-white' : 'bg-brand-charcoal text-white'}`}>
          {open ? '● Estás abierto · Pausar pedidos' : '● Estás en pausa · Abrir negocio'}
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Stat label="Ventas completadas" value={money(sales)} hint={`${doneCount} pedidos entregados`} tone="bg-brand-mintLight text-emerald-700" />
        <Stat label="Por atender" value={pendingCount} hint="Pedidos en curso ahora" tone="bg-brand-coralLight text-brand-coral" />
        <Stat label="Pedidos totales" value={totalCount} hint="Desde que abriste" tone="bg-gray-100 text-gray-600" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-extrabold text-brand-charcoal">Pedidos activos</h2>
            <button type="button" onClick={() => onGo('Pedidos')} className="inline-flex items-center gap-2 rounded-2xl bg-brand-coral px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_-6px_rgba(255,90,54,0.45)] transition hover:bg-brand-coralDark active:scale-95">
              Gestionar pedidos <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          {active.length === 0 ? (
            <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-300 py-10 text-center">
              <Package aria-hidden="true" className="h-8 w-8 text-gray-400" />
              <p className="font-bold text-brand-charcoal">Sin pedidos por ahora</p>
              <p className="text-sm text-gray-500">Los nuevos pedidos de tus clientes aparecerán aquí al instante.</p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {active.slice(0, 4).map(o => (
                <li key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-brand-charcoal">Pedido #{o.id.slice(0, 6).toUpperCase()} · {o.clienteNombre}</p>
                    <p className="truncate text-sm text-gray-500">{o.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${o.estado === 2 ? 'bg-brand-mintLight text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{STATUS[o.estado]}</span>
                    {o.estado === 1 && o.listoMs && <p className="mt-1 text-xs text-gray-500">listo ~{fmtHour(o.listoMs)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel>
            <span className="inline-block rounded-lg bg-brand-coralLight px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-coral">Tu catálogo</span>
            <p className="mt-3 font-display text-3xl font-extrabold text-brand-charcoal">{products === null ? '…' : products.length} <span className="text-base font-bold text-gray-400">productos</span></p>
            {low.length > 0 && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">⚠ Pocas existencias: {low.map(p => `${p.name} (${p.stock})`).join(', ')}</p>}
            <button type="button" onClick={() => onGo('Productos')} className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-charcoal transition hover:border-brand-coral/50">
              <Utensils aria-hidden="true" className="h-4 w-4 text-brand-coral" /> Administrar productos
            </button>
          </Panel>
          <Panel>
            <h3 className="font-display text-base font-extrabold text-brand-charcoal">Automatización</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between"><span className="text-gray-500">Aceptar pedidos solo</span><b className={auto ? 'text-emerald-600' : 'text-gray-400'}>{auto ? 'Activado' : 'Desactivado'}</b></li>
              <li className="flex items-center justify-between"><span className="text-gray-500">Modo automático completo</span><b className={total ? 'text-emerald-600' : 'text-gray-400'}>{total ? 'Activado' : 'Desactivado'}</b></li>
            </ul>
            <button type="button" onClick={() => onGo('Pedidos')} className="mt-3 text-xs font-bold text-brand-coral underline underline-offset-2">Cambiar en Pedidos</button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function BizConfirm({ order, onNo, onYes }) {
  if (!order) return null;
  return (
    <div className="mv-root fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={onNo}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl">
        <h2 className="font-display text-2xl font-extrabold text-brand-charcoal">¿Cancelar este pedido?</h2>
        <p className="mt-2 text-sm text-gray-500">El cliente verá que el pedido fue cancelado.{order.estado >= 1 ? ' Las existencias descontadas se devolverán al inventario.' : ''}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" autoFocus onClick={onNo} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-brand-charcoal">No, conservar</button>
          <button type="button" onClick={onYes} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white">Sí, cancelar pedido</button>
        </div>
      </div>
    </div>
  );
}