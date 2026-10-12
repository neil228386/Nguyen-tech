import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, Check, Clock3, LayoutDashboard, LoaderCircle, Package, RefreshCw, Save, Search, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react';
import { useShop } from '../store';
import { api } from '../api';
import { formatPrice } from '../utils';
import './admin.css';

const labels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao hàng', completed: 'Hoàn tất', cancelled: 'Đã hủy' };
const transitions = {
  pending: [{ status: 'confirmed', title: 'Xác nhận đơn', icon: Check }, { status: 'cancelled', title: 'Hủy đơn', icon: X }],
  confirmed: [{ status: 'shipping', title: 'Chuyển sang đang giao', icon: Truck }, { status: 'cancelled', title: 'Hủy đơn', icon: X }],
  shipping: [{ status: 'completed', title: 'Hoàn tất đơn', icon: Check }],
  completed: [],
  cancelled: [],
};
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

function ProductEditor({ product, onSave }) {
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => { setPrice(String(product.price)); setStock(String(product.stock)); }, [product.price, product.stock]);
  const changed = Number(price) !== product.price || Number(stock) !== product.stock;

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const nextPrice = Number(price);
    const nextStock = Number(stock);
    if (!price.trim() || !stock.trim() || !Number.isSafeInteger(nextPrice) || nextPrice < 1000 || nextPrice > 1000000000 || !Number.isSafeInteger(nextStock) || nextStock < 0 || nextStock > 1000000) {
      setError('Giá phải là số nguyên từ 1.000₫ đến 1 tỷ đồng; tồn kho từ 0 đến 1.000.000.');
      return;
    }
    setSaving(true); setError(''); setSaved(false);
    try {
      await onSave(product, { price: nextPrice, stock: nextStock });
      setSaved(true);
    } catch (failure) { setError(failure.message || 'Không thể lưu sản phẩm. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  }

  return <article className="a-product-row">
    <div className="a-product-details"><img src={product.image} alt={product.name} /><div><Link to={`/san-pham/${product.slug}`}><strong>{product.name}</strong></Link><span>{product.brand} · {product.id}</span><span className={product.stock > 0 ? 'a-stock-label' : 'a-stock-label a-stock-empty'}>{product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Đã hết hàng'}</span></div></div>
    <form className="a-product-edit" onSubmit={save}><label>Giá bán (₫)<input className="input" type="number" value={price} onChange={event => { setPrice(event.target.value); setSaved(false); }} min="1000" max="1000000000" step="1" required aria-label={`Giá bán ${product.name}`} disabled={saving} /></label><label>Tồn kho<input className="input" type="number" value={stock} onChange={event => { setStock(event.target.value); setSaved(false); }} min="0" max="1000000" step="1" required aria-label={`Tồn kho ${product.name}`} disabled={saving} /></label><button type="submit" className="btn btn-dark" disabled={saving || !changed} aria-label={`Lưu ${product.name}`}>{saving ? <LoaderCircle size={16} className="a-spin" /> : <Save size={16} />}{saving ? 'Đang lưu…' : 'Lưu'}</button></form>
    {error && <p className="a-row-message a-row-error" role="alert">{error}</p>}{saved && <p className="a-row-message a-row-success" role="status"><Check size={14} /> Đã cập nhật giá và tồn kho.</p>}
  </article>;
}

function OrderCard({ order, onChangeStatus, busy, error }) {
  const actions = transitions[order.status] || [];
  return <article className="a-order-card">
    <div className="a-order-header"><div><strong>{order.number}</strong><span>{new Date(order.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div><span className={`badge a-status-${order.status}`}>{labels[order.status] || order.status}</span></div>
    <div className="a-order-body"><div className="a-order-customer"><h3>Thông tin người nhận</h3><strong>{order.customer.name}</strong><a href={`tel:${order.customer.phone.replace(/[^\d+]/g, '')}`}>{order.customer.phone}</a><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a><p>{[order.customer.address, order.customer.ward, order.customer.district, order.customer.city].filter(Boolean).join(', ')}</p>{order.customer.note && <p className="a-customer-note"><b>Ghi chú:</b> {order.customer.note}</p>}</div><div className="a-order-products"><h3>Sản phẩm <span>({order.items.reduce((sum, item) => sum + item.quantity, 0)})</span></h3>{order.items.map((item, index) => <div className="a-order-item" key={`${item.productId}-${item.color}-${index}`}><img src={item.image} alt={item.name} /><div><strong>{item.name}</strong><span>{item.color} · Số lượng {item.quantity}</span></div><b>{formatPrice(item.price * item.quantity)}</b></div>)}</div></div>
    <div className="a-order-totals"><span>Tạm tính <b>{formatPrice(order.subtotal)}</b></span>{order.discount > 0 && <span>Giảm giá <b>−{formatPrice(order.discount)}</b></span>}<span>Giao hàng <b>{order.shipping === 0 ? 'Miễn phí' : formatPrice(order.shipping)}</b></span><span className="a-order-total">Tổng thanh toán <b>{formatPrice(order.total)}</b></span></div>
    <div className="a-order-footer"><span>Thanh toán khi nhận hàng (COD)</span><div>{actions.length ? actions.map(action => { const Icon = action.icon; return <button key={action.status} className={`btn ${action.status === 'cancelled' ? 'btn-outline a-cancel-button' : 'btn-dark'}`} type="button" onClick={() => onChangeStatus(order, action.status)} disabled={busy} aria-label={`${action.title} ${order.number}`}><Icon size={15} />{action.title}</button>; }) : <span className="a-terminal-label">{order.status === 'completed' ? 'Đơn hàng đã hoàn tất' : 'Đơn hàng đã hủy'}</span>}</div></div>
    {error && <div className="a-order-error" role="alert">{error}</div>}
  </article>;
}

export default function AdminPage() {
  const { user, toast, refreshProducts } = useShop();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [productsError, setProductsError] = useState('');
  const [orderQuery, setOrderQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyOrder, setBusyOrder] = useState('');
  const [actionError, setActionError] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true); setOrdersError('');
    try { const data = await api('/api/admin/orders'); setOrders(data.orders); setOrdersLoaded(true); }
    catch (failure) { setOrdersError(failure.message || 'Không thể tải danh sách đơn hàng.'); }
    finally { setLoadingOrders(false); }
  }, []);
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true); setProductsError('');
    try { const data = await api('/api/admin/products'); setProducts(data.products); }
    catch (failure) { setProductsError(failure.message || 'Không thể tải danh sách sản phẩm.'); }
    finally { setLoadingProducts(false); }
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadOrders(); loadProducts();
  }, [user?.id, user?.role, loadOrders, loadProducts]);

  const metrics = useMemo(() => ({
    revenue: orders.filter(order => order.status === 'completed').reduce((sum, order) => sum + order.total, 0),
    pending: orders.filter(order => order.status === 'pending').length,
    shipping: orders.filter(order => order.status === 'shipping').length,
  }), [orders]);
  const matchingOrders = useMemo(() => {
    const query = normalize(orderQuery.trim());
    return orders.filter(order => (statusFilter === 'all' || order.status === statusFilter) && normalize(`${order.number} ${order.customer.name} ${order.customer.email} ${order.customer.phone}`).includes(query));
  }, [orders, orderQuery, statusFilter]);
  const matchingProducts = useMemo(() => {
    const query = normalize(productQuery.trim());
    return products.filter(product => normalize(`${product.name} ${product.brand} ${product.id}`).includes(query));
  }, [products, productQuery]);

  async function changeStatus(order, status) {
    if (busyOrder || !transitions[order.status]?.some(action => action.status === status)) return;
    setBusyOrder(order.number); setActionError(null);
    try {
      const data = await api(`/api/admin/orders/${encodeURIComponent(order.number)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setOrders(current => current.map(row => row.number === order.number ? data.order || { ...row, status } : row));
      if (status === 'cancelled') { await loadProducts(); await refreshProducts(); }
      toast(`Đơn ${order.number}: ${labels[status].toLowerCase()}.`);
    } catch (failure) { setActionError({ number: order.number, message: failure.message || 'Không thể cập nhật trạng thái. Vui lòng tải lại danh sách.' }); }
    finally { setBusyOrder(''); }
  }

  async function saveProduct(product, values) {
    const data = await api(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'PATCH', body: JSON.stringify(values) });
    setProducts(current => current.map(row => row.id === product.id ? data.product || { ...row, ...values } : row));
    await refreshProducts();
    toast(`Đã cập nhật ${product.name}.`);
  }

  if (user?.role !== 'admin') return <div className="page-container a-page"><div className="empty-state a-restricted"><ShieldCheck size={45} /><span className="section-eyebrow">QUẢN TRỊ NGUYỄN TECH</span><h1 className="page-title">Khu vực quản trị.</h1><p>Trang này dành cho tài khoản được cấp quyền quản trị.</p><Link className="btn btn-dark" to="/tai-khoan">{user ? 'Xem tài khoản' : 'Đăng nhập quản trị'} <ArrowRight size={17} /></Link></div></div>;

  return <div className="page-container a-page">
    <div className="breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><span>Quản trị</span></div>
    <div className="a-page-heading"><div><span className="section-eyebrow"><LayoutDashboard size={13} /> VẬN HÀNH CỬA HÀNG</span><h1 className="page-title">Quản trị cửa hàng.</h1><p className="muted">Theo dõi đơn hàng, cập nhật giá và quản lý tồn kho.</p></div><span className="a-admin-label"><ShieldCheck size={16} /> {user.name}</span></div>
    <section className="a-metrics" aria-label="Thống kê đơn hàng"><article><span className="a-metric-icon"><ShoppingBag size={20} /></span><div><span>Tổng đơn hàng</span><strong>{ordersLoaded ? orders.length : '—'}</strong></div></article><article><span className="a-metric-icon a-icon-lime"><Banknote size={20} /></span><div><span>Doanh thu đơn hoàn tất</span><strong className="a-metric-price">{ordersLoaded ? formatPrice(metrics.revenue) : '—'}</strong></div></article><article><span className="a-metric-icon"><Clock3 size={20} /></span><div><span>Chờ xác nhận</span><strong>{ordersLoaded ? metrics.pending : '—'}</strong></div></article><article><span className="a-metric-icon"><Truck size={20} /></span><div><span>Đang giao hàng</span><strong>{ordersLoaded ? metrics.shipping : '—'}</strong></div></article></section>
    <div className="a-tabs" role="tablist" aria-label="Quản trị cửa hàng"><button type="button" role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ShoppingBag size={17} /> Đơn hàng {ordersLoaded && <span>{orders.length}</span>}</button><button type="button" role="tab" aria-selected={tab === 'products'} className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><Package size={17} /> Sản phẩm & tồn kho</button></div>
    {tab === 'orders' ? <section className="a-panel" aria-label="Danh sách đơn hàng"><div className="a-panel-toolbar"><label className="a-search"><Search size={17} /><input type="search" placeholder="Tìm mã đơn, tên, email, điện thoại…" value={orderQuery} onChange={event => setOrderQuery(event.target.value)} aria-label="Tìm kiếm đơn hàng" /></label><label className="a-status-filter"><span>Trạng thái</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái đơn hàng"><option value="all">Tất cả trạng thái</option>{Object.entries(labels).map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select></label><button type="button" className="btn btn-outline a-reload" onClick={loadOrders} disabled={loadingOrders || Boolean(busyOrder)} aria-label="Tải lại đơn hàng"><RefreshCw size={16} /> Tải lại</button></div>
      {loadingOrders ? <div className="a-loading" role="status"><LoaderCircle size={24} className="a-spin" /> Đang tải đơn hàng…</div> : ordersError ? <div className="a-panel-error" role="alert"><p>{ordersError}</p><button type="button" className="btn btn-outline" onClick={loadOrders}>Thử lại</button></div> : matchingOrders.length ? <><p className="a-result-count">Hiển thị {matchingOrders.length} / {orders.length} đơn hàng</p><div className="a-orders-list">{matchingOrders.map(order => <OrderCard key={order.number} order={order} onChangeStatus={changeStatus} busy={Boolean(busyOrder)} error={actionError?.number === order.number ? actionError.message : ''} />)}</div></> : <div className="empty-state"><ShoppingBag size={39} /><h2>{orders.length ? 'Không tìm thấy đơn phù hợp' : 'Chưa có đơn hàng'}</h2><p>{orders.length ? 'Thử một từ khóa hoặc trạng thái khác.' : 'Đơn hàng mới sẽ xuất hiện tại đây khi khách đặt hàng.'}</p></div>}
    </section> : <section className="a-panel a-inventory-panel" aria-label="Quản lý sản phẩm"><div className="a-panel-toolbar"><label className="a-search"><Search size={17} /><input type="search" placeholder="Tìm tên sản phẩm, thương hiệu, mã sản phẩm…" value={productQuery} onChange={event => setProductQuery(event.target.value)} aria-label="Tìm kiếm sản phẩm quản trị" /></label><button type="button" className="btn btn-outline a-reload" onClick={loadProducts} disabled={loadingProducts} aria-label="Tải lại sản phẩm"><RefreshCw size={16} /> Tải lại</button></div>
      {loadingProducts ? <div className="a-loading" role="status"><LoaderCircle size={24} className="a-spin" /> Đang tải sản phẩm…</div> : productsError ? <div className="a-panel-error" role="alert"><p>{productsError}</p><button type="button" className="btn btn-outline" onClick={loadProducts}>Thử lại</button></div> : matchingProducts.length ? <><div className="a-inventory-heading"><p className="a-result-count">{matchingProducts.length} / {products.length} sản phẩm</p><span>Giá theo Việt Nam đồng · Tồn kho khả dụng</span></div><div className="a-products-list">{matchingProducts.map(product => <ProductEditor key={product.id} product={product} onSave={saveProduct} />)}</div></> : <div className="empty-state"><Package size={39} /><h2>Không tìm thấy sản phẩm</h2><p>Thử tên sản phẩm hoặc thương hiệu khác.</p></div>}
    </section>}
    <p className="a-dashboard-note">Số liệu phản ánh các đơn hàng được lưu trong cửa hàng. Doanh thu chỉ tính những đơn ở trạng thái hoàn tất.</p>
  </div>;
}
