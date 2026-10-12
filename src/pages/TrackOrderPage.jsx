import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ClipboardCheck, LoaderCircle, MapPin, Package, Search, Truck } from 'lucide-react';
import { useShop } from '../store';
import { api } from '../api';
import { formatPrice } from '../utils';
import './commerce.css';

const statusLabel = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang chuẩn bị', shipping: 'Đang giao hàng', shipped: 'Đang giao hàng', delivered: 'Đã giao hàng', completed: 'Hoàn tất', cancelled: 'Đã hủy' };
const statusStep = { pending: 0, confirmed: 1, processing: 1, shipping: 2, shipped: 2, delivered: 3, completed: 3 };
const steps = [{ title: 'Đã đặt hàng', icon: ClipboardCheck }, { title: 'Đang chuẩn bị', icon: Package }, { title: 'Đang giao', icon: Truck }, { title: 'Đã giao hàng', icon: Check }];

export default function TrackOrderPage() {
  const [params] = useSearchParams();
  const { user } = useShop();
  const [number, setNumber] = useState(() => {
    if (params.get('number')) return params.get('number');
    try { return localStorage.getItem('nguyen-tech-last-order') || ''; } catch { return ''; }
  });
  const [email, setEmail] = useState(user?.email || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(previous => previous || user.email);
  }, [user?.email]);

  async function lookup(event) {
    event.preventDefault();
    if (loading) return;
    if (!number.trim()) { setError('Vui lòng nhập mã đơn hàng.'); return; }
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const data = await api('/api/orders/lookup', { method: 'POST', body: JSON.stringify({ number: number.trim().toUpperCase(), email: email.trim() }) });
      setOrder(data.order);
    } catch (failure) { setError(failure.message || 'Không tìm thấy đơn hàng. Vui lòng kiểm tra mã đơn và email.'); }
    finally { setLoading(false); }
  }

  const currentStep = order ? statusStep[order.status] ?? 0 : 0;
  return <div className="page-container c-page">
    <div className="breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><span>Tra cứu đơn hàng</span></div>
    <div className="c-tracking-heading"><span className="section-eyebrow">MỌI BƯỚC ĐỀU TRONG TẦM TAY</span><h1 className="page-title">Đơn hàng của bạn đang ở đâu?</h1><p className="muted">Nhập mã đơn và email đã dùng khi đặt hàng để xem thông tin mới nhất.</p></div>
    <form className="c-lookup-form" onSubmit={lookup}><label className="field">Mã đơn hàng<input className="input" name="number" value={number} onChange={event => setNumber(event.target.value)} placeholder="Ví dụ: NT-12345678" required maxLength={40} autoComplete="off" /></label><label className="field">Email đặt hàng<input className="input" type="email" name="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@email.com" required maxLength={200} autoComplete="email" /></label><button className="btn btn-dark" type="submit" disabled={loading}>{loading ? <><LoaderCircle size={18} className="c-spin" /> Đang tra cứu…</> : <><Search size={18} /> Tra cứu đơn</>}</button></form>
    {error && <div className="alert c-error c-lookup-error" role="alert">{error}</div>}
    {!order && !loading && !error && <div className="c-tracking-empty"><div><Package size={38} /></div><h2>Hành trình công nghệ của bạn.</h2><p>Mã đơn được hiển thị sau khi đặt hàng thành công.<br />Bạn cũng có thể xem đơn đã mua trong <Link to="/tai-khoan">tài khoản của mình</Link>.</p></div>}
    {order && <section className="c-tracking-result"><div className="c-tracking-result-header"><div><span className="section-eyebrow">THÔNG TIN ĐƠN HÀNG</span><h2>{order.number}</h2><p className="muted">Đặt ngày {new Date(order.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p></div><span className={`badge c-status-${order.status}`}>{statusLabel[order.status] || order.status}</span></div>
      {order.status === 'cancelled' ? <div className="alert c-cancelled-note">Đơn hàng đã được hủy. Vui lòng <Link to="/thong-tin/lien-he">liên hệ Nguyễn Tech</Link> nếu bạn cần hỗ trợ.</div> : <div className="c-delivery-steps" aria-label="Trạng thái giao hàng">{steps.map((step, index) => { const Icon = step.icon; return <div key={step.title} className={index <= currentStep ? 'active' : ''} aria-current={index === currentStep ? 'step' : undefined}><span><Icon size={21} /></span><strong>{step.title}</strong>{index === currentStep && <small>Trạng thái hiện tại</small>}</div>; })}</div>}
      <div className="c-tracking-details"><section><h3>Sản phẩm trong đơn</h3><div className="c-tracked-products">{order.items.map((item, index) => <div key={`${item.productId}-${item.color}-${index}`} className="c-tracked-product">{(item.image || item.product?.image) && <img src={item.image || item.product.image} alt={item.name || item.product?.name || 'Sản phẩm'} />}<div><strong>{item.name || item.product?.name || 'Sản phẩm'}</strong><span>{item.color || 'Màu mặc định'} · Số lượng {item.quantity}</span></div><b>{formatPrice((item.price || item.product?.price || 0) * item.quantity)}</b></div>)}</div><div className="c-totals"><div><span>Tạm tính</span><strong>{formatPrice(order.subtotal)}</strong></div>{order.discount > 0 && <div className="c-discount"><span>Ưu đãi</span><strong>−{formatPrice(order.discount)}</strong></div>}<div><span>Phí giao hàng</span><strong>{order.shipping === 0 ? 'Miễn phí' : formatPrice(order.shipping)}</strong></div><div className="c-grand-total"><span>Tổng thanh toán</span><strong>{formatPrice(order.total)}</strong></div></div></section><aside className="c-tracked-address"><h3><MapPin size={19} /> Thông tin giao hàng</h3><strong>{order.customer.name}</strong><p>{order.customer.phone}</p><p>{[order.customer.address, order.customer.ward, order.customer.district, order.customer.city].filter(Boolean).join(', ')}</p><div><h4>Phương thức thanh toán</h4><p>Thanh toán khi nhận hàng (COD)</p></div>{order.customer.note && <div><h4>Ghi chú đơn hàng</h4><p>{order.customer.note}</p></div>}</aside></div>
    </section>}
  </div>;
}
