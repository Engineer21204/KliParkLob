import React, { useState } from 'react';
import { Store, MapPin, ShoppingBag, Compass, Package, LayoutDashboard, ReceiptText, Utensils, Coffee, CakeSlice, Search, ArrowRight, ArrowUpRight, HeartHandshake, Clock, Bike, Grid2X2 } from './KliparkIcons';
import './KliparkDashboard.css';

const initialStores = [
  { id: 'tacos', name: 'Tacos El Sabor', category: 'Comida', Icon: Utensils, cover: '', tag: 'Favorito del barrio', rating: '4.9', description: 'Mexicana · Tacos y antojitos', time: '25–35 min', distance: '0.8 km', fee: 20, products: [{ id: 'tacos-1', name: 'Orden de tacos al pastor', description: '3 tacos, cebolla, cilantro y salsa aparte.', price: 60, available: true }] },
  { id: 'pasteles', name: 'Dulce Tentación', category: 'Postres', Icon: CakeSlice, cover: 'cake', tag: 'Hecho en casa', rating: '4.8', description: 'Repostería · Pasteles artesanales', time: '20–30 min', distance: '1.2 km', fee: 15, products: [{ id: 'pastel-1', name: 'Rebanada de pastel', description: 'Chocolate con cobertura artesanal.', price: 55, available: true }] },
  { id: 'cafe', name: 'Café de la Plaza', category: 'Bebidas', Icon: Coffee, cover: 'coffee', tag: 'Tu pausa favorita', rating: '4.9', description: 'Café · Bebidas y pan recién hecho', time: '15–25 min', distance: '0.5 km', fee: 15, products: [{ id: 'cafe-1', name: 'Café latte', description: 'Espresso con leche, presentación de 350 ml.', price: 45, available: true }] },
];
const statusLabels = ['Esperando aceptación', 'En preparación', 'Listo para entregar', 'Entregado'];
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);
function Button({ children, secondary = false, className = '', ...props }) {
  return <button type="button" className={`${secondary ? 'secondary' : 'primary'} ${className}`} {...props}>{children}</button>;
}
function Intro({ title, subtitle, children }) {
  return <div className="intro"><div><h1>{title}</h1><p className="muted">{subtitle}</p></div>{children}</div>;
}
function Hero({ store, onExplore }) {
  const Icon = store?.Icon || Store;
  return <section className="hero"><div><div className="eyebrow">{store ? store.tag.toUpperCase() : 'DE TU BARRIO A TU PUERTA'}</div><h2>{store ? <>Sabor local,<br />hecho para ti.</> : <>Pequeños negocios.<br />Grandes sabores.</>}</h2><p>{store ? `Abierto · ${store.time} · ${store.distance}` : 'Descubre lo que tu comunidad tiene para ti y apoya a quienes le dan vida.'}</p>{onExplore && <button type="button" onClick={onExplore}>Descubrir negocios <ArrowRight aria-hidden="true" /></button>}</div><div className="art" aria-hidden="true"><div className="orb"><Icon /></div><span className="floating">Hecho aquí. Hecho con cariño.</span></div></section>;
}

/** UI de demostración: datos en memoria, sin pagos ni servidor. */
export default function KliparkDashboard({ accountRole, profile = {}, onLogout, onRequestLogin }) {
  const role = accountRole === 'negocio' ? 'business' : 'client';
  const guest = accountRole === 'invitado';
  const [page, setPage] = useState(role === 'business' ? 'Resumen' : 'Explorar');
  const [stores, setStores] = useState(() => initialStores.map((s, index) => index === 0 && accountRole === 'negocio' && profile.nombre ? { ...s, name: profile.nombre } : s));
  const [storeId, setStoreId] = useState('tacos');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todo');
  const [cart, setCart] = useState(null);
  const [pickup, setPickup] = useState(false);
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState({ name: '', price: '' });
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const store = stores.find(s => s.id === storeId);
  const business = stores[0];
  const cartStore = stores.find(s => s.id === cart?.storeId);
  const quantity = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const subtotal = cart?.items.reduce((sum, item) => sum + item.quantity * item.price, 0) || 0;
  const total = subtotal + (pickup ? 0 : cartStore?.fee || 0);
  const businessOrders = orders.filter(order => order.storeId === business.id);
  const completed = businessOrders.filter(order => order.status === 3);
  function addProduct(product) {
    if (cart && cart.storeId !== store.id) {
      setNotice('Tu carrito pertenece a otro negocio. Finaliza o vacía ese carrito antes de comprar aquí.');
      return;
    }
    setCart(previous => {
      const items = previous?.items || [];
      const exists = items.some(item => item.id === product.id);
      return { storeId: store.id, items: exists ? items.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }] };
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
  function confirmOrder() {
    if (guest) { onRequestLogin?.(); return; }
    if (!cart) return;
    setOrders(previous => [{ id: `P-${Date.now()}`, storeId: cart.storeId, storeName: cartStore.name, items: cart.items.map(item => ({ ...item })), total, subtotal, pickup, status: 0 }, ...previous]);
    setCart(null); setPage('Mi pedido'); setNotice('Pedido de demostración confirmado.');
  }
  function updateOrder(id) {
    setOrders(previous => previous.map(order => order.id === id ? { ...order, status: Math.min(3, order.status + 1) } : order));
  }
  function saveProduct(event) {
    event.preventDefault();
    const name = form.name.trim(); const price = Number(form.price);
    if (!name || !Number.isFinite(price) || price <= 0) { setMessage('Escribe un nombre y un precio mayor que cero.'); return; }
    const product = { id: `producto-${Date.now()}`, name, price, description: 'Producto del negocio local.', available: true };
    setStores(previous => previous.map(s => s.id === business.id ? { ...s, products: [...s.products, product] } : s));
    setForm({ name: '', price: '' }); setMessage('Producto agregado al catálogo.');
  }
  function toggleProduct(id) {
    setStores(previous => previous.map(s => s.id === business.id ? { ...s, products: s.products.map(p => p.id === id ? { ...p, available: !p.available } : p) } : s));
  }
  const navigation = role === 'client' ? [['Explorar', Compass], ['Mi pedido', Package], ['Carrito', ShoppingBag]] : [['Resumen', LayoutDashboard], ['Pedidos', ReceiptText], ['Productos', Utensils], ['Mi negocio', Store]];
  function OrderCard({ order, editable = false }) {
    return <section className="panel"><div className="row"><h2>{order.id}</h2><span className="badge">{statusLabels[order.status]}</span></div><p className="muted" style={{ marginTop: 8 }}>{order.storeName} · {order.pickup ? 'Recoger en local' : 'Entrega a domicilio'}</p>{order.items.map(item => <div className="order row" key={item.id}><span>{item.quantity} × {item.name}</span><strong>{money(item.price * item.quantity)}</strong></div>)}<div className="total row"><strong>Total</strong><h2>{money(order.total)}</h2></div>{editable ? <><div className="time"><Clock aria-hidden="true" /> Preparación estimada: 20 min</div>{order.status < 3 && <Button onClick={() => updateOrder(order.id)}>{['Aceptar y preparar', 'Marcar como listo', 'Confirmar entrega'][order.status]}</Button>}</> : <ol className="timeline">{['Pedido recibido', 'Confirmación del negocio', 'Preparación finalizada', order.pickup ? 'Recogido en local' : 'Entregado'].map((label, index) => <li key={label} className={index <= order.status ? 'done' : ''}>{label}</li>)}</ol>}</section>;
  }
  return <div id="cerca-pro">

    <div className="app">
      <header className="top"><div className="brand"><Store aria-hidden="true" />KliparkLob<small>Tu tienda, más cerca de ti</small></div><div className="place"><MapPin aria-hidden="true" /><div>Entregar en<strong>Centro · Chilpancingo</strong></div></div><div className="top-actions">{role === 'client' && <button type="button" className="cart" onClick={() => setPage('Carrito')}><ShoppingBag aria-hidden="true" />Carrito · {quantity}</button>}<span className="avatar" aria-label={guest ? 'Invitado' : profile.nombre || 'Tu cuenta'}>{guest ? 'IN' : (profile.nombre || (role === 'client' ? 'Cliente' : 'Negocio')).slice(0, 2).toUpperCase()}</span><button type="button" className="session-button" onClick={onLogout}>{guest ? 'Salir' : 'Cerrar sesión'}</button></div></header>
      <div className="layout"><nav className="side" aria-label="Navegación principal"><div className="side-label">{role === 'client' ? 'DESCUBRE TU ZONA' : 'TU NEGOCIO'}</div>{navigation.map(([label, Icon]) => <button type="button" key={label} aria-pressed={page === label} onClick={() => { setPage(label); setNotice(''); }}><Icon aria-hidden="true" />{label}</button>)}<div className="local-note"><HeartHandshake aria-hidden="true" /><strong>Crezcamos juntos</strong>El comercio de tu barrio, ahora más cerca.</div></nav>
      <main>{guest && <div className="notice row"><span>Estás explorando como invitado.</span><Button secondary onClick={onRequestLogin}>Iniciar sesión para comprar</Button></div>}<div aria-live="polite">{notice && <div className="notice">{notice}</div>}</div>
      {role === 'client' && page === 'Explorar' && <>
        <Intro title="¿Qué se te antoja hoy?" subtitle={profile.nombre ? `Hola, ${profile.nombre}. Tus favoritos locales te esperan.` : 'Tus favoritos locales, a un pedido de distancia.'}><label className="search"><Search aria-hidden="true" /><input aria-label="Buscar negocios" placeholder="Busca tu negocio favorito" value={query} onChange={event => setQuery(event.target.value)} /></label></Intro>
        <Hero onExplore={() => document.getElementById('cerca-stores')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} />
        <div className="filters">{[['Todo', Grid2X2], ['Comida', Utensils], ['Bebidas', Coffee], ['Postres', CakeSlice]].map(([label, Icon]) => <button type="button" key={label} aria-pressed={category === label} onClick={() => setCategory(label)}><Icon aria-hidden="true" />{label}</button>)}</div>
        <div className="section-heading"><h2>Cerca de ti</h2><span>Negocios de tu comunidad</span></div><div className="grid" id="cerca-stores">{stores.filter(s => (category === 'Todo' || s.category === category) && s.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))).map(s => <article className="store" key={s.id}><div className={`cover ${s.cover}`}><span className="tag">{s.id === business.id && !open ? 'Cerrado temporalmente' : s.tag}</span><s.Icon aria-hidden="true" /></div><div className="store-content"><div className="row"><h3>{s.name}</h3><span className="rating">★ {s.rating}</span></div><p className="muted">{s.description}</p><p className="muted">{s.time} · {s.distance}</p><span className="badge green">Envío {money(s.fee)}</span><button type="button" onClick={() => { setStoreId(s.id); setPage('Tienda'); setNotice(''); }}>Explorar menú <ArrowUpRight aria-hidden="true" /></button></div></article>)}</div>
        {!stores.some(s => (category === 'Todo' || s.category === category) && s.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))) && <p className="muted">No encontramos negocios con esos filtros.</p>}
      </>}
      {((role === 'client' && page === 'Tienda') || (role === 'business' && page === 'Escaparate')) && <>
        <Intro title={store.name} subtitle={store.description}><Button secondary onClick={() => setPage(role === 'business' ? 'Mi negocio' : 'Explorar')}>Volver</Button></Intro><Hero store={store} />
        <div className="orders"><section className="panel"><div className="section-heading"><h2>Favoritos del menú</h2><span>★ {store.rating}</span></div>{store.products.map(product => <div className="product" key={product.id}><div className="product-art"><store.Icon aria-hidden="true" /></div><div className="product-info"><h3>{product.name}</h3><p className="muted">{product.description}</p><strong>{money(product.price)}</strong></div><Button disabled={role === 'business' || !product.available || (store.id === business.id && !open)} onClick={() => addProduct(product)}>{role === 'business' ? 'Vista previa' : !product.available ? 'Agotado' : store.id === business.id && !open ? 'Cerrado' : 'Agregar +'}</Button></div>)}</section><section className="panel"><h2>Tu pedido</h2><div className="time"><Bike aria-hidden="true" />Envío {money(store.fee)} · {store.time}</div><p className="muted">También puedes recoger en el local.</p><div className="total row"><strong>{quantity} producto(s)</strong><strong>{money(subtotal)}</strong></div>{role === 'client' && <Button onClick={() => setPage('Carrito')}>Revisar carrito</Button>}</section></div>
      </>}
      {role === 'client' && page === 'Carrito' && <>
        <Intro title="Tu carrito" subtitle="Revisa los detalles antes de confirmar." />
        {cart ? <div className="orders"><section className="panel"><h2>{cartStore.name}</h2>{cart.items.map(item => <div className="product" key={item.id}><div className="product-info"><h3>{item.name}</h3><p className="muted">{item.quantity} × {money(item.price)}</p></div><Button secondary aria-label={`Quitar una unidad de ${item.name}`} onClick={() => changeQuantity(item.id, -1)}>−</Button><Button secondary aria-label={`Agregar una unidad de ${item.name}`} onClick={() => changeQuantity(item.id, 1)}>+</Button></div>)}<h3 style={{ marginTop: 20 }}>Forma de entrega</h3><div className="filters" style={{ marginTop: 12 }}><button type="button" aria-pressed={!pickup} onClick={() => setPickup(false)}><Bike aria-hidden="true" />A domicilio</button><button type="button" aria-pressed={pickup} onClick={() => setPickup(true)}><Store aria-hidden="true" />Recoger</button></div><p className="muted">{pickup ? 'Calle principal 12 · Dirección de ejemplo' : 'Centro · Calle 5, casa 14 · Dirección de ejemplo'}</p><Button secondary onClick={() => setCart(null)}>Vaciar carrito</Button></section><section className="panel"><h2>Resumen del pedido</h2><div className="order row"><span>Productos</span><strong>{money(subtotal)}</strong></div><div className="order row"><span>Envío</span><strong>{money(pickup ? 0 : cartStore.fee)}</strong></div><div className="total row"><strong>Total</strong><h2>{money(total)}</h2></div><p className="muted" style={{ marginBottom: 16 }}>Pago en efectivo al recibir. Operación de demostración.</p><Button onClick={confirmOrder}>{guest ? 'Iniciar sesión para confirmar' : 'Confirmar pedido'}</Button></section></div> : <section className="panel"><h2>Aquí comienza tu próximo antojo</h2><p className="muted" style={{ margin: '12px 0 20px' }}>Agrega un producto de un negocio cercano.</p><Button onClick={() => setPage('Explorar')}>Explorar negocios</Button></section>}
      </>}
      {role === 'client' && page === 'Mi pedido' && <><Intro title="Mis pedidos" subtitle="Cada paso, claro y a la vista." /><div className="orders">{orders.map(order => <OrderCard key={order.id} order={order} />)}</div>{!orders.length && <section className="panel"><h2>Tu primer pedido te espera</h2><Button onClick={() => setPage('Explorar')}>Explorar negocios</Button></section>}</>}
      {role === 'business' && page === 'Resumen' && <>
        <Intro title="Todo listo para vender." subtitle="Tus pedidos y tu operación, en un solo lugar."><button type="button" className="badge green" onClick={() => setOpen(value => !value)}>{open ? '● Abierto · Pausar' : '● Pausado · Abrir'}</button></Intro>
        <div className="stats"><div className="stat"><span className="muted">Ventas completadas</span><strong>{money(completed.reduce((sum, order) => sum + order.subtotal, 0))}</strong><small>{completed.length} pedidos completados</small></div><div className="stat"><span className="muted">Pedidos por atender</span><strong>{businessOrders.filter(order => order.status < 3).length}</strong><small>Pedidos de tu negocio</small></div><div className="stat"><span className="muted">Preparación estimada</span><strong>20 min</strong><small>Configuración de demostración</small></div></div>
        <div className="orders"><section className="panel"><h2>Pedidos activos</h2><p className="muted" style={{ margin: '12px 0 20px' }}>{businessOrders.length ? 'Consulta el estado y confirma los pedidos.' : 'Aún no hay pedidos. Los nuevos pedidos de tus clientes aparecerán aquí.'}</p><Button onClick={() => setPage('Pedidos')}>Gestionar pedidos</Button></section><section className="panel"><span className="badge green">OPERACIÓN DEL LOCAL</span><h2 style={{ marginTop: 16 }}>Tu catálogo al día</h2><p className="muted" style={{ margin: '10px 0 20px' }}>Mantén disponibles solo los productos que puedes preparar hoy.</p><Button secondary onClick={() => setPage('Productos')}>Administrar productos</Button><div className="time"><Clock aria-hidden="true" />Horario · 13:00 a 22:00</div></section></div>
      </>}
      {role === 'business' && page === 'Pedidos' && <><Intro title="Centro de pedidos" subtitle="Confirma, prepara y entrega sin perder el ritmo." /><div className="orders">{businessOrders.map(order => <OrderCard key={order.id} order={order} editable />)}</div>{!businessOrders.length && <section className="panel"><h2>Sin pedidos por ahora</h2><p className="muted">Los pedidos de tu negocio aparecerán aquí.</p></section>}</>}
      {role === 'business' && page === 'Productos' && <><Intro title="Tu menú, siempre listo." subtitle="Administra precios y disponibilidad." /><div className="orders"><section className="panel"><h2>Catálogo del negocio</h2>{business.products.map(product => <div className="product" key={product.id}><div className="product-art"><Utensils aria-hidden="true" /></div><div className="product-info"><h3>{product.name}</h3><p className="muted">{money(product.price)} · Comida</p></div><label className="muted"><input type="checkbox" checked={product.available} onChange={() => toggleProduct(product.id)} /> Disponible</label></div>)}</section><form className="panel" onSubmit={saveProduct}><h2>Agregar producto</h2><label className="field">Nombre<input required maxLength={100} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Agua de jamaica" /></label><label className="field">Precio en MXN<input required type="number" min="0.01" step="0.01" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="25" /></label><button type="submit" className="primary">Guardar producto</button><p className="muted" aria-live="polite" style={{ marginTop: 12 }}>{message}</p></form></div></>}
      {role === 'business' && page === 'Mi negocio' && <><Intro title="Un local con identidad." subtitle="Así te encontrarán tus clientes." /><div className="orders"><section className="panel"><span className="badge green">{open ? 'Abierto' : 'Pausado'}</span><h2 style={{ marginTop: 16 }}>{business.name}</h2><p className="muted" style={{ margin: '10px 0' }}>{business.description}<br />Calle principal 12, Centro<br />13:00–22:00</p><div className="time"><Bike aria-hidden="true" />Entrega a domicilio y recogida</div><Button secondary onClick={() => setOpen(value => !value)}>{open ? 'Pausar nuevos pedidos' : 'Abrir negocio'}</Button></section><section className="panel"><h2>Vista del cliente</h2><p className="muted" style={{ margin: '12px 0 20px' }}>Comprueba la presentación de tu menú.</p><Button onClick={() => { setStoreId(business.id); setPage('Escaparate'); }}>Ver escaparate</Button></section></div></>}
      </main></div>
    </div><p className="foot">KliparkLob · Tu tienda, más cerca de ti · Datos de demostración en memoria</p>
  </div>;
}
