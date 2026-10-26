import React, { useState, useEffect } from 'react';
import { Store, MapPin, ShoppingBag, Compass, Package, LayoutDashboard, ReceiptText, Utensils, Coffee, CakeSlice, Search, ArrowRight, ArrowUpRight, HeartHandshake, Clock, Bike, Grid2X2 } from './KliparkIcons';
import './KliparkDashboard.css';
import BusinessProducts from './BusinessProducts';
import { listProducts, friendlyProductError } from './productService';
import { watchNegocios, watchNegocio, updateNegocio, watchOrders, createOrder, advanceOrder, friendlyMarketError } from './marketService';

const DELIVERY_FEE = 20; // Envío fijo por ahora
const statusLabels = ['Esperando aceptación', 'En preparación', 'Listo para entregar', 'Entregado'];
const ICONS = { Comida: Utensils, Bebidas: Coffee, Postres: CakeSlice };
const COVERS = { Postres: 'cake', Bebidas: 'coffee' };
const decorate = n => ({ ...n, Icon: ICONS[n.categoria] || Store, cover: COVERS[n.categoria] || '' });
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);

function Button({ children, secondary = false, className = '', ...props }) {
  return <button type="button" className={`${secondary ? 'secondary' : 'primary'} ${className}`} {...props}>{children}</button>;
}
function Intro({ title, subtitle, children }) {
  return <div className="intro"><div><h1>{title}</h1><p className="muted">{subtitle}</p></div>{children}</div>;
}
function Hero({ store, onExplore }) {
  const Icon = store?.Icon || Store;
  return <section className="hero"><div><div className="eyebrow">{store ? (store.categoria || 'NEGOCIO').toUpperCase() : 'DE TU BARRIO A TU PUERTA'}</div><h2>{store ? <>Sabor local,<br />hecho para ti.</> : <>Pequeños negocios.<br />Grandes sabores.</>}</h2><p>{store ? `${store.abierto === false ? 'Cerrado temporalmente' : 'Abierto'} · Envío ${money(DELIVERY_FEE)}` : 'Descubre lo que tu comunidad tiene para ti y apoya a quienes le dan vida.'}</p>{onExplore && <button type="button" onClick={onExplore}>Descubrir negocios <ArrowRight aria-hidden="true" /></button>}</div><div className="art" aria-hidden="true"><div className="orb"><Icon /></div><span className="floating">Hecho aquí. Hecho con cariño.</span></div></section>;
}
function OrderCard({ order, business = false, onAdvance }) {
  return <section className="panel">
    <div className="row"><h2>Pedido #{order.id.slice(0, 6).toUpperCase()}</h2><span className="badge">{statusLabels[order.estado]}</span></div>
    <p className="muted" style={{ marginTop: 8 }}>{business ? `Cliente: ${order.clienteNombre}` : order.negocioNombre} · {order.recoger ? 'Recoger en local' : 'Entrega a domicilio'}</p>
    {order.items.map(item => <div className="order row" key={item.id}><span>{item.quantity} × {item.name}</span><strong>{money(item.price * item.quantity)}</strong></div>)}
    <div className="total row"><strong>Total</strong><h2>{money(order.total)}</h2></div>
    {business
      ? order.estado < 3 && <Button onClick={() => onAdvance(order)}>{['Aceptar y preparar', 'Marcar como listo', 'Confirmar entrega'][order.estado]}</Button>
      : <ol className="timeline">{['Pedido recibido', 'Confirmación del negocio', 'Preparación finalizada', order.recoger ? 'Recogido en local' : 'Entregado'].map((label, i) => <li key={label} className={i <= order.estado ? 'done' : ''}>{label}</li>)}</ol>}
  </section>;
}

export default function KliparkDashboard({ accountRole, profile = {}, onLogout, onRequestLogin }) {
  const role = accountRole === 'negocio' ? 'business' : 'client';
  const guest = accountRole === 'invitado';
  const uid = profile.uid;
  const [page, setPage] = useState(role === 'business' ? 'Resumen' : 'Explorar');
  const [negocios, setNegocios] = useState(null);      // todos los negocios (cliente)
  const [myNegocio, setMyNegocio] = useState(null);    // mi negocio (negocio)
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState(null);      // productos de mi negocio
  const [productsError, setProductsError] = useState('');
  const [storeId, setStoreId] = useState(null);
  const [storeProducts, setStoreProducts] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todo');
  const [cart, setCart] = useState(null);
  const [pickup, setPickup] = useState(false);
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const fail = e => setNotice(friendlyMarketError(e));

  useEffect(() => {
    if (role === 'client') return watchNegocios(list => setNegocios(list.map(decorate)), e => { setNegocios([]); fail(e); });
  }, [role]);
  useEffect(() => {
    if (role !== 'business' || !uid) return;
    const stops = [watchNegocio(uid, n => setMyNegocio(n && decorate(n)), fail), watchOrders('negocioId', uid, setOrders, fail)];
    listProducts(uid).then(setProducts).catch(e => { setProducts([]); setProductsError(friendlyProductError(e)); });
    return () => stops.forEach(stop => stop());
  }, [role, uid]);
  useEffect(() => {
    if (role === 'client' && !guest && uid) return watchOrders('clienteId', uid, setOrders, fail);
  }, [role, guest, uid]);
  useEffect(() => {
    if (page !== 'Tienda' || !storeId) return;
    setStoreProducts(null);
    listProducts(storeId).then(setStoreProducts).catch(e => { setStoreProducts([]); fail(e); });
  }, [page, storeId]);

  const open = myNegocio ? myNegocio.abierto !== false : true;
  const store = role === 'business' ? myNegocio : negocios?.find(n => n.id === storeId);
  const shownProducts = role === 'business' ? products : storeProducts;
  const quantity = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const subtotal = cart?.items.reduce((sum, item) => sum + item.quantity * item.price, 0) || 0;
  const fee = pickup ? 0 : DELIVERY_FEE;
  const total = subtotal + fee;
  const completed = orders.filter(o => o.estado === 3);
  const visible = (negocios || []).filter(n => (category === 'Todo' || n.categoria === category) && n.nombre.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));

  function addProduct(product) {
    if (cart && cart.storeId !== store.id) { setNotice('Tu carrito pertenece a otro negocio. Finaliza o vacía ese carrito antes de comprar aquí.'); return; }
    setCart(previous => {
      const items = previous?.items || [];
      const exists = items.some(item => item.id === product.id);
      return { storeId: store.id, storeName: store.nombre, items: exists ? items.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { id: product.id, name: product.name, price: product.price, quantity: 1 }] };
    });
    setNotice('Producto agregado al carrito.');
  }
  function changeQuantity(id, amount) {
    setCart(previous => {
      if (!previous) return null;
      const items = previous.items.map(item => item.id === id ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0);
      return items.length ? { ...previous, items } : null;
    });
  }
  async function confirmOrder() {
    if (guest) { onRequestLogin?.(); return; }
    if (!cart || sending) return;
    setSending(true);
    try {
      await createOrder({ negocioId: cart.storeId, negocioNombre: cart.storeName, clienteId: uid, clienteNombre: profile.nombre || 'Cliente', items: cart.items, subtotal, envio: fee, total, recoger: pickup });
      setCart(null); setPage('Mi pedido'); setNotice('¡Pedido enviado! El negocio lo verá de inmediato.');
    } catch (e) { fail(e); } finally { setSending(false); }
  }
  const advance = order => advanceOrder(order.id, order.estado + 1).catch(fail);
  const toggleOpen = () => updateNegocio(uid, { abierto: !open }).catch(fail);
  const navigation = role === 'client' ? [['Explorar', Compass], ['Mi pedido', Package], ['Carrito', ShoppingBag]] : [['Resumen', LayoutDashboard], ['Pedidos', ReceiptText], ['Productos', Utensils], ['Mi negocio', Store]];
  const backPage = role === 'business' ? 'Mi negocio' : 'Explorar';

  return <div id="cerca-pro">
    <div className="app">
      <header className="top"><div className="brand"><Store aria-hidden="true" />KliparkLob<small>Tu tienda, más cerca de ti</small></div><div className="place"><MapPin aria-hidden="true" /><div>Entregar en<strong>Centro · Chilpancingo</strong></div></div><div className="top-actions">{role === 'client' && <button type="button" className="cart" onClick={() => setPage('Carrito')}><ShoppingBag aria-hidden="true" />Carrito · {quantity}</button>}<span className="avatar" aria-label={guest ? 'Invitado' : profile.nombre || 'Tu cuenta'}>{guest ? 'IN' : (profile.nombre || (role === 'client' ? 'Cliente' : 'Negocio')).slice(0, 2).toUpperCase()}</span><button type="button" className="session-button" onClick={onLogout}>{guest ? 'Salir' : 'Cerrar sesión'}</button></div></header>
      <div className="layout"><nav className="side" aria-label="Navegación principal"><div className="side-label">{role === 'client' ? 'DESCUBRE TU ZONA' : 'TU NEGOCIO'}</div>{navigation.map(([label, Icon]) => <button type="button" key={label} aria-pressed={page === label} onClick={() => { setPage(label); setNotice(''); }}><Icon aria-hidden="true" />{label}</button>)}<div className="local-note"><HeartHandshake aria-hidden="true" /><strong>Crezcamos juntos</strong>El comercio de tu barrio, ahora más cerca.</div></nav>
      <main>{guest && <div className="notice row"><span>Estás explorando como invitado.</span><Button secondary onClick={onRequestLogin}>Iniciar sesión para comprar</Button></div>}<div aria-live="polite">{notice && <div className="notice">{notice}</div>}</div>

      {role === 'client' && page === 'Explorar' && <>
        <Intro title="¿Qué se te antoja hoy?" subtitle={profile.nombre ? `Hola, ${profile.nombre}. Tus favoritos locales te esperan.` : 'Tus favoritos locales, a un pedido de distancia.'}><label className="search"><Search aria-hidden="true" /><input aria-label="Buscar negocios" placeholder="Busca tu negocio favorito" value={query} onChange={e => setQuery(e.target.value)} /></label></Intro>
        <Hero onExplore={() => document.getElementById('cerca-stores')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} />
        <div className="filters">{[['Todo', Grid2X2], ['Comida', Utensils], ['Bebidas', Coffee], ['Postres', CakeSlice]].map(([label, Icon]) => <button type="button" key={label} aria-pressed={category === label} onClick={() => setCategory(label)}><Icon aria-hidden="true" />{label}</button>)}</div>
        <div className="section-heading"><h2>Cerca de ti</h2><span>Negocios de tu comunidad</span></div>
        {negocios === null && <p className="muted">Cargando negocios…</p>}
        <div className="grid" id="cerca-stores">{visible.map(s => <article className="store" key={s.id}><div className={`cover ${s.cover}`}><span className="tag">{s.abierto === false ? 'Cerrado temporalmente' : s.categoria}</span><s.Icon aria-hidden="true" /></div><div className="store-content"><div className="row"><h3>{s.nombre}</h3></div><p className="muted">{s.descripcion || `Negocio local · ${s.categoria}`}</p><span className="badge green">Envío {money(DELIVERY_FEE)}</span><button type="button" onClick={() => { setStoreId(s.id); setPage('Tienda'); setNotice(''); }}>Explorar menú <ArrowUpRight aria-hidden="true" /></button></div></article>)}</div>
        {negocios && !visible.length && <p className="muted">{negocios.length ? 'No encontramos negocios con esos filtros.' : 'Aún no hay negocios registrados. Cuando un negocio se registre, aparecerá aquí.'}</p>}
      </>}

      {((role === 'client' && page === 'Tienda') || (role === 'business' && page === 'Escaparate')) && (store ? <>
        <Intro title={store.nombre} subtitle={store.descripcion || `Negocio local · ${store.categoria}`}><Button secondary onClick={() => setPage(backPage)}>Volver</Button></Intro><Hero store={store} />
        <div className="orders"><section className="panel"><div className="section-heading"><h2>Menú</h2></div>
          {shownProducts === null && <p className="muted">Cargando productos…</p>}
          {shownProducts?.length === 0 && <p className="muted">Este negocio aún no tiene productos.</p>}
          {shownProducts?.map(product => <div className="product" key={product.id}><div className="product-art">{product.imagen ? <img src={product.imagen} alt="" /> : <store.Icon aria-hidden="true" />}</div><div className="product-info"><h3>{product.name}</h3><p className="muted">{product.description}</p><strong>{money(product.price)}</strong></div><Button disabled={role === 'business' || !product.available || store.abierto === false} onClick={() => addProduct(product)}>{role === 'business' ? 'Vista previa' : !product.available ? 'Agotado' : store.abierto === false ? 'Cerrado' : 'Agregar +'}</Button></div>)}
        </section><section className="panel"><h2>Tu pedido</h2><div className="time"><Bike aria-hidden="true" />Envío {money(DELIVERY_FEE)}</div><p className="muted">También puedes recoger en el local.</p><div className="total row"><strong>{quantity} producto(s)</strong><strong>{money(subtotal)}</strong></div>{role === 'client' && <Button onClick={() => setPage('Carrito')}>Revisar carrito</Button>}</section></div>
      </> : <section className="panel"><p className="muted">Cargando negocio…</p><Button secondary onClick={() => setPage(backPage)}>Volver</Button></section>)}

      {role === 'client' && page === 'Carrito' && <>
        <Intro title="Tu carrito" subtitle="Revisa los detalles antes de confirmar." />
        {cart ? <div className="orders"><section className="panel"><h2>{cart.storeName}</h2>{cart.items.map(item => <div className="product" key={item.id}><div className="product-info"><h3>{item.name}</h3><p className="muted">{item.quantity} × {money(item.price)}</p></div><Button secondary aria-label={`Quitar una unidad de ${item.name}`} onClick={() => changeQuantity(item.id, -1)}>−</Button><Button secondary aria-label={`Agregar una unidad de ${item.name}`} onClick={() => changeQuantity(item.id, 1)}>+</Button></div>)}<h3 style={{ marginTop: 20 }}>Forma de entrega</h3><div className="filters" style={{ marginTop: 12 }}><button type="button" aria-pressed={!pickup} onClick={() => setPickup(false)}><Bike aria-hidden="true" />A domicilio</button><button type="button" aria-pressed={pickup} onClick={() => setPickup(true)}><Store aria-hidden="true" />Recoger</button></div><Button secondary onClick={() => setCart(null)}>Vaciar carrito</Button></section><section className="panel"><h2>Resumen del pedido</h2><div className="order row"><span>Productos</span><strong>{money(subtotal)}</strong></div><div className="order row"><span>Envío</span><strong>{money(fee)}</strong></div><div className="total row"><strong>Total</strong><h2>{money(total)}</h2></div><p className="muted" style={{ marginBottom: 16 }}>Pago en efectivo al recibir.</p><Button disabled={sending} onClick={confirmOrder}>{guest ? 'Iniciar sesión para confirmar' : sending ? 'Enviando…' : 'Confirmar pedido'}</Button></section></div> : <section className="panel"><h2>Aquí comienza tu próximo antojo</h2><p className="muted" style={{ margin: '12px 0 20px' }}>Agrega un producto de un negocio cercano.</p><Button onClick={() => setPage('Explorar')}>Explorar negocios</Button></section>}
      </>}

      {role === 'client' && page === 'Mi pedido' && <><Intro title="Mis pedidos" subtitle="Cada paso, claro y a la vista." /><div className="orders">{orders.map(order => <OrderCard key={order.id} order={order} />)}</div>{!orders.length && <section className="panel"><h2>Tu primer pedido te espera</h2><Button onClick={() => setPage('Explorar')}>Explorar negocios</Button></section>}</>}

      {role === 'business' && page === 'Resumen' && <>
        <Intro title="Todo listo para vender." subtitle="Tus pedidos y tu operación, en un solo lugar."><button type="button" className="badge green" onClick={toggleOpen}>{open ? '● Abierto · Pausar' : '● Pausado · Abrir'}</button></Intro>
        <div className="stats"><div className="stat"><span className="muted">Ventas completadas</span><strong>{money(completed.reduce((sum, o) => sum + o.subtotal, 0))}</strong><small>{completed.length} pedidos completados</small></div><div className="stat"><span className="muted">Pedidos por atender</span><strong>{orders.filter(o => o.estado < 3).length}</strong><small>Pedidos de tu negocio</small></div><div className="stat"><span className="muted">Pedidos totales</span><strong>{orders.length}</strong><small>Desde que abriste</small></div></div>
        <div className="orders"><section className="panel"><h2>Pedidos activos</h2><p className="muted" style={{ margin: '12px 0 20px' }}>{orders.length ? 'Consulta el estado y confirma los pedidos.' : 'Aún no hay pedidos. Los nuevos pedidos de tus clientes aparecerán aquí.'}</p><Button onClick={() => setPage('Pedidos')}>Gestionar pedidos</Button></section><section className="panel"><span className="badge green">OPERACIÓN DEL LOCAL</span><h2 style={{ marginTop: 16 }}>Tu catálogo al día</h2><p className="muted" style={{ margin: '10px 0 20px' }}>Mantén disponibles solo los productos que puedes preparar hoy.</p><Button secondary onClick={() => setPage('Productos')}>Administrar productos</Button></section></div>
      </>}

      {role === 'business' && page === 'Pedidos' && <><Intro title="Centro de pedidos" subtitle="Confirma, prepara y entrega sin perder el ritmo." /><div className="orders">{orders.map(order => <OrderCard key={order.id} order={order} business onAdvance={advance} />)}</div>{!orders.length && <section className="panel"><h2>Sin pedidos por ahora</h2><p className="muted">Los pedidos de tu negocio aparecerán aquí.</p></section>}</>}

      {role === 'business' && page === 'Productos' && <><Intro title="Tu menú, siempre listo." subtitle="Agrega productos con foto, descripción y precio." />{uid && <BusinessProducts negocioId={uid} items={products} onChange={setProducts} loadError={productsError} />}</>}

      {role === 'business' && page === 'Mi negocio' && <><Intro title="Un local con identidad." subtitle="Así te encontrarán tus clientes." />{myNegocio ? <div className="orders"><section className="panel"><span className="badge green">{open ? 'Abierto' : 'Pausado'}</span><h2 style={{ marginTop: 16 }}>{myNegocio.nombre}</h2><p className="muted" style={{ margin: '10px 0' }}>{myNegocio.categoria}{myNegocio.descripcion ? ` · ${myNegocio.descripcion}` : ''}</p><div className="time"><Bike aria-hidden="true" />Entrega a domicilio y recogida</div><Button secondary onClick={toggleOpen}>{open ? 'Pausar nuevos pedidos' : 'Abrir negocio'}</Button></section><section className="panel"><h2>Vista del cliente</h2><p className="muted" style={{ margin: '12px 0 20px' }}>Comprueba la presentación de tu menú.</p><Button onClick={() => setPage('Escaparate')}>Ver escaparate</Button></section></div> : <section className="panel"><p className="muted">Cargando tu negocio…</p></section>}</>}
      </main></div>
    </div><p className="foot">KliparkLob · Tu tienda, más cerca de ti</p>
  </div>;
}