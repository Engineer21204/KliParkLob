import React from 'react';

/* Editor de opciones de un producto (para el negocio).
   Uso:  <ProductOptionsEditor value={opciones} onChange={setOpciones} />
   Al guardar el producto usa:  opciones: cleanOptions(opciones)  */

const uid = () => Math.random().toString(36).slice(2, 8);

export const OPTION_TEMPLATES = [
  { titulo: 'Tamaño', tipo: 'una', obligatorio: true, quitar: false, items: [{ nombre: 'Chico', extra: 0 }, { nombre: 'Grande', extra: 20 }] },
  { titulo: 'Quitar ingredientes', tipo: 'multi', obligatorio: false, quitar: true, items: [{ nombre: 'cebolla', extra: 0 }] },
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

const box = { border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, marginTop: 12, background: '#fff' };
const input = { border: '1px solid #d1d5db', borderRadius: 10, padding: '8px 10px', font: 'inherit', fontSize: 14, background: '#fff', color: '#141416', minWidth: 0 };
const btn = { border: '1px solid #d1d5db', borderRadius: 10, padding: '7px 12px', font: 'inherit', fontSize: 13, fontWeight: 600, background: '#fff', color: '#141416', cursor: 'pointer' };

export default function ProductOptionsEditor({ value = [], onChange }) {
  const list = value || [];
  const set = next => onChange(next);
  const patch = (gi, p) => set(list.map((g, i) => (i === gi ? { ...g, ...p } : g)));
  const patchItem = (gi, ii, p) => patch(gi, { items: list[gi].items.map((it, i) => (i === ii ? { ...it, ...p } : it)) });
  const addGroup = t => set([...list, { ...t, id: uid(), items: t.items.map(i => ({ ...i })) }]);

  return (
    <div style={{ marginTop: 16 }}>
      <strong style={{ fontSize: 15 }}>Opciones del producto</strong>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
        Deja que el cliente elija tamaño, quite ingredientes o agregue extras. Si no agregas nada, el producto se vende normal.
      </p>

      {list.map((g, gi) => (
        <div key={g.id} style={box}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input style={{ ...input, flex: '1 1 160px', fontWeight: 700 }} value={g.titulo} placeholder="Título (ej. Tamaño)" onChange={e => patch(gi, { titulo: e.target.value })} />
            <select style={input} value={g.tipo} onChange={e => patch(gi, { tipo: e.target.value })}>
              <option value="una">Elige una</option>
              <option value="multi">Elige varias</option>
            </select>
            <button type="button" style={{ ...btn, color: '#b91c1c' }} onClick={() => set(list.filter((_, i) => i !== gi))}>Quitar grupo</button>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 13 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={g.obligatorio} onChange={e => patch(gi, { obligatorio: e.target.checked })} /> Obligatorio
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={!!g.quitar} onChange={e => patch(gi, { quitar: e.target.checked, tipo: e.target.checked ? 'multi' : g.tipo })} /> Son ingredientes que se pueden quitar (sin costo)
            </label>
          </div>

          {g.items.map((it, ii) => (
            <div key={ii} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <input style={{ ...input, flex: 1 }} value={it.nombre} placeholder={g.quitar ? 'Ingrediente (ej. cebolla)' : 'Nombre (ej. Queso extra)'} onChange={e => patchItem(gi, ii, { nombre: e.target.value })} />
              {!g.quitar && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6b7280' }}>
                  +$<input style={{ ...input, width: 70 }} type="number" min="0" value={it.extra} onChange={e => patchItem(gi, ii, { extra: e.target.value })} />
                </label>
              )}
              <button type="button" aria-label="Quitar" style={btn} onClick={() => patch(gi, { items: g.items.filter((_, i) => i !== ii) })}>✕</button>
            </div>
          ))}
          <button type="button" style={{ ...btn, marginTop: 10 }} onClick={() => patch(gi, { items: [...g.items, { nombre: '', extra: 0 }] })}>+ Agregar opción</button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {OPTION_TEMPLATES.map(t => (
          <button key={t.titulo} type="button" style={btn} onClick={() => addGroup(t)}>+ {t.titulo}</button>
        ))}
      </div>
    </div>
  );
}