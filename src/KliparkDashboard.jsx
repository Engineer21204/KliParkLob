import React, { useState, useEffect, useRef } from 'react';
import { Store, User, ShoppingBag, Compass, Package, LayoutDashboard, ReceiptText, Utensils, Coffee, CakeSlice, Bike } from './Icons';
import { MarketHome, TopBar, StoreModal, CartDrawer } from './MarketView';
import BusinessProducts from './BusinessProducts';
import BusinessProfile from './BusinessProfile';
import ClientProfile from './ClientProfile';
import { listProducts, friendlyProductError } from './productService';
import { watchNegocios, watchNegocio, updateNegocio, watchOrders, createOrder, advanceOrder, acceptOrder, cancelOrder, friendlyMarketError, calcPrepMin, checkOrder, extendOrder, markFinishing, finishOrder } from './marketService';
import OrdersBoard, { useNow, fmtLeft, fmtHour } from './OrdersBoard';

const DELIVERY_FEE = 20; // Envío fijo por ahora
const FREE_SHIPPING_FROM = 250; // Envío gratis desde este subtotal (pon 0 para desactivar)
const statusLabels = ['Esperando aceptación', 'En preparación', 'Listo para entregar', 'Entregado', 'Cancelado'];
const ICONS = { Comida: Utensils, Bebidas: Coffee, Postres: CakeSlice };
const COVERS = { Postres: 'cake', Bebidas: 'coffee' };
const soldOut = p => !p.available || (typeof p.stock === 'number' && p.stock <= 0);
const decorate = n => ({ ...n, Icon: ICONS[n.categoria] || Store, cover: COVERS[n.categoria] || '' });
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);

// ids SIN acento, igual que en la base de datos
const DIAS_RESUMEN = [
  { id: 'lunes', nombre: 'Lun' },
  { id: 'martes', nombre: 'Mar' },
  { id: 'miercoles', nombre: 'Mié' },
  { id: 'jueves', nombre: 'Jue' },
  { id: 'viernes', nombre: 'Vie' },
  { id: 'sabado', nombre: 'Sáb' },
  { id: 'domingo', nombre: 'Dom' }
];

const DAY_IDS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const todayText = h => {
  if (!h || typeof h !== 'object') return '';
  const d = h[DAY_IDS[new Date().getDay()]];
  return d?.activo && d?.apertura && d?.cierre ? `Hoy ${d.apertura} - ${d.cierre}` : 'Hoy cerrado';
};

const goTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function Button({ children, secondary = false, className = '', ...props }) {
  return <button type="button" className={`${secondary ? 'secondary' : 'primary'} ${className}`} {...props}>{children}</button>;
}
function Intro({ title, subtitle, children }) {
  return <div className="intro"><div><h1>{title}</h1><p className="muted">{subtitle}</p></div>{children}</div>;
}

/* Galería simple con cambio automático (portada de la tienda) */
function Gallery({ photos, fallback: Fallback }) {
  const [i, setI] = useState(0);
  const n = photos.length;
  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setI(p => (p + 1) % n), 3500);
    return () => clearInterval(t);
  }, [n]);
  if (!n) return <div className="gal-empty"><Fallback aria-hidden="true" /></div>;
  return (
    <div className="gal">
      <div className="gal-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {photos.map((src, k) => <img key={k} src={src} alt="" loading={k === 0 ? 'eager' : 'lazy'} />)}
      </div>
      {n > 1 && <div className="gal-dots">{photos.map((_, k) => <button type="button" key={k} aria-label={`Foto ${k + 1}`} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>}
    </div>
  );
}

/* Portada de la pantalla de la tienda */
function StoreHero({ store, products, onBack, canOrder }) {
  const Icon = store.Icon || Store;
  const photos = [store.portada, ...(products || []).filter(p => p.imagen).map(p => p.imagen)].filter(Boolean).slice(0, 5);
  const list = photos.length ? photos : store.logo ? [store.logo] : [];
  const closed = store.abierto === false;
  return (
    <section className="sh">
      <div className="sh-media">
        <Gallery photos={list} fallback={Icon} />
        <div className="sh-shade" />
        <button type="button" className="sh-back" onClick={onBack}>‹ Volver</button>
        <div className="sh-info">
          <span className={`chip ${closed ? 'off' : ''}`}>{closed ? 'Cerrado temporalmente' : 'Abierto'}</span>
          <h1>{store.nombre}</h1>
          <p>{store.categoria || 'Negocio local'}{store.descripcion ? ` · ${store.descripcion}` : ''}</p>
          <div className="sh-actions">
            <button type="button" className="sh-cta" onClick={() => goTo('sv-menu')}>{canOrder ? 'Hacer pedido' : 'Ver menú'}</button>
            <button type="button" className="sh-ghost" onClick={() => goTo('sv-info')}>Horario y envío</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrderCard({ order, business = false, auto = false, onAdvance, onCancel }) {
  const now = useNow();
  const left = order.listoMs ? order.listoMs - now : null;
  return <section className="panel">
    <div className="row"><h2>Pedido #{order.id.slice(0, 6).toUpperCase()}</h2><span className="badge">{statusLabels[order.estado]}</span></div>
    <p className="muted" style={{ marginTop: 8 }}>{business ? `Cliente: ${order.clienteNombre}` : order.negocioNombre} · {order.recoger ? 'Recoger en local' : 'Entrega a domicilio'}</p>
    {!business && order.estado === 0 && order.prepMinEst > 0 && <p className="notice" style={{ marginTop: 10 }}>Tiempo estimado: ~{order.prepMinEst} min desde que el negocio acepte.</p>}
    {!business && order.estado === 1 && order.listoMs && <p className="notice" style={{ marginTop: 10 }}>{left > 0 ? <>Tu pedido estará listo en aprox. <strong>{Math.ceil(left / 60000)} min</strong> (≈ {fmtHour(order.listoMs)}){order.retrasoMin > 0 ? ' · el negocio informó un pequeño retraso' : ''}</> : 'Ya casi: el negocio está terminando tu pedido.'}</p>}
    {!business && order.estado === 2 && <p className="notice" style={{ marginTop: 10 }}>🎉 ¡Tu pedido está listo! {order.recoger ? 'Pasa a recogerlo.' : 'Va en camino.'}</p>}
    {order.estado === 4 && order.motivo && <p className="muted" style={{ marginTop: 8 }}>Motivo: {order.motivo}</p>}
    {business && !order.recoger && order.direccion && <p className="muted">Entregar en: {order.direccion}</p>}
    {business && order.clienteCel && <p className="muted">Teléfono del cliente: {order.clienteCel}</p>}
    {order.items.map((item, i) => <div className="order row" key={(item.key || item.id) + i}><span>{item.quantity} × {item.name}{item.detalle?.length > 0 && <small style={{ display: 'block', opacity: .75 }}>{item.detalle.join(' · ')}</small>}{item.nota && <small style={{ display: 'block', opacity: .75, fontStyle: 'italic' }}>“{item.nota}”</small>}</span><strong>{money(item.price * item.quantity)}</strong></div>)}
    <div className="total row"><strong>Total</strong><h2>{money(order.total)}</h2></div>
    {business
      ? order.estado < 3 && <>{order.estado === 0 && auto ? <p className="notice" style={{ marginBottom: 12 }}>Aceptando pedido automáticamente…</p> : <><Button onClick={() => onAdvance(order)}>{['Aceptar y preparar', 'Marcar como listo', 'Confirmar entrega'][order.estado]}</Button>{' '}</>}<Button secondary onClick={() => onCancel(order)}>Cancelar pedido</Button></>
      : order.estado === 4 ? <p className="notice">El negocio canceló este pedido.</p> : <ol className="timeline">{['Pedido recibido', 'Confirmación del negocio', 'Preparación finalizada', order.recoger ? 'Recogido en local' : 'Entregado'].map((label, i) => <li key={label} className={i <= order.estado ? 'done' : ''}>{label}</li>)}</ol>}
  </section>;
}

export default function KliparkDashboard({ accountRole, profile = {}, onLogout, onRequestLogin }) {
  const role = accountRole === 'negocio' ? 'business' : 'client';
  const guest = accountRole === 'invitado';
  const uid = profile.uid;
  const [me, setMe] = useState(profile); // datos del usuario (se actualizan al editar el perfil)
  const [page, setPage] = useState(role === 'business' ? 'Resumen' : 'Explorar');
  const [negocios, setNegocios] = useState(null);      // todos los negocios (cliente)
  const [myNegocio, setMyNegocio] = useState(null);    // mi negocio (negocio)
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState(null);      // productos de mi negocio
  const [productsError, setProductsError] = useState('');
  const [storeId, setStoreId] = useState(null);
  const [storeProducts, setStoreProducts] = useState(null);
  const [storeModal, setStoreModal] = useState(false);   // ventana grande del menú de un local
  const [covers, setCovers] = useState({});            // fotos de productos por negocio
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todo');
  const [cart, setCart] = useState(null);
  const [pickup, setPickup] = useState(false);
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);   // menú lateral expandido (táctil)
  const [toCancel, setToCancel] = useState(null); // pedido pendiente de confirmar cancelación
  const fail = e => setNotice(friendlyMarketError(e));

  // Pedidos automáticos: el negocio los activa o desactiva (negocios/{uid}.autoPedidos)
  const [autoFailed, setAutoFailed] = useState([]);   // pedidos que no se pudieron aceptar solos
  const [autoTick, setAutoTick] = useState(0);
  const autoBusy = useRef(false);
  const autoTried = useRef(new Set());
  const autoAccept = myNegocio ? myNegocio.autoPedidos !== false : false;
  const toggleAuto = on => updateNegocio(uid, { autoPedidos: on }).catch(fail);
  const saveBase = min => {
    if (!(min >= 1 && min <= 180)) { setNotice('El tiempo base debe estar entre 1 y 180 minutos.'); return; }
    updateNegocio(uid, { prepBaseMin: Math.round(min) }).then(() => setNotice('Tiempo base guardado.')).catch(fail);
  };

  useEffect(() => {
    if (role === 'client') return watchNegocios(list => setNegocios(list.map(decorate)), e => { setNegocios([]); fail(e); });
  }, [role]);
  useEffect(() => {
    if (role !== 'business' || !uid) return;
    const stops = [watchNegocio(uid, n => setMyNegocio(n && decorate(n)), fail), watchOrders('negocioId', uid, setOrders, fail)];
    listProducts(uid).then(setProducts).catch(e => { setProducts([]); setProductsError(friendlyProductError(e)); });
    return () => stops.forEach(stop => stop());
  }, [role, uid]);
  const prevEstados = useRef({});
  useEffect(() => {
    if (role !== 'client') return;
    orders.forEach(o => {
      const before = prevEstados.current[o.id];
      if (before !== undefined && before !== o.estado) {
        if (o.estado === 2) {
          const msg = `Tu pedido de ${o.negocioNombre} está listo ${o.recoger ? 'para recoger' : 'y va en camino'}.`;
          setNotice(`🎉 ${msg}`);
          try { if (window.Notification?.permission === 'granted') new Notification('¡Pedido listo!', { body: msg }); } catch { /* sin permiso */ }
        } else if (o.estado === 1) setNotice(`${o.negocioNombre} aceptó tu pedido y ya lo está preparando.`);
        else if (o.estado === 4) setNotice(`Tu pedido fue cancelado${o.motivo ? `: ${o.motivo}` : '.'}`);
      }
      prevEstados.current[o.id] = o.estado;
    });
  }, [orders, role]);
  useEffect(() => {
    if (role !== 'business' || !autoAccept || products === null || !myNegocio || autoBusy.current) return;
    const next = orders.find(o => o.estado === 0 && !autoTried.current.has(o.id));
    if (!next) return;
    autoBusy.current = true;
    autoTried.current.add(next.id);
    (async () => {
      try {
        const check = checkOrder(next, products, myNegocio);
        if (check.ok) {
          const prepMin = calcPrepMin(next.items, products, myNegocio, next.recoger);
          setProducts(await acceptOrder(next, products, { prepMin })); // valida, descuenta existencias y pasa a "En preparación"
          setNotice(`Pedido #${next.id.slice(0, 6).toUpperCase()} aceptado automáticamente (${prepMin} min).`);
        } else if (check.tipo === 'cerrado') {
          setAutoFailed(list => [...list, next.id]); // queda pendiente para decisión del negocio
          setNotice(`Pedido #${next.id.slice(0, 6).toUpperCase()} recibido con el negocio cerrado. Decide si lo aceptas.`);
        } else {
          setProducts(await cancelOrder(next, products, check.motivo, 'sistema')); // se conserva con su motivo
          setNotice(`Pedido #${next.id.slice(0, 6).toUpperCase()} cancelado: ${check.motivo}`);
        }
      } catch (e) {
        setAutoFailed(list => [...list, next.id]);
        fail(e);
      } finally {
        autoBusy.current = false;
        setAutoTick(t => t + 1);
      }
    })();
  }, [role, orders, products, myNegocio, autoAccept, autoTick]);
  useEffect(() => {
    if (role === 'client' && !guest && uid) return watchOrders('clienteId', uid, setOrders, fail);
  }, [role, guest, uid]);
  useEffect(() => {
    if ((page !== 'Tienda' && !storeModal) || !storeId) return;
    setStoreProducts(null);
    listProducts(storeId).then(setStoreProducts).catch(e => { setStoreProducts([]); fail(e); });
  }, [page, storeId, storeModal]);
  // los avisos desaparecen solos
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  // Trae hasta 4 fotos de productos por negocio para las tarjetas
  useEffect(() => {
    if (role !== 'client' || !negocios) return;
    let alive = true;
    negocios.forEach(n => {
      if (covers[n.id] !== undefined) return;
      listProducts(n.id)
        .then(list => { if (alive) setCovers(c => ({ ...c, [n.id]: list.filter(p => p.imagen).slice(0, 4).map(p => p.imagen) })); })
        .catch(() => { if (alive) setCovers(c => ({ ...c, [n.id]: [] })); });
    });
    return () => { alive = false; };
  }, [role, negocios]);

  const manualOpen = myNegocio ? myNegocio.abierto !== false : true;
  const open = manualOpen;
  const store = role === 'business' ? myNegocio : negocios?.find(n => n.id === storeId);
  const shownProducts = role === 'business' ? products : storeProducts;
  const quantity = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const subtotal = cart?.items.reduce((sum, item) => sum + item.quantity * item.price, 0) || 0;
  const fee = pickup || (FREE_SHIPPING_FROM > 0 && subtotal >= FREE_SHIPPING_FROM) ? 0 : DELIVERY_FEE;
  const total = subtotal + fee;
  const completed = orders.filter(o => o.estado === 3);
  const lowLimit = myNegocio?.umbral ?? 5;
  const low = (products || []).filter(p => typeof p.stock === 'number' && p.stock <= lowLimit);
  const visible = (negocios || []).filter(n => (category === 'Todo' || n.categoria === category) && (n.nombre || '').toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));

  const photoOf = s => s.portada || covers[s.id]?.[0] || s.logo || '';
  const openStore = id => { setStoreId(id); setStoreModal(true); setNotice(''); };

  function addProduct(product, config) {
    if (cart && cart.storeId !== store.id) { setNotice('Tu carrito pertenece a otro negocio. Finaliza o vacía ese carrito antes de comprar aquí.'); return; }
    const qty = config?.qty || 1;
    const key = config?.key || product.id;
    const unit = config?.price ?? product.price;
    const inCart = (cart?.items || []).filter(item => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
    if (typeof product.stock === 'number' && inCart + qty > product.stock) { setNotice('No hay más existencias de este producto.'); return; }
    setCart(previous => {
      const items = previous?.items || [];
      const exists = items.some(item => (item.key || item.id) === key);
      const line = { key, id: product.id, name: product.name, price: unit, image: product.imagen || '', detalle: config?.detalle || [], nota: config?.nota || '', quantity: qty };
      return { storeId: store.id, storeName: store.nombre, items: exists ? items.map(item => (item.key || item.id) === key ? { ...item, quantity: item.quantity + qty } : item) : [...items, line] };
    });
    setNotice('Producto agregado al carrito.');
  }
  function changeQuantity(key, amount) {
    setCart(previous => {
      if (!previous) return null;
      const items = previous.items.map(item => (item.key || item.id) === key ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0);
      return items.length ? { ...previous, items } : null;
    });
  }
  async function confirmOrder() {
    if (guest) { onRequestLogin?.(); return; }
    if (!cart || sending) return;
    if (!pickup && !me.direccion) { setNotice('Agrega tu dirección de entrega en Mi perfil, o elige Recoger.'); setCartOpen(false); setPage('Mi perfil'); return; }
    setSending(true);
    try {
      await createOrder({ negocioId: cart.storeId, negocioNombre: cart.storeName, clienteId: uid, clienteNombre: me.nombre || 'Cliente', clienteCel: me.cel || '', direccion: pickup ? '' : me.direccion, items: cart.items, subtotal, envio: fee, total, recoger: pickup, prepMinEst: calcPrepMin(cart.items, storeProducts || [], store, pickup) });
      setCart(null); setCartOpen(false); setPage('Mi pedido'); setNotice('¡Pedido enviado! El negocio lo verá de inmediato.');
    } catch (e) { fail(e); } finally { setSending(false); }
  }
  const advance = async order => {
    try {
      if (order.estado === 0 && products) {
        const prepMin = calcPrepMin(order.items, products, myNegocio, order.recoger);
        setProducts(await acceptOrder(order, products, { prepMin })); // acepta y descuenta existencias
      } else if (order.estado === 1) await finishOrder(order.id);
      else await advanceOrder(order.id, order.estado + 1);
    } catch (e) { fail(e); }
  };
  const confirmCancel = async () => {
    const order = toCancel;
    setToCancel(null);
    try {
      const list = await cancelOrder(order, products || [], 'Cancelado por el negocio', 'negocio');
      if (products) setProducts(list);
      setNotice(order.estado >= 1 ? 'Pedido cancelado. Las existencias se devolvieron al inventario.' : 'Pedido cancelado.');
    } catch (e) { fail(e); }
  };
  const toggleOpen = () => updateNegocio(uid, { abierto: !manualOpen }).catch(fail);
  const pending = orders.filter(o => o.estado < 3).length;
  const navigation = role === 'client'
    ? [['Explorar', Compass, 'Negocios cerca de ti'], ['Mi pedido', Package, 'Sigue tus pedidos'], ...(guest ? [] : [['Mi perfil', User, 'Tus datos y dirección']])]
    : [['Resumen', LayoutDashboard, 'Tu operación del día'], ['Pedidos', ReceiptText, pending ? `${pending} por atender` : 'Sin pendientes'], ['Productos', Utensils, 'Tu menú y existencias'], ['Mi negocio', Store, 'Perfil y horario']];
  const go = label => { setPage(label); setNotice(''); setRailOpen(false); setStoreModal(false); };
  const backPage = role === 'business' ? 'Mi negocio' : 'Explorar';

  const toCard = n => ({
    id: n.id,
    name: n.nombre,
    description: n.descripcion || `Negocio local · ${n.categoria}`,
    categoryLabel: n.categoria || 'Local',
    image: photoOf(n),
    open: n.abierto !== false,
    deliveryFee: DELIVERY_FEE,
    time: n.tiempoEntrega || '',
    featured: !!n.destacado,
    logo: n.logo || '',
    schedule: todayText(n.horario),
    horario: n.horario || null,
    telefono: n.telefono || '',
    Icon: n.Icon,
  });

  const modalProducts = (storeProducts || []).map(p => ({
    ...p,
    soldOut: soldOut(p),
    low: typeof p.stock === 'number' && p.stock > 0 && p.stock <= (store?.umbral ?? 5),
  }));

  const topBar = role === 'client' ? (
    <TopBar
      address={me.direccion || 'Agrega tu dirección'}
      query={query}
      onQuery={setQuery}
      onHome={() => go('Explorar')}
      onAddress={() => go(guest ? 'Explorar' : 'Mi perfil')}
      onOrders={() => go('Mi pedido')}
      onProfile={() => go('Mi perfil')}
      onCart={() => setCartOpen(true)}
      onLogout={onLogout}
      activeOrders={pending}
      cartCount={quantity}
      initials={(me.nombre || 'Cliente').slice(0, 2).toUpperCase()}
      name={me.nombre || 'Mi cuenta'}
      guest={guest}
    />
  ) : null;

  const cartDrawer = role === 'client' ? (
    <CartDrawer
      open={cartOpen}
      cart={cart}
      subtotal={subtotal}
      fee={fee}
      total={total}
      pickup={pickup}
      onPickup={setPickup}
      freeFrom={FREE_SHIPPING_FROM}
      sending={sending}
      guest={guest}
      address={me.direccion || ''}
      notice={cartOpen ? notice : ''}
      onChange={changeQuantity}
      onClear={() => setCart(null)}
      onConfirm={confirmOrder}
      onClose={() => setCartOpen(false)}
      onLogin={onRequestLogin}
      onAddAddress={() => { setCartOpen(false); go(guest ? 'Explorar' : 'Mi perfil'); }}
    />
  ) : null;

  // Pantalla Explorar del cliente: FUERA de #cerca-pro para que tu CSS viejo no la afecte
  if (role === 'client' && page === 'Explorar') {
    return <>
      {topBar}
      <div className="mv-root min-h-screen bg-gradient-to-br from-orange-50 via-brand-surface to-emerald-50 bg-fixed text-brand-charcoal">
        <main className="w-full max-w-[1800px] mx-auto px-3 sm:px-4 pt-8 pb-16">
          {guest && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-coralLight px-5 py-3 text-sm font-semibold text-brand-coral">
              <span>Estás explorando como invitado.</span>
              <button type="button" onClick={onRequestLogin} className="rounded-xl bg-brand-coral px-4 py-2 text-xs font-bold text-white">Iniciar sesión para comprar</button>
            </div>
          )}
          {notice && <div role="status" className="mb-6 rounded-2xl bg-brand-mintLight px-5 py-3 text-sm font-semibold text-emerald-800">{notice}</div>}
          <MarketHome
            showSearch={false}
            stores={visible.map(toCard)}
            loading={negocios === null}
            greeting={me.nombre ? `Hola, ${me.nombre}. ¿Qué se te antoja?` : '¿Qué se te antoja hoy?'}
            address={me.direccion || 'Agrega tu dirección en Mi perfil'}
            query={query}
            onQuery={setQuery}
            category={category}
            onCategory={setCategory}
            onOpen={openStore}
          />
        </main>
        <p className="pb-8 text-center text-xs text-gray-400">KliparkLob · Tu tienda, más cerca de ti</p>
      </div>
      {cartDrawer}
      {storeModal && store && (
        <StoreModal
          key={store.id}
          store={toCard(store)}
          products={modalProducts}
          loading={storeProducts === null}
          cartItems={cart?.storeId === store.id ? cart.items : []}
          cartCount={quantity}
          cartTotal={subtotal}
          canOrder={store.abierto !== false}
          notice={notice}
          onAdd={addProduct}
          onChange={changeQuantity}
          onClose={() => setStoreModal(false)}
          onCart={() => setCartOpen(true)}
        />
      )}
    </>;
  }

  return <>
  {topBar}
  {cartDrawer}
  <div id="cerca-pro" className={role === 'client' ? 'mv' : ''}>
    <div className="app">
      {role === 'business' && (
      <aside className={`rail ${railOpen ? 'open' : ''}`} aria-label="Navegación principal">
        <button type="button" className="rail-logo" onClick={() => setRailOpen(o => !o)} aria-expanded={railOpen} aria-label="Mostrar u ocultar menú">
          <span className="rail-ico"><Store aria-hidden="true" /></span>
          <span className="rail-txt"><b>KliparkLob</b><small>Tu tienda, más cerca</small></span>
        </button>

        <nav className="rail-nav">
          {navigation.map(([label, Icon, hint]) => (
            <button type="button" key={label} className="rail-item" aria-pressed={page === label} aria-label={label} title={label} onClick={() => go(label)}>
              <span className="rail-ico"><Icon aria-hidden="true" />{label === 'Pedidos' && pending > 0 && <i className="rail-dot">{pending}</i>}</span>
              <span className="rail-txt"><b>{label}</b><small>{hint}</small></span>
            </button>
          ))}
        </nav>

        <div className="rail-bottom">
          {role === 'client' && (
            <button type="button" className="rail-item cart" aria-pressed={page === 'Carrito'} aria-label="Carrito" title="Carrito" onClick={() => go('Carrito')}>
              <span className="rail-ico"><ShoppingBag aria-hidden="true" />{quantity > 0 && <i className="rail-dot">{quantity}</i>}</span>
              <span className="rail-txt"><b>Carrito</b><small>{quantity ? `${quantity} producto(s) · ${money(subtotal)}` : 'Aún vacío'}</small></span>
            </button>
          )}
          <div className="rail-user">
            <span className="avatar" aria-label={guest ? 'Invitado' : me.nombre || 'Tu cuenta'}>{guest ? 'IN' : (me.nombre || (role === 'client' ? 'Cliente' : 'Negocio')).slice(0, 2).toUpperCase()}</span>
            <span className="rail-txt"><b>{guest ? 'Invitado' : me.nombre || (role === 'client' ? 'Cliente' : 'Negocio')}</b><small>{role === 'client' ? 'Cuenta de cliente' : 'Cuenta de negocio'}</small></span>
          </div>
          <button type="button" className="rail-item out" aria-label={guest ? 'Salir' : 'Cerrar sesión'} title={guest ? 'Salir' : 'Cerrar sesión'} onClick={onLogout}>
            <span className="rail-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg></span>
            <span className="rail-txt"><b>{guest ? 'Salir' : 'Cerrar sesión'}</b><small>Hasta pronto</small></span>
          </button>
        </div>
      </aside>
      )}

      <div className="kl-main">
      <main>{guest && <div className="notice row"><span>Estás explorando como invitado.</span><Button secondary onClick={onRequestLogin}>Iniciar sesión para comprar</Button></div>}<div aria-live="polite">{notice && <div className="notice">{notice}</div>}</div>

      {((role === 'client' && page === 'Tienda') || (role === 'business' && page === 'Escaparate')) && (store ? <>
        <StoreHero store={store} products={shownProducts} onBack={() => setPage(backPage)} canOrder={role === 'client' && store.abierto !== false} />
        <div className="orders"><section className="panel" id="sv-menu"><div className="section-heading"><h2>Menú</h2></div>
          {shownProducts === null && <p className="muted">Cargando productos…</p>}
          {shownProducts?.length === 0 && <p className="muted">Este negocio aún no tiene productos.</p>}
          {shownProducts?.map(product => <div className="product" key={product.id}><div className="product-art">{product.imagen ? <img src={product.imagen} alt="" /> : <store.Icon aria-hidden="true" />}</div><div className="product-info"><h3>{product.name}</h3><p className="muted">{product.description}</p><strong>{money(product.price)}</strong>{typeof product.stock === 'number' && product.stock > 0 && product.stock <= (store.umbral ?? 5) && <span className="badge" style={{ marginLeft: 8 }}>¡Quedan {product.stock}!</span>}</div><Button disabled={role === 'business' || soldOut(product) || store.abierto === false} onClick={() => addProduct(product)}>{role === 'business' ? 'Vista previa' : soldOut(product) ? 'Agotado' : store.abierto === false ? 'Cerrado' : 'Agregar +'}</Button></div>)}
        </section>
        <section className="panel" id="sv-info">
          <h2>Tu pedido</h2>
          <div className="time"><Bike aria-hidden="true" />Envío {money(DELIVERY_FEE)}</div>
          <p className="muted">También puedes recoger en el local.</p>
          {store.telefono && <p className="muted">Teléfono: {store.telefono}</p>}
          {store.horario && typeof store.horario === 'object' && (
            <div className="hours">
              <strong>Horario</strong>
              {DIAS_RESUMEN.map(({ id, nombre }) => {
                const d = store.horario[id];
                return <div key={id} className="hours-row"><span>{nombre}</span><span>{d?.activo && d?.apertura && d?.cierre ? `${d.apertura} - ${d.cierre}` : 'Cerrado'}</span></div>;
              })}
            </div>
          )}
          <div className="total row"><strong>{quantity} producto(s)</strong><strong>{money(subtotal)}</strong></div>
          {role === 'client' && <Button onClick={() => setCartOpen(true)}>Revisar carrito</Button>}
        </section></div>
      </> : <section className="panel"><p className="muted">Cargando negocio…</p><Button secondary onClick={() => setPage(backPage)}>Volver</Button></section>)}

      {role === 'client' && page === 'Carrito' && <>
        <Intro title="Tu carrito" subtitle="Revisa los detalles antes de confirmar." />
        {cart ? <div className="orders"><section className="panel"><h2>{cart.storeName}</h2>{cart.items.map(item => <div className="product" key={item.id}><div className="product-info"><h3>{item.name}</h3><p className="muted">{item.quantity} × {money(item.price)}</p></div><Button secondary aria-label={`Quitar una unidad de ${item.name}`} onClick={() => changeQuantity(item.id, -1)}>−</Button><Button secondary aria-label={`Agregar una unidad de ${item.name}`} onClick={() => changeQuantity(item.id, 1)}>+</Button></div>)}<h3 style={{ marginTop: 20 }}>Forma de entrega</h3><div className="filters" style={{ marginTop: 12 }}><button type="button" aria-pressed={!pickup} onClick={() => setPickup(false)}><Bike aria-hidden="true" />A domicilio</button><button type="button" aria-pressed={pickup} onClick={() => setPickup(true)}><Store aria-hidden="true" />Recoger</button></div><Button secondary onClick={() => setCart(null)}>Vaciar carrito</Button></section><section className="panel"><h2>Resumen del pedido</h2><div className="order row"><span>Productos</span><strong>{money(subtotal)}</strong></div><div className="order row"><span>Envío</span><strong>{money(fee)}</strong></div><div className="total row"><strong>Total</strong><h2>{money(total)}</h2></div><p className="muted" style={{ marginBottom: 16 }}>Pago en efectivo al recibir.</p><Button disabled={sending} onClick={confirmOrder}>{guest ? 'Iniciar sesión para confirmar' : sending ? 'Enviando…' : 'Confirmar pedido'}</Button></section></div> : <section className="panel"><h2>Aquí comienza tu próximo antojo</h2><p className="muted" style={{ margin: '12px 0 20px' }}>Agrega un producto de un negocio cercano.</p><Button onClick={() => setPage('Explorar')}>Explorar negocios</Button></section>}
      </>}

      {role === 'client' && page === 'Mi pedido' && <><Intro title="Mis pedidos" subtitle="Cada paso, claro y a la vista." /><div className="orders">{orders.map(order => <OrderCard key={order.id} order={order} />)}</div>{!orders.length && <section className="panel"><h2>Tu primer pedido te espera</h2><Button onClick={() => setPage('Explorar')}>Explorar negocios</Button></section>}</>}

      {role === 'client' && page === 'Mi perfil' && !guest && <><Intro title="Mi perfil" subtitle="Tus datos y tu dirección de entrega." /><ClientProfile uid={uid} me={me} orders={orders} onSaved={patch => setMe(previous => ({ ...previous, ...patch }))} onSeeOrders={() => setPage('Mi pedido')} /></>}

      {role === 'business' && page === 'Resumen' && <>
        <Intro title="Todo listo para vender." subtitle="Tus pedidos y tu operación, en un solo lugar."><button type="button" className="badge green" onClick={toggleOpen}>{open ? '● Abierto · Pausar' : '● Pausado · Abrir'}</button></Intro>
        <div className="stats"><div className="stat"><span className="muted">Ventas completadas</span><strong>{money(completed.reduce((sum, o) => sum + o.subtotal, 0))}</strong><small>{completed.length} pedidos completados</small></div><div className="stat"><span className="muted">Pedidos por atender</span><strong>{orders.filter(o => o.estado < 3).length}</strong><small>Pedidos de tu negocio</small></div><div className="stat"><span className="muted">Pedidos totales</span><strong>{orders.length}</strong><small>Desde que abriste</small></div></div>
        <div className="orders"><section className="panel"><h2>Pedidos activos</h2><p className="muted" style={{ margin: '12px 0 20px' }}>{orders.length ? 'Consulta el estado y confirma los pedidos.' : 'Aún no hay pedidos. Los nuevos pedidos de tus clientes aparecerán aquí.'}</p><Button onClick={() => setPage('Pedidos')}>Gestionar pedidos</Button></section><section className="panel"><span className="badge green">OPERACIÓN DEL LOCAL</span><h2 style={{ marginTop: 16 }}>Tu catálogo al día</h2><p className="muted" style={{ margin: '10px 0 20px' }}>Mantén disponibles solo los productos que puedes preparar hoy.</p>{low.length > 0 && <p className="notice">⚠ Pocas existencias: {low.map(p => `${p.name} (${p.stock})`).join(', ')}</p>}<Button secondary onClick={() => setPage('Productos')}>Administrar productos</Button></section></div>
      </>}

      {role === 'business' && page === 'Pedidos' && <><Intro title="Centro de pedidos" subtitle="Cada pedido por estado, con su tiempo restante." />
        <OrdersBoard
          orders={orders}
          autoPedidos={autoAccept}
          prepBaseMin={myNegocio?.prepBaseMin}
          autoFailed={autoFailed}
          onToggleAuto={toggleAuto}
          onSaveBase={saveBase}
          onAccept={advance}
          onExtend={(o, m) => extendOrder(o, m).then(() => setNotice(`Se agregaron ${m} minutos al pedido #${o.id.slice(0, 6).toUpperCase()}.`)).catch(fail)}
          onFinishing={o => markFinishing(o.id).catch(() => {})}
          onFinish={o => finishOrder(o.id).then(() => setNotice('Pedido confirmado como listo. El cliente ya puede verlo.')).catch(fail)}
          onDeliver={advance}
          onCancel={setToCancel}
        />
        {!orders.length && <section className="panel" style={{ marginTop: 16 }}><h2>Sin pedidos por ahora</h2><p className="muted">Los pedidos nuevos aparecerán aquí al instante.</p></section>}</>}

      {role === 'business' && page === 'Productos' && <><Intro title="Tu menú, siempre listo." subtitle="Agrega productos con foto, descripción y precio." />{uid && <BusinessProducts negocioId={uid} items={products} onChange={setProducts} loadError={productsError} lowStock={lowLimit} />}</>}

      {role === 'business' && page === 'Mi negocio' && <><Intro title="Un local con identidad." subtitle="Así te encontrarán tus clientes." />{myNegocio ? <><div className="orders"><section className="panel"><span className="badge green">{open ? 'Abierto' : 'Pausado'}</span><h2 style={{ marginTop: 16 }}>{myNegocio.nombre}</h2><p className="muted" style={{ margin: '10px 0' }}>{myNegocio.categoria}{myNegocio.descripcion ? ` · ${myNegocio.descripcion}` : ''}</p><div className="time"><Bike aria-hidden="true" />Entrega a domicilio y recogida</div><Button secondary onClick={toggleOpen}>{open ? 'Pausar nuevos pedidos' : 'Abrir negocio'}</Button></section><section className="panel"><h2>Vista del cliente</h2><p className="muted" style={{ margin: '12px 0 20px' }}>Comprueba la presentación de tu menú.</p><Button onClick={() => setPage('Escaparate')}>Ver escaparate</Button></section></div><BusinessProfile uid={uid} negocio={myNegocio} /></> : <section className="panel"><p className="muted">Cargando tu negocio…</p></section>}</>}
      </main>
      </div>
    </div>
    {toCancel && <div className="modal-bg" onClick={() => setToCancel(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title" onClick={e => e.stopPropagation()} onKeyDown={e => e.key === 'Escape' && setToCancel(null)}><h2 id="cancel-title">¿Cancelar este pedido?</h2><p className="muted">El cliente verá que el pedido fue cancelado.{toCancel.estado >= 1 ? ' Las existencias descontadas se devolverán al inventario.' : ''}</p><div className="modal-actions"><button type="button" className="secondary" autoFocus onClick={() => setToCancel(null)}>No, conservar</button><button type="button" className="danger" onClick={confirmCancel}>Sí, cancelar pedido</button></div></div></div>}
    <p className="foot">KliparkLob · Tu tienda, más cerca de ti</p>
  </div>
  </>;
}