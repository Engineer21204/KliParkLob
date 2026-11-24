import React from 'react';

/* Editor de opciones de un producto (para el negocio).
   Uso:  <ProductOptionsEditor value={opciones} onChange={setOpciones} />
   Al guardar el producto usa:  opciones: cleanOptions(opciones)  */

const uid = () => Math.random().toString(36).slice(2, 8);

export const OPTION_TEMPLATES = [
  { titulo: 'Tamaño', tipo: 'una', obligatorio: true, quitar: false, items: [{ nombre: 'Chico', extra: 0 }, { nombre: 'Grande', extra: 20 }] },
  { titulo: 'Quitar ingredientes', tipo: 'multi', obligatorio: false, quitar: true, items: [{ nombre: '', extra: 0 }] },
  { titulo: 'Agregar extras', tipo: 'multi', obligatorio: false, quitar: false, items: [{ nombre: 'Extra', extra: 15 }] },
  { titulo: 'Opciones', tipo: 'una', obligatorio: false, quitar: false, items: [{ nombre: 'Opción 1', extra: 0 }] },
];

/* Limpia antes de guardar en Firestore (sin undefined, sin vacíos) */
export function cleanOptions(list) {
  return (list || [])
    .map(g => ({
      id: g.id || uid(),
      titulo: String(g.titulo || '').trim(),
      tipo: g.tipo === 'una' ? 'una' : 'multi',
      obligatorio: !!g.obligatorio,
      quitar: !!g.quitar,
      items: (g.items || [])
        .map(i => ({ nombre: String(i.nombre || '').trim(), extra: g.quitar ? 0 : Math.max(0, Number(i.extra) || 0) }))
        .filter(i => i.nombre),
    }))
    .filter(g => g.titulo && g.items.length);
}

const field = 'rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm font-medium text-brand-charcoal outline-none transition focus:border-brand-coral min-w-0';
const chip = 'rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-xs font-bold text-brand-charcoal transition hover:border-brand-coral/50';

export default function ProductOptionsEditor({ value = [], onChange }) {
  const list = value || [];
  const set = next => onChange(next);
  const patch = (gi, p) => set(list.map((g, i) => (i === gi ? { ...g, ...p } : g)));
  const patchItem = (gi, ii, p) => patch(gi, { items: list[gi].items.map((it, i) => (i === ii ? { ...it, ...p } : it)) });
  const addGroup = t => set([...list, { ...t, id: uid(), items: t.items.map(i => ({ ...i })) }]);

  return (
    <div className="rounded-[22px] border-2 border-dashed border-gray-200 bg-gray-50/60 p-4">
      <p className="font-display text-base font-extrabold text-brand-charcoal">Opciones del producto</p>
      <p className="mt-1 text-xs text-gray-500">Deja que el cliente elija tamaño, quite ingredientes o agregue extras. Si no agregas nada, el producto se vende normal.</p>

      {list.map((g, gi) => (
        <div key={g.id} className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${field} flex-1 basis-40 font-bold`} value={g.titulo} placeholder="Título (ej. Tamaño)" onChange={e => patch(gi, { titulo: e.target.value })} />
            <select className={field} value={g.tipo} onChange={e => patch(gi, { tipo: e.target.value })}>
              <option value="una">Elige una</option>
              <option value="multi">Elige varias</option>
            </select>
            <button type="button" className="rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50" onClick={() => set(list.filter((_, i) => i !== gi))}>Quitar grupo</button>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-gray-600">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#FF5A36]" checked={g.obligatorio} onChange={e => patch(gi, { obligatorio: e.target.checked })} /> Obligatorio</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#FF5A36]" checked={!!g.quitar} onChange={e => patch(gi, { quitar: e.target.checked, tipo: e.target.checked ? 'multi' : g.tipo })} /> Ingredientes que se pueden quitar (sin costo)</label>
          </div>

          {g.items.map((it, ii) => (
            <div key={ii} className="mt-2 flex items-center gap-2">
              <input className={`${field} flex-1`} value={it.nombre} placeholder={g.quitar ? 'Ingrediente (ej. cebolla)' : 'Nombre (ej. Queso extra)'} onChange={e => patchItem(gi, ii, { nombre: e.target.value })} />
              {!g.quitar && (
                <label className="flex items-center gap-1 text-xs font-bold text-gray-500">+$
                  <input className={`${field} w-20`} type="number" min="0" value={it.extra} onChange={e => patchItem(gi, ii, { extra: e.target.value })} />
                </label>
              )}
              <button type="button" aria-label="Quitar opción" className="h-9 w-9 shrink-0 rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-600" onClick={() => patch(gi, { items: g.items.filter((_, i) => i !== ii) })}>✕</button>
            </div>
          ))}
          <button type="button" className={`${chip} mt-3`} onClick={() => patch(gi, { items: [...g.items, { nombre: '', extra: 0 }] })}>+ Agregar opción</button>
        </div>
      ))}

      <div className="mt-4 flex flex-wrap gap-2">
        {OPTION_TEMPLATES.map(t => <button key={t.titulo} type="button" className={chip} onClick={() => addGroup(t)}>+ {t.titulo}</button>)}
      </div>
    </div>
  );
}