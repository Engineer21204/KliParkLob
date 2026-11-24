import React, { useState, useEffect, useRef } from 'react';
import { useNow, fmtHour } from './OrdersBoard';
import { Utensils, Coffee, CakeSlice, Grid2X2, Search, MapPin, ArrowRight, Bike, Store, ShoppingBag, User, Package } from './Icons';

// Bloqueo del scroll con contador: varias ventanas abiertas a la vez no se pisan al cerrarse
let scrollLocks = 0;
function lockScroll() {
  scrollLocks += 1;
  document.body.style.overflow = 'hidden';
  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.style.overflow = '';
  };
}

const money2 = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
const money = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

const DAYS = [['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'], ['jueves', 'Jueves'], ['viernes', 'Viernes'], ['sabado', 'Sábado'], ['domingo', 'Domingo']];

const CATEGORIES = [
  ['Todo', Grid2X2],
  ['Comida', Utensils],
  ['Bebidas', Coffee],
  ['Postres', CakeSlice],
];

/* ---------- Barra de categorías ---------- */
export function CategoryBar({ category, onCategory, onlyOpen = false, onToggleOpen }) {
  return (
    <div className="bg-white p-3 rounded-[24px] border border-gray-200 shadow-[0_4px_20px_-2px_rgba(20,20,22,0.06)] flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        {CATEGORIES.map(([label, Icon]) => {
          const active = category === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onCategory(label)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition active:scale-95 ${
                active ? 'bg-brand-charcoal text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Icon aria-hidden="true" className={`w-4 h-4 ${active ? 'text-brand-coral' : 'text-gray-500'}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {onToggleOpen && (
        <button
          type="button"
          onClick={onToggleOpen}
          aria-pressed={onlyOpen}
          className={`hidden sm:flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition active:scale-95 ${
            onlyOpen ? 'bg-brand-mintLight border-brand-mint text-emerald-800' : 'border-gray-200 hover:border-brand-mint text-gray-600'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${onlyOpen ? 'bg-brand-mint' : 'bg-gray-300'}`} />
          <span>Abierto ahora</span>
        </button>
      )}
    </div>
  );
}

/* ---------- Tarjeta de local ---------- */
export function StoreCard({ store, onOpen, highlight = false }) {
  const Icon = store.Icon || Store;
  const glass = 'backdrop-blur-md border border-white/30';
  return (
    <article
      onClick={() => onOpen(store.id)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen(store.id)}
      tabIndex={0}
      role="button"
      className="group relative h-[340px] cursor-pointer overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-coral to-orange-400 shadow-[0_10px_30px_-8px_rgba(20,20,22,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-10px_rgba(20,20,22,0.4)] focus-visible:outline-2 focus-visible:outline-brand-coral"
    >
      {/* Foto a toda la tarjeta */}
      {store.image
        ? <img src={store.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
        : <div className="absolute inset-0 grid place-items-center text-white/90"><Icon aria-hidden="true" className="h-16 w-16" /></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />

      {/* Etiquetas de cristal */}
      <span className={`absolute left-3.5 top-3.5 rounded-full px-3 py-1 text-[11px] font-extrabold text-white ${glass} ${store.open ? 'bg-emerald-500/60' : 'bg-black/40'}`}>
        {store.open ? '● Abierto' : 'Cerrado temporalmente'}
      </span>
      {highlight && (
        <span className={`absolute right-3.5 top-3.5 rounded-full bg-black/35 px-3 py-1 text-xs font-bold text-white ${glass}`}>★ Favorito</span>
      )}

      {/* Panel de cristal: ocupa casi todo el ancho */}
      <div className={`absolute inset-x-2.5 bottom-2.5 rounded-[22px] bg-white/20 p-4 text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl ${'border border-white/40'}`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate font-display text-xl font-extrabold drop-shadow">{store.name}</h3>
          {store.time && <span className="shrink-0 rounded-lg bg-white/25 px-2.5 py-1 text-[11px] font-extrabold">{store.time}</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/85">{store.description}</p>
        <div className="mt-3 flex items-center justify-between border-t border-white/25 pt-3 text-xs font-semibold">
          <span className="rounded-lg bg-white/25 px-2.5 py-1">{store.categoryLabel}</span>
          <span className="inline-flex items-center gap-1.5 text-white/95">
            <Bike aria-hidden="true" className="h-3.5 w-3.5" />Envío {money(store.deliveryFee)}
          </span>
        </div>
      </div>
    </article>
  );
}

/* ---------- Carrusel de platillos (se desliza solo) ---------- */
function DishCarousel({ dishes, onOpen }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = dishes.length;
  const idx = ((i % n) + n) % n;
  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setI(v => v + 1), 4000);
    return () => clearInterval(t);
  }, [n, paused]);
  const d = dishes[idx];

  return (
    <div
      className="group relative min-h-[300px] overflow-hidden rounded-[28px] bg-brand-charcoal text-white shadow-[0_18px_40px_-14px_rgba(20,20,22,0.5)] lg:col-span-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {dishes.map((x, k) => (
        <img key={x.id} src={x.image} alt={x.name} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${k === idx ? 'opacity-100' : 'opacity-0'}`} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25" />

      <span className="absolute left-5 top-5 rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-bold backdrop-blur-md">🔥 Platillos destacados</span>

      {/* Panel de cristal con el platillo actual */}
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-4 rounded-[22px] border border-white/35 bg-white/15 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:inset-x-5 sm:bottom-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-white/80">{d.storeName}{!d.open && ' · Cerrado'}</p>
          <h1 className="mt-1 truncate font-display text-2xl font-extrabold leading-tight sm:text-4xl">{d.name}</h1>
          {d.description && <p className="mt-1 line-clamp-1 text-sm text-white/85">{d.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="font-display text-2xl font-extrabold sm:text-3xl">{money2(d.price)}</span>
          <button type="button" onClick={() => onOpen(d.storeId)} className="inline-flex items-center gap-2 rounded-2xl bg-brand-coral px-5 py-3 font-display text-sm font-bold text-white shadow-[0_12px_28px_-6px_rgba(255,90,54,0.6)] transition hover:bg-brand-coralDark active:scale-95">
            Pedir ahora <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {n > 1 && (
        <>
          <button type="button" aria-label="Anterior" onClick={() => setI(idx - 1)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-xl backdrop-blur-md transition hover:bg-black/50 sm:opacity-0 sm:group-hover:opacity-100">‹</button>
          <button type="button" aria-label="Siguiente" onClick={() => setI(idx + 1)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-xl backdrop-blur-md transition hover:bg-black/50 sm:opacity-0 sm:group-hover:opacity-100">›</button>
          <div className="absolute right-5 top-6 flex gap-1.5">
            {dishes.map((x, k) => (
              <button key={x.id} type="button" aria-label={`Ir al platillo ${k + 1}`} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === idx ? 'w-7 bg-white' : 'w-3 bg-white/45'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Banners ---------- */
function Banners({ stores, dishes = [], onOpen, onCategory }) {
  const hero = stores.find(s => s.image) || stores[0];
  const treat = stores.find(s => (s.categoryLabel === 'Postres' || s.categoryLabel === 'Bebidas') && s.image && s.id !== hero?.id)
    || stores.find(s => s.image && s.id !== hero?.id);
  const treatCategory = treat?.categoryLabel === 'Bebidas' || treat?.categoryLabel === 'Postres' ? treat.categoryLabel : 'Postres';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {dishes.length > 0 && <DishCarousel dishes={dishes} onOpen={onOpen} />}
      {dishes.length === 0 && <div
        onClick={() => hero && onOpen(hero.id)}
        className={`lg:col-span-8 relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#141416] via-[#232329] to-[#2E2522] text-white p-7 sm:p-9 flex flex-col justify-between min-h-[250px] group ${hero ? 'cursor-pointer' : ''}`}
      >
        {hero?.image && <img src={hero.image} alt="" className="absolute right-0 top-0 h-full w-full sm:w-3/5 object-cover opacity-55 group-hover:scale-105 transition duration-700" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#141416] via-[#141416]/90 to-transparent" />
        <div className="relative z-10 max-w-lg space-y-3">
          <span className="inline-flex px-3 py-1 rounded-full bg-brand-coral/20 border border-brand-coral/40 text-brand-coral text-xs font-bold">🔥 Apoya el comercio local</span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl tracking-tight leading-tight text-white">
            Pide directo a los <span className="text-brand-coral">negocios que te encantan</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md">
            Cocinas y tiendas independientes, sin intermediarios. Paga en efectivo al recibir.
          </p>
        </div>
        {hero && (
          <div className="relative z-10 pt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 bg-brand-coral group-hover:bg-brand-coralDark text-white font-display font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-[0_12px_28px_-6px_rgba(255,90,54,0.5)] transition">
              Explorar {hero.name} <ArrowRight aria-hidden="true" className="w-4 h-4" />
            </span>
            <span className="text-xs text-gray-400 font-medium">• 100% de tu compra va al local</span>
          </div>
        )}
      </div>}

      <div
        onClick={() => onCategory(treatCategory)}
        className="lg:col-span-4 cursor-pointer relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FF5A36] to-[#FF8A47] text-white p-7 flex flex-col justify-between min-h-[250px] group"
      >
        {treat?.image
          ? <img src={treat.image} alt="" className="absolute -right-6 -bottom-6 w-48 h-48 rounded-full object-cover opacity-80 border-4 border-white/25 group-hover:scale-110 transition duration-500" />
          : <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/15 group-hover:scale-110 transition duration-500" />}
        <div className="relative z-10 space-y-2.5">
          <span className="inline-block px-3 py-1 rounded-full bg-black/20 text-[11px] font-bold uppercase tracking-wider">🍰 Antojos de media tarde</span>
          <h2 className="font-display font-extrabold text-2xl leading-snug text-white">
            {treat ? `Descubre ${treat.name}` : 'Postres y bebidas de tu zona'}
          </h2>
          <p className="text-xs text-white/90 font-medium leading-relaxed">Cafeterías y reposterías locales, a un clic.</p>
        </div>
        <span className="relative z-10 inline-flex w-fit items-center gap-1.5 bg-white text-brand-charcoal font-display font-bold text-xs px-4 py-2.5 rounded-xl group-hover:translate-x-1 transition">
          Ver {treatCategory.toLowerCase()} <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 text-brand-coral" />
        </span>
      </div>
    </div>
  );
}

/* ---------- Pantalla Explorar completa ---------- */
export function MarketHome({ stores: allStores, loading, greeting, address, query, onQuery, category, onCategory, onOpen, showSearch = true, dishes = [] }) {
  const [onlyOpen, setOnlyOpen] = useState(false);
  const stores = onlyOpen ? allStores.filter(s => s.open) : allStores;
  const filtering = category !== 'Todo' || query.trim() !== '' || onlyOpen;
  const featured = stores.filter(s => s.featured).length ? stores.filter(s => s.featured) : stores.slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Saludo + buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-brand-charcoal">{greeting}</h2>
          <p className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
            <MapPin aria-hidden="true" className="w-4 h-4 text-brand-coral" />{address}
          </p>
        </div>
        {showSearch && <label className="relative w-full sm:max-w-sm">
          <Search aria-hidden="true" className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            aria-label="Buscar negocios"
            value={query}
            onChange={e => onQuery(e.target.value)}
            placeholder="Busca tu negocio favorito"
            className="w-full bg-white text-sm font-medium pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-brand-coral/50 focus:ring-4 focus:ring-brand-coral/10 focus:outline-none transition"
          />
        </label>}
      </div>

      {!filtering && <Banners stores={allStores} dishes={dishes} onOpen={onOpen} onCategory={onCategory} />}

      <CategoryBar category={category} onCategory={onCategory} onlyOpen={onlyOpen} onToggleOpen={() => setOnlyOpen(o => !o)} />

      {loading && <p className="text-sm text-gray-500">Cargando negocios…</p>}

      {!filtering && featured.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-extrabold text-2xl tracking-tight text-brand-charcoal">Favoritos locales</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-coralLight text-brand-coral text-xs font-extrabold">Top locales</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {featured.map(s => <StoreCard key={s.id} store={s} onOpen={onOpen} highlight />)}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div className={filtering ? '' : 'border-t border-gray-200 pt-8'}>
          <h2 className="font-display font-extrabold text-2xl tracking-tight text-brand-charcoal">
            {filtering ? 'Resultados' : 'Todos los locales cerca de ti'}
          </h2>
          <p className="text-sm text-gray-500">
            {stores.length} {stores.length === 1 ? 'local disponible' : 'locales disponibles'}
          </p>
        </div>

        {!loading && stores.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-gray-200 p-12 text-center space-y-3">
            <h3 className="font-display font-extrabold text-lg text-brand-charcoal">No encontramos locales con esos filtros</h3>
            <p className="text-sm text-gray-500">Prueba con otra búsqueda o categoría.</p>
            <button type="button" onClick={() => { onQuery(''); onCategory('Todo'); setOnlyOpen(false); }} className="mt-2 bg-brand-coral text-white font-display font-bold text-xs px-5 py-2.5 rounded-xl">
              Mostrar todos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {stores.map(s => <StoreCard key={s.id} store={s} onOpen={onOpen} />)}
          </div>
        )}
      </section>
    </div>
  );
}


/* ---------- Barra superior estilo MesaLocal ---------- */
export function TopBar({ address, query, onQuery, onHome, onAddress, onOrders, onProfile, onCart, onLogout, activeOrders = 0, cartCount = 0, initials = 'CL', name = '', guest = false }) {
  return (
    <header className="mv-root sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto w-full max-w-[1800px] rounded-[28px] border border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(20,20,22,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="h-20 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 shrink-0">
          <button type="button" onClick={onHome} className="flex items-center gap-2.5 group text-left">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-coral to-orange-500 text-white flex items-center justify-center shadow-md group-hover:rotate-3 transition">
              <Store aria-hidden="true" className="w-5 h-5" />
            </span>
            <span className="flex flex-col">
              <span className="font-display font-extrabold text-xl tracking-tight leading-none text-brand-charcoal">Klipark<span className="text-brand-coral">Lob</span></span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">Comida local</span>
            </span>
          </button>

          <div className="hidden md:block h-7 w-px bg-gray-300/60" />

          <button type="button" onClick={onAddress} className="hidden md:flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/50 hover:bg-white/80 border border-white/70 backdrop-blur transition text-left max-w-[260px]">
            <span className="w-8 h-8 rounded-xl bg-white text-brand-coral flex items-center justify-center shadow-sm shrink-0">
              <MapPin aria-hidden="true" className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-gray-500">Entregar en</span>
              <span className="block text-xs font-bold text-brand-charcoal truncate">{address}</span>
            </span>
          </button>
        </div>

        <div className="flex-1 max-w-xl hidden sm:block">
          <label className="relative block group">
            <Search aria-hidden="true" className="w-4 h-4 text-gray-400 group-focus-within:text-brand-coral absolute left-4 top-1/2 -translate-y-1/2 transition" />
            <input
              aria-label="Buscar negocios"
              value={query}
              onChange={e => onQuery(e.target.value)}
              placeholder="Buscar restaurantes, cafés o postres..."
              className="w-full bg-white/50 hover:bg-white/70 focus:bg-white border-white/70 backdrop-blur text-sm font-medium pl-11 pr-4 py-3 rounded-2xl border border-transparent focus:border-brand-coral/40 focus:ring-4 focus:ring-brand-coral/10 focus:outline-none transition placeholder:text-gray-400"
            />
          </label>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {!guest && (
            <button type="button" onClick={onOrders} className="hidden lg:flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-100/60 hover:bg-emerald-100/90 text-emerald-800 text-xs font-bold transition border border-emerald-200/70 backdrop-blur">
              {activeOrders > 0 && <span className="w-2 h-2 rounded-full bg-brand-mint animate-ping" />}
              <Package aria-hidden="true" className="w-4 h-4" />
              <span>{activeOrders > 0 ? `${activeOrders} pedido${activeOrders > 1 ? 's' : ''} en curso` : 'Mis pedidos'}</span>
            </button>
          )}

          {!guest && (
            <button type="button" onClick={onProfile} aria-label="Mi perfil" className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-white/80 transition border border-white/70 bg-white/50 backdrop-blur">
              <span className="w-8 h-8 rounded-xl bg-brand-charcoal text-white font-display font-bold text-xs flex items-center justify-center">{initials}</span>
              <span className="hidden xl:inline text-xs font-bold text-brand-charcoal max-w-[90px] truncate">{name}</span>
            </button>
          )}

          <button type="button" onClick={onCart} className="relative flex items-center gap-2.5 bg-brand-coral hover:bg-brand-coralDark text-white px-4 py-2.5 rounded-2xl shadow-[0_12px_28px_-6px_rgba(255,90,54,0.4)] active:scale-95 transition font-display font-bold text-sm">
            <ShoppingBag aria-hidden="true" className="w-4 h-4" />
            <span className="hidden sm:inline">Carrito</span>
            <span className="bg-white text-brand-coral text-xs font-extrabold px-2 py-0.5 rounded-xl min-w-[24px] text-center">{cartCount}</span>
          </button>

          <button type="button" onClick={onLogout} className="hidden sm:block text-xs font-semibold text-gray-500 hover:text-brand-coral underline underline-offset-2">
            {guest ? 'Salir' : 'Cerrar sesión'}
          </button>
        </div>
      </div>

      <div className="sm:hidden px-4 pb-3">
        <label className="relative block">
          <Search aria-hidden="true" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input aria-label="Buscar negocios" value={query} onChange={e => onQuery(e.target.value)} placeholder="Buscar locales..." className="w-full bg-white/50 text-xs font-medium pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:outline-none border border-gray-200" />
        </label>
      </div>
      </div>
    </header>
  );
}


/* ---------- Ventana grande con el menú del local (estilo MesaLocal) ---------- */
export function StoreModal({ store, products, loading, cartItems = [], cartCount = 0, cartTotal = 0, canOrder = true, notice = '', onAdd, onChange, onClose, onCart }) {
  const [section, setSection] = useState('Todos');
  const [slide, setSlide] = useState(0);
  const [configuring, setConfiguring] = useState(null);
  const gallery = [...new Set([store.image, ...products.map(p => p.imagen)].filter(Boolean))].slice(0, 5);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (gallery.length < 2) return;
    const t = setInterval(() => setSlide(s => s + 1), 3500);
    return () => clearInterval(t);
  }, [gallery.length]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const unlock = lockScroll();
    return () => { document.removeEventListener('keydown', onKey); unlock(); };
  }, []);

  const Icon = store.Icon || Store;
  const sections = [...new Set(products.map(p => p.seccion || p.categoria).filter(Boolean))];
  const shown = section === 'Todos' ? products : products.filter(p => (p.seccion || p.categoria) === section);
  const qtyOf = id => cartItems.filter(i => i.id === id).reduce((s, i) => s + i.quantity, 0);
  const initials = (store.name || '?').slice(0, 2).toUpperCase();
  const todayId = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][new Date().getDay()];

  return (
    <div className="mv-root fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 lg:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={store.name}
        onClick={e => e.stopPropagation()}
        className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-[32px]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl leading-none text-brand-charcoal shadow-lg transition hover:scale-105 hover:bg-white"
        >
          ✕
        </button>

        <div className="flex-1 overflow-y-auto [scrollbar-width:none]">
          {/* ---------- Banner ---------- */}
          <div className="relative h-64 shrink-0 bg-brand-charcoal sm:h-80">
            {gallery.length
              ? gallery.map((src, k) => (
                  <img key={src} src={src} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${k === slide % gallery.length ? 'opacity-90' : 'opacity-0'}`} />
                ))
              : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-coral to-orange-400 text-white/80"><Icon aria-hidden="true" className="h-16 w-16" /></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

            {gallery.length > 1 && (
              <div className="absolute left-6 top-5 z-10 flex gap-1.5">
                {gallery.map((_, k) => <span key={k} className={`h-1.5 rounded-full bg-white transition-all ${k === slide % gallery.length ? 'w-6' : 'w-1.5 opacity-50'}`} />)}
              </div>
            )}

            <div className="absolute bottom-6 left-6 right-6 flex flex-col justify-between gap-4 text-white sm:flex-row sm:items-end">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white font-display text-2xl font-extrabold text-brand-charcoal shadow-xl sm:h-20 sm:w-20">
                  {store.logo ? <img src={store.logo} alt="" className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white ${store.open ? 'bg-brand-mint' : 'bg-brand-coral'}`}>
                      {store.open ? 'Abierto' : 'Cerrado temporalmente'}
                    </span>
                    {store.schedule && <span className="text-xs font-medium text-gray-200">{store.schedule}</span>}
                  </div>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{store.name}</h2>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-300 sm:text-sm">{store.description}</p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-4 py-2.5 text-xs font-bold backdrop-blur-md">
                <span>{store.categoryLabel}</span>
                {store.time && <><span>•</span><span>🕒 {store.time}</span></>}
                <span>•</span>
                <span className="text-emerald-300">Envío {money(store.deliveryFee)}</span>
              </div>
            </div>
          </div>

          {/* ---------- Cuerpo: menú + información ---------- */}
          <div className="grid items-start gap-6 bg-brand-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-extrabold tracking-tight text-brand-charcoal">Menú</h3>
                  <p className="text-sm text-gray-500">{loading ? 'Cargando…' : `${products.length} producto${products.length === 1 ? '' : 's'} disponible${products.length === 1 ? '' : 's'}`}</p>
                </div>
              </div>

              {sections.length > 1 && (
                <div className="mb-4 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
                  {['Todos', ...sections].map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSection(sec)}
                      className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${
                        section === sec ? 'bg-brand-charcoal text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-4">
                {!loading && shown.length === 0 && (
                  <div className="rounded-[22px] border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">Este local aún no tiene productos.</div>
                )}

                {shown.map(p => {
                  const qty = qtyOf(p.id);
                  const blocked = !canOrder || p.soldOut;
                  const hasOpts = Array.isArray(p.opciones) && p.opciones.length > 0;
                  return (
                    <div key={p.id} className="flex justify-between gap-4 rounded-[22px] border border-gray-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(20,20,22,0.06)] transition hover:border-brand-coral/40 hover:shadow-[0_14px_30px_-12px_rgba(20,20,22,0.18)]">
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          {(p.seccion || p.categoria) && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{p.seccion || p.categoria}</span>}
                          <h4 className="mt-0.5 font-display text-lg font-bold text-brand-charcoal">{p.name}</h4>
                          {p.description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">{p.description}</p>}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="font-display text-lg font-extrabold text-brand-charcoal">{money2(p.price)} <span className="text-[11px] font-normal text-gray-400">MXN</span></span>
                          {hasOpts && <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">Personalizable</span>}
                          {hasOpts && qty > 0 && <span className="rounded-lg bg-brand-charcoal px-2 py-0.5 text-[11px] font-bold text-white">{qty} en tu pedido</span>}
                          {p.low && !p.soldOut && <span className="rounded-lg bg-brand-coralLight px-2 py-0.5 text-[11px] font-bold text-brand-coral">¡Quedan {p.stock}!</span>}
                        </div>
                      </div>

                      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                        {p.imagen
                          ? <img src={p.imagen} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                          : <div className="grid h-full w-full place-items-center bg-brand-coralLight text-brand-coral"><Icon aria-hidden="true" className="h-8 w-8" /></div>}

                        {p.soldOut && <span className="absolute inset-0 grid place-items-center bg-black/55 text-xs font-extrabold uppercase tracking-wider text-white">Agotado</span>}

                        {!p.soldOut && (qty === 0 || hasOpts) && (
                          <button
                            type="button"
                            onClick={() => hasOpts ? setConfiguring(p) : onAdd(p)}
                            disabled={blocked}
                            aria-label={`Agregar ${p.name}`}
                            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-2xl font-bold leading-none text-brand-coral shadow-lg transition hover:bg-brand-coral hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            +
                          </button>
                        )}
                        {!p.soldOut && qty > 0 && !hasOpts && (
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-xl bg-brand-charcoal px-2 py-1.5 text-white shadow-lg">
                            <button type="button" onClick={() => onChange(p.id, -1)} aria-label={`Quitar ${p.name}`} className="flex h-6 w-6 items-center justify-center text-lg font-bold hover:text-brand-coral">−</button>
                            <span className="text-sm font-extrabold">{qty}</span>
                            <button type="button" onClick={() => onAdd(p)} aria-label={`Agregar otro ${p.name}`} className="flex h-6 w-6 items-center justify-center text-lg font-bold hover:text-brand-coral">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-5 rounded-[22px] border border-gray-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(20,20,22,0.06)] lg:sticky lg:top-0">
              <div>
                <h4 className="mb-3 font-display text-xs font-extrabold uppercase tracking-wider text-brand-charcoal">Horario</h4>
                {store.horario && typeof store.horario === 'object' ? (
                  <ul className="space-y-1 text-sm">
                    {DAYS.map(([id, label]) => {
                      const d = store.horario[id];
                      const on = d?.activo && d?.apertura && d?.cierre;
                      return (
                        <li key={id} className={`flex justify-between rounded-lg px-2 py-1.5 ${id === todayId ? 'bg-brand-coralLight' : ''}`}>
                          <span className={id === todayId ? 'font-bold text-brand-coral' : 'text-gray-500'}>{label}</span>
                          <span className={on ? 'font-semibold text-brand-charcoal' : 'text-gray-400'}>{on ? `${d.apertura} - ${d.cierre}` : 'Cerrado'}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="text-sm text-gray-500">Horario no configurado.</p>}
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h4 className="mb-3 font-display text-xs font-extrabold uppercase tracking-wider text-brand-charcoal">Entrega y pago</h4>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-3"><Bike aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-coral" /><span>Envío a domicilio por <strong className="text-brand-charcoal">{money(store.deliveryFee)}</strong></span></li>
                  <li className="flex items-start gap-3"><Store aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-coral" /><span>Recoger en el local <strong className="text-brand-charcoal">sin costo</strong></span></li>
                  <li className="flex items-start gap-3"><ShoppingBag aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-coral" /><span>Pago <strong className="text-brand-charcoal">en efectivo</strong> al recibir</span></li>
                  {store.telefono && <li className="flex items-start gap-3"><User aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-coral" /><span>Teléfono: <strong className="text-brand-charcoal">{store.telefono}</strong></span></li>}
                </ul>
              </div>
            </aside>
          </div>
        </div>

        {notice && (
          <div role="status" className="pointer-events-none absolute bottom-24 left-1/2 z-40 max-w-[90%] -translate-x-1/2 rounded-2xl bg-brand-charcoal px-5 py-3 text-center text-xs font-semibold text-white shadow-xl">
            {notice}
          </div>
        )}

        {cartCount > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-200 bg-white px-6 py-4">
            <div>
              <p className="text-xs font-medium text-gray-500">Tu pedido actual</p>
              <p className="font-display text-base font-extrabold text-brand-charcoal">
                {cartCount} producto{cartCount > 1 ? 's' : ''} • {money2(cartTotal)} MXN
              </p>
            </div>
            <button
              type="button"
              onClick={onCart}
              className="flex items-center gap-2 rounded-2xl bg-brand-coral px-6 py-3 font-display text-sm font-bold text-white shadow-[0_12px_28px_-6px_rgba(255,90,54,0.4)] transition hover:bg-brand-coralDark active:scale-95"
            >
              <span>Ir al carrito</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {configuring && (
        <ProductOptionsModal
          product={configuring}
          onClose={() => setConfiguring(null)}
          onConfirm={cfg => { onAdd(configuring, cfg); setConfiguring(null); }}
        />
      )}
    </div>
  );
}


/* ---------- Ventana para personalizar un producto (ingredientes, extras, tamaño…) ---------- */
export function ProductOptionsModal({ product, onClose, onConfirm }) {
  const groups = (product.opciones || []).filter(g => g?.items?.length);
  const [sel, setSel] = useState(() => {
    const init = {};
    groups.forEach(g => { init[g.id] = g.tipo === 'una' && g.obligatorio ? [g.items[0].nombre] : []; });
    return init;
  });
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const toggle = (g, nombre) => setSel(prev => {
    const cur = prev[g.id] || [];
    if (g.tipo === 'una') return { ...prev, [g.id]: cur[0] === nombre && !g.obligatorio ? [] : [nombre] };
    return { ...prev, [g.id]: cur.includes(nombre) ? cur.filter(n => n !== nombre) : [...cur, nombre] };
  });

  const extraOf = g => (sel[g.id] || []).reduce((sum, n) => sum + (Number(g.items.find(i => i.nombre === n)?.extra) || 0), 0);
  const extras = groups.reduce((sum, g) => sum + extraOf(g), 0);
  const unit = (Number(product.price) || 0) + extras;
  const missing = groups.filter(g => g.obligatorio && !(sel[g.id] || []).length);

  const confirm = () => {
    if (missing.length) return;
    const detalle = groups
      .filter(g => (sel[g.id] || []).length)
      .map(g => g.quitar ? `Sin ${sel[g.id].join(', ')}` : `${g.titulo}: ${sel[g.id].join(', ')}`);
    const key = `${product.id}|${groups.map(g => [...(sel[g.id] || [])].sort().join('+')).join('|')}|${note.trim()}`;
    onConfirm({ key, price: unit, detalle, nota: note.trim(), qty });
  };

  return (
    <div className="mv-root fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div role="dialog" aria-label={`Personalizar ${product.name}`} onClick={e => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <div className="relative h-44 shrink-0 bg-brand-coralLight">
          {product.imagen
            ? <img src={product.imagen} alt={product.name} className="h-full w-full object-cover" />
            : <div className="grid h-full w-full place-items-center text-brand-coral"><Utensils className="h-14 w-14" /></div>}
          <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h3 className="font-display text-2xl font-extrabold text-brand-charcoal">{product.name}</h3>
          {product.description && <p className="mt-1 text-sm text-gray-500">{product.description}</p>}
          <p className="mt-2 font-display font-extrabold text-brand-coral">{money2(product.price)}</p>

          {groups.map(g => (
            <section key={g.id}>
              <h4 className="mb-2 mt-6 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-gray-500">
                {g.titulo}
                {g.obligatorio
                  ? <span className="rounded-full bg-brand-coralLight px-2 py-0.5 text-[10px] text-brand-coral">Obligatorio</span>
                  : <span className="text-[11px] font-semibold normal-case tracking-normal text-gray-400">Opcional</span>}
              </h4>
              <div className="space-y-2">
                {g.items.map(it => {
                  const on = (sel[g.id] || []).includes(it.nombre);
                  const extra = Number(it.extra) || 0;
                  return (
                    <button key={it.nombre} type="button" aria-pressed={on} onClick={() => toggle(g, it.nombre)}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${on ? 'border-brand-coral bg-brand-coralLight' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center border-2 text-[13px] text-white ${g.tipo === 'una' ? 'rounded-full' : 'rounded-md'} ${on ? 'border-brand-coral bg-brand-coral' : 'border-gray-300'}`}>{on ? '✓' : ''}</span>
                      <span className="flex-1">{g.quitar ? `Sin ${it.nombre}` : it.nombre}</span>
                      <span className={`text-[13px] font-bold ${on ? 'text-brand-coral' : 'text-gray-400'}`}>{extra > 0 ? `+${money2(extra)}` : ''}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <h4 className="mb-2 mt-6 text-xs font-extrabold uppercase tracking-wider text-gray-500">Nota para el local</h4>
          <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={140} placeholder="Ej. Salsa aparte, poco picante…" className="h-20 w-full resize-none rounded-2xl border-2 border-gray-200 p-3 text-sm outline-none focus:border-brand-coral" />
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 px-6 pb-5 pt-4">
          <div className="flex items-center rounded-full border border-gray-200">
            <button type="button" aria-label="Menos" onClick={() => setQty(q => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center text-xl font-bold text-gray-600">−</button>
            <span className="w-6 text-center font-extrabold">{qty}</span>
            <button type="button" aria-label="Más" onClick={() => setQty(q => q + 1)} className="flex h-10 w-10 items-center justify-center text-xl font-bold text-brand-coral">+</button>
          </div>
          <button type="button" onClick={confirm} disabled={missing.length > 0}
            className="flex-1 rounded-2xl bg-brand-coral py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-coralDark disabled:cursor-not-allowed disabled:opacity-50">
            {missing.length ? `Elige: ${missing[0].titulo}` : `Agregar ${money2(unit * qty)}`}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ---------- Carrito lateral (panel que entra desde la derecha) ---------- */
export function CartDrawer({ open, cart, subtotal = 0, fee = 0, total = 0, pickup = false, onPickup, freeFrom = 0, sending = false, guest = false, address = '', notice = '', onChange, onClear, onConfirm, onClose, onLogin, onAddAddress }) {
  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => { unlock(); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const items = cart?.items || [];
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const showBar = freeFrom > 0 && !pickup && items.length > 0;
  const missing = Math.max(0, freeFrom - subtotal);
  const pct = freeFrom > 0 ? Math.min(100, Math.round((subtotal / freeFrom) * 100)) : 0;
  const needsAddress = !pickup && !guest && !address;

  return (
    <div className={`mv-root fixed inset-0 z-[70] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside role="dialog" aria-label="Tu pedido" className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-coralLight text-brand-coral"><ShoppingBag className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold text-brand-charcoal">Tu pedido</h2>
              <p className="truncate text-sm text-gray-500">{cart?.storeName || 'Aún no agregas nada'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar carrito" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200">✕</button>
        </div>

        {/* Barra de envío gratis */}
        {showBar && (
          <div className="border-b border-gray-100 bg-orange-50/40 px-6 py-4">
            <div className="mb-2 flex items-center justify-between text-sm font-bold text-brand-charcoal">
              <span className="flex items-center gap-2"><Bike className="h-4 w-4 text-brand-coral" />{missing > 0 ? `¡Te faltan ${money(missing)} para envío gratis!` : '¡Tienes envío gratis!'}</span>
              <span className={missing > 0 ? 'text-brand-coral' : 'text-brand-mint'}>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-coral to-brand-mint transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Productos */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {notice && <div role="status" className="mb-4 rounded-xl bg-brand-mintLight px-4 py-2.5 text-sm font-semibold text-emerald-800">{notice}</div>}
          {!items.length ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-400"><ShoppingBag className="h-9 w-9" /></span>
              <p className="font-display text-lg font-extrabold text-brand-charcoal">Tu carrito está vacío</p>
              <p className="max-w-[16rem] text-sm text-gray-500">Explora los negocios locales y agrega lo que se te antoje.</p>
              <button type="button" onClick={onClose} className="mt-2 rounded-2xl bg-brand-coral px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-coralDark">Explorar locales</button>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map(item => { const lk = item.key || item.id; return (
                  <li key={lk} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-200">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        : <div className="flex h-full w-full items-center justify-center text-gray-400"><Utensils className="h-6 w-6" /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[15px] font-bold text-brand-charcoal">{item.name}</p>
                      {item.detalle?.length > 0 && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-500">{item.detalle.join(' · ')}</p>}
                      {item.nota && <p className="mt-0.5 line-clamp-1 text-xs italic text-gray-400">“{item.nota}”</p>}
                      <p className="mt-0.5 text-sm font-extrabold text-brand-coral">{money2(item.price * item.quantity)}</p>
                    </div>
                    <div className="flex shrink-0 items-center rounded-full border border-gray-200 bg-white">
                      <button type="button" aria-label={`Quitar una unidad de ${item.name}`} onClick={() => onChange(lk, -1)} className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-gray-600 transition hover:bg-gray-100">−</button>
                      <span className="w-6 text-center text-sm font-extrabold">{item.quantity}</span>
                      <button type="button" aria-label={`Agregar una unidad de ${item.name}`} onClick={() => onChange(lk, 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-brand-coral transition hover:bg-brand-coralLight">+</button>
                    </div>
                  </li>
                ); })}
              </ul>

              {/* Forma de entrega */}
              <h3 className="mb-3 mt-7 font-display text-sm font-extrabold uppercase tracking-wide text-gray-500">Forma de entrega</h3>
              <div className="grid grid-cols-2 gap-3">
                {[[false, 'A domicilio', Bike], [true, 'Recoger', Store]].map(([value, label, Ico]) => (
                  <button key={label} type="button" aria-pressed={pickup === value} onClick={() => onPickup(value)}
                    className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition ${pickup === value ? 'border-brand-coral bg-brand-coralLight text-brand-coral' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <Ico className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>

              {!pickup && (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-coral" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-brand-charcoal">Entregar en</p>
                    {address
                      ? <p className="truncate text-gray-500">{address}</p>
                      : <button type="button" onClick={onAddAddress} className="font-semibold text-brand-coral underline">Agrega tu dirección</button>}
                  </div>
                </div>
              )}

              <button type="button" onClick={onClear} className="mt-5 text-sm font-semibold text-gray-400 underline transition hover:text-red-500">Vaciar carrito</button>
            </>
          )}
        </div>

        {/* Totales */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 bg-white px-6 pb-6 pt-5">
            <dl className="space-y-1.5 text-sm text-gray-500">
              <div className="flex justify-between"><dt>Subtotal ({count} {count === 1 ? 'producto' : 'productos'})</dt><dd className="font-bold text-brand-charcoal">{money2(subtotal)}</dd></div>
              <div className="flex justify-between"><dt>{pickup ? 'Recoger en el local' : 'Tarifa de envío'}</dt><dd className={`font-bold ${fee === 0 ? 'text-brand-mint' : 'text-brand-charcoal'}`}>{fee === 0 ? 'Gratis' : money2(fee)}</dd></div>
            </dl>
            <div className="mt-3 flex items-end justify-between border-t border-gray-100 pt-3">
              <span className="font-display text-base font-extrabold text-brand-charcoal">Total a pagar</span>
              <span className="font-display text-3xl font-extrabold text-brand-charcoal">{money2(total)} <small className="text-xs font-bold text-gray-400">MXN</small></span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Pago en efectivo al recibir.</p>
            {guest ? (
              <button type="button" onClick={onLogin} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-coral py-4 text-base font-extrabold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-coralDark">Inicia sesión para pedir <ArrowRight className="h-5 w-5" /></button>
            ) : (
              <button type="button" onClick={needsAddress ? onAddAddress : onConfirm} disabled={sending}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-coral py-4 text-base font-extrabold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-coralDark disabled:opacity-60">
                {sending ? 'Enviando…' : needsAddress ? 'Agregar dirección para continuar' : <>Confirmar pedido <ArrowRight className="h-5 w-5" /></>}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}


/* ---------- Mis pedidos del cliente (seguimiento por pasos) ---------- */
const ORDER_BADGE = [
  ['Esperando aceptación', 'bg-amber-100 text-amber-800'],
  ['En preparación', 'bg-orange-100 text-orange-700'],
  ['Listo', 'bg-brand-mintLight text-emerald-700'],
  ['Entregado', 'bg-gray-100 text-gray-600'],
  ['Cancelado', 'bg-red-100 text-red-700'],
];

function OrderTracker({ order }) {
  const now = useNow();
  const steps = ['Pedido recibido', 'En preparación', 'Listo', order.recoger ? 'Recogido' : 'Entregado'];
  const e = order.estado;
  const left = order.listoMs ? order.listoMs - now : null;
  const [badge, badgeCls] = ORDER_BADGE[e] || ORDER_BADGE[0];

  return (
    <article className="rounded-[26px] border border-white/80 bg-white/85 p-6 shadow-[0_4px_20px_-2px_rgba(20,20,22,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-extrabold text-brand-charcoal">Pedido #{order.id.slice(0, 6).toUpperCase()}</h3>
          <p className="mt-0.5 truncate text-sm text-gray-500">{order.negocioNombre} · {order.recoger ? 'Recoger en local' : 'Entrega a domicilio'}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold ${badgeCls}`}>{badge}</span>
      </div>

      {/* Aviso principal según el estado real */}
      {e === 0 && order.prepMinEst > 0 && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">⏱ Tiempo estimado: ~{order.prepMinEst} min desde que el negocio acepte.</p>}
      {e === 1 && order.listoMs && (
        <div className="mt-4 rounded-2xl bg-brand-coralLight px-4 py-3">
          {left > 0
            ? <p className="text-sm font-semibold text-brand-coralDark">⏱ Listo en aprox. <b className="text-base">{Math.ceil(left / 60000)} min</b> · ≈ {fmtHour(order.listoMs)}{order.retrasoMin > 0 ? ' · el negocio informó un pequeño retraso' : ''}</p>
            : <p className="text-sm font-semibold text-brand-coralDark">Ya casi: el negocio está terminando tu pedido.</p>}
        </div>
      )}
      {e === 2 && <p className="mt-4 rounded-2xl bg-brand-mintLight px-4 py-3 text-sm font-bold text-emerald-800">🎉 ¡Tu pedido está listo! {order.recoger ? 'Pasa a recogerlo.' : 'Va en camino.'}</p>}
      {e === 4 && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Este pedido fue cancelado{order.motivo ? `: ${order.motivo}` : '.'}</p>}

      {/* Línea de pasos */}
      {e !== 4 && (
        <ol className="mt-6 grid grid-cols-4 gap-1">
          {steps.map((label, i) => {
            const done = i <= e;
            const current = i === e && e < 3;
            return (
              <li key={label} className="relative flex flex-col items-center text-center">
                {i > 0 && <span className={`absolute right-1/2 top-[15px] h-1 w-full -translate-y-1/2 rounded-full ${i <= e ? 'bg-brand-coral' : 'bg-gray-200'}`} />}
                <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-extrabold transition ${done ? 'border-brand-coral bg-brand-coral text-white' : 'border-gray-300 bg-white text-gray-400'} ${current ? 'ring-4 ring-brand-coral/25' : ''}`}>{done ? '✓' : i + 1}</span>
                <span className={`mt-2 text-[11px] font-bold leading-tight ${done ? 'text-brand-charcoal' : 'text-gray-400'}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Productos */}
      <ul className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
        {order.items.map((it, i) => (
          <li key={(it.key || it.id) + i} className="flex items-start justify-between gap-4 py-3 text-sm">
            <span className="min-w-0">
              <b className="font-semibold text-brand-charcoal">{it.quantity} × {it.name}</b>
              {it.detalle?.length > 0 && <span className="mt-0.5 block text-xs text-gray-500">{it.detalle.join(' · ')}</span>}
              {it.nota && <span className="mt-0.5 block text-xs italic text-gray-400">“{it.nota}”</span>}
            </span>
            <b className="shrink-0 text-brand-charcoal">{money2(it.price * it.quantity)}</b>
          </li>
        ))}
      </ul>
      <div className="space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-500">
        {typeof order.envio === 'number' && <div className="flex justify-between"><span>Envío</span><b className="text-brand-charcoal">{order.envio === 0 ? 'Gratis' : money2(order.envio)}</b></div>}
        <div className="flex items-end justify-between"><span className="font-display font-extrabold text-brand-charcoal">Total</span><span className="font-display text-2xl font-extrabold text-brand-charcoal">{money2(order.total)}</span></div>
      </div>
    </article>
  );
}

export function ClientOrders({ orders, onExplore }) {
  // por si quedó el scroll bloqueado por una ventana anterior
  useEffect(() => { if (scrollLocks === 0) document.body.style.overflow = ''; }, []);
  const active = orders.filter(o => o.estado < 3);
  const past = orders.filter(o => o.estado >= 3);
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-charcoal sm:text-4xl">Mis pedidos</h1>
      <p className="mb-8 mt-1 text-sm text-gray-500">Cada paso, claro y a la vista.</p>

      {orders.length === 0 && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[28px] border border-dashed border-gray-300 bg-white/70 px-6 py-14 text-center backdrop-blur">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-coralLight text-brand-coral"><Package aria-hidden="true" className="h-8 w-8" /></span>
          <h2 className="font-display text-xl font-extrabold text-brand-charcoal">Tu primer pedido te espera</h2>
          <p className="text-sm text-gray-500">Explora los negocios locales y pide lo que se te antoje.</p>
          <button type="button" onClick={onExplore} className="mt-2 rounded-2xl bg-brand-coral px-6 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-6px_rgba(255,90,54,0.45)] transition hover:bg-brand-coralDark">Explorar negocios</button>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-lg font-extrabold text-brand-charcoal">En curso ({active.length})</h2>
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">{active.map(o => <OrderTracker key={o.id} order={o} />)}</div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-lg font-extrabold text-brand-charcoal">Anteriores</h2>
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">{past.map(o => <OrderTracker key={o.id} order={o} />)}</div>
        </section>
      )}
    </div>
  );
}