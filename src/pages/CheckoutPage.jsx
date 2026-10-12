import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LoaderCircle, MapPin, Package, ShieldCheck, Truck } from 'lucide-react';
import { useShop } from '../store';
import { api } from '../api';
import { formatPrice } from '../utils';
import './commerce.css';

const initialCustomer = { name: '', email: '', phone: '', address: '', ward: '', district: '', city: '', note: '' };

function SummaryItem({ item }) {
  return <div className="c-summary-item">
    <img src={item.product.image} alt={item.product.name} />
    <div><strong>{item.product.name}</strong><span>{item.color || 'Màu mặc định'} · Số lượng {item.quantity}</span></div>
    <b>{formatPrice(item.product.price * item.quantity)}</b>
  </div>;
}

function OrderSuccess({ order }) {
  return <div className="page-container c-success-wrap">
    <section className="c-success-card">
      <div className="c-success-icon"><CheckCircle2 size={34} /></div>
      <span className="section-eyebrow">CẢM ƠN BẠN ĐÃ TIN TƯỞNG</span>
      <h1 className="page-title">Đặt hàng thành công!</h1>
      <p className="muted">Đơn thử nghiệm đã được lưu. Bản phát triển chưa thực hiện xác nhận hoặc giao hàng thực tế.</p>
      <div className="c-order-number"><span>Mã đơn hàng</span><strong>{order.number}</strong><span className="badge">Chờ xác nhận</span></div>
      <div className="c-receipt-grid">
        <div><h3>Địa chỉ nhận hàng</h3><p>{order.customer.name} · {order.customer.phone}</p><p>{[order.customer.address, order.customer.ward, order.customer.district, order.customer.city].filter(Boolean).join(', ')}</p></div>
        <div><h3>Thanh toán</h3><p>Thanh toán khi nhận hàng (COD)</p><strong className="price">{formatPrice(order.total)}</strong></div>
      </div>
      <p className="c-order-hint"><Package size={18} /> Lưu mã đơn và dùng email đặt hàng để tra cứu trạng thái bất cứ lúc nào.</p>
      <div className="c-success-actions"><Link className="btn btn-dark" to="/tra-cuu-don-hang">Tra cứu đơn hàng <ArrowRight size={18} /></Link><Link className="btn btn-outline" to="/san-pham">Tiếp tục mua sắm</Link></div>
    </section>
  </div>;
}

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart, user, toast, refreshProducts } = useShop();
  const [customer, setCustomer] = useState(() => ({ ...initialCustomer, name: user?.name || '', email: user?.email || '' }));
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  useEffect(() => {
    if (!user) return;
    setCustomer(previous => ({ ...previous, name: previous.name || user.name, email: previous.email || user.email }));
  }, [user?.name, user?.email]);
  useEffect(() => { refreshProducts(); }, [refreshProducts]);
  const shipping = cartTotal >= 2000000 ? 0 : 30000;
  const discount = coupon === 'HELLO10' ? Math.min(Math.round(cartTotal * 0.1), 500000) : 0;
  const total = cartTotal - discount + shipping;

  function changeCustomer(event) {
    setCustomer(previous => ({ ...previous, [event.target.name]: event.target.value }));
  }

  function applyCoupon() {
    const value = couponInput.trim().toUpperCase();
    if (value === 'HELLO10') {
      setCoupon(value);
      setCouponMessage('Đã giảm 10% giá trị sản phẩm, tối đa 500.000₫.');
    } else {
      setCoupon('');
      setCouponMessage(value ? 'Mã ưu đãi chưa hợp lệ. Thử HELLO10 cho đơn hàng này.' : 'Nhập mã ưu đãi để áp dụng.');
    }
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (submitting) return;
    const phone = customer.phone.replace(/[\s().-]/g, '');
    if (!/^(?:\+84|0)\d{9}$/.test(phone)) {
      setError('Vui lòng nhập số điện thoại Việt Nam hợp lệ (ví dụ: 0901234567).');
      return;
    }
    const requiredFields = ['name', 'email', 'address', 'ward', 'district', 'city'];
    if (requiredFields.some(key => !customer[key].trim())) {
      setError('Vui lòng điền đầy đủ thông tin người nhận và địa chỉ giao hàng.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const data = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer: Object.fromEntries(Object.entries(customer).map(([key, value]) => [key, value.trim()])),
          items: cart.map(item => ({ productId: item.product.id, quantity: item.quantity, color: item.color })),
          paymentMethod: 'cod',
          coupon,
          expectedTotal: total,
        }),
      });
      setOrder(data.order);
      try { localStorage.setItem('nguyen-tech-last-order', data.order.number); } catch { /* Order remains available when browser storage is disabled. */ }
      clearCart();
      await refreshProducts();
      toast('Đơn hàng đã được tạo thành công.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (failure) {
      await refreshProducts();
      setError(failure.message || 'Chưa thể tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  if (order) return <OrderSuccess order={order} />;
  if (!cart.length) return <div className="page-container c-page"><div className="empty-state"><Package size={48} /><h1>Giỏ hàng đang trống</h1><p className="muted">Thêm sản phẩm yêu thích để bắt đầu đặt hàng.</p><Link to="/san-pham" className="btn btn-dark">Khám phá sản phẩm <ArrowRight size={18} /></Link></div></div>;

  return <div className="page-container c-page">
    <div className="breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><Link to="/gio-hang">Giỏ hàng</Link><span>/</span><span>Thanh toán</span></div>
    <div className="c-page-heading"><div><span className="section-eyebrow">CHỈ CÒN MỘT BƯỚC NỮA</span><h1 className="page-title">Hoàn tất đơn hàng.</h1><p className="muted">Công nghệ bạn yêu thích, giao đến tận tay.</p></div><span className="c-secure-label"><ShieldCheck size={18} /> Thanh toán an tâm</span></div>
    <div className="c-checkout-steps" aria-label="Tiến trình đặt hàng"><span className="done"><Check size={15} /> Giỏ hàng</span><i /><span className="current"><b>2</b> Thông tin & thanh toán</span><i /><span><b>3</b> Hoàn tất</span></div>
    <form onSubmit={submitOrder} className="c-checkout-layout">
      <div className="c-checkout-form">
        <section className="c-form-section"><div className="c-form-section-title"><span>01</span><h2>Thông tin người nhận</h2></div>{!user && <p className="c-login-hint">Đã có tài khoản? <Link to="/tai-khoan">Đăng nhập để theo dõi đơn hàng</Link></p>}
          <div className="c-form-grid">
            <label className="field c-span-two">Họ và tên <span>*</span><input className="input" name="name" minLength={2} autoComplete="name" placeholder="Nguyễn Văn An" value={customer.name} onChange={changeCustomer} required maxLength={80} /></label>
            <label className="field">Email <span>*</span><input className="input" name="email" type="email" autoComplete="email" placeholder="ban@email.com" value={customer.email} onChange={changeCustomer} required maxLength={200} /></label>
            <label className="field">Số điện thoại <span>*</span><input className="input" name="phone" type="tel" autoComplete="tel" placeholder="0901 234 567" value={customer.phone} onChange={changeCustomer} required maxLength={20} /></label>
          </div>
        </section>
        <section className="c-form-section"><div className="c-form-section-title"><span>02</span><h2>Địa chỉ giao hàng</h2></div>
          <div className="c-form-grid">
            <label className="field c-span-two">Địa chỉ cụ thể <span>*</span><input className="input" name="address" minLength={5} autoComplete="address-line1" placeholder="Số nhà, tên đường, tòa nhà…" value={customer.address} onChange={changeCustomer} required maxLength={200} /></label>
            <label className="field">Tỉnh / Thành phố <span>*</span><input className="input" name="city" minLength={2} autoComplete="address-level1" placeholder="TP. Hồ Chí Minh" value={customer.city} onChange={changeCustomer} required maxLength={80} /></label>
            <label className="field">Quận / Huyện <span>*</span><input className="input" name="district" minLength={2} autoComplete="address-level2" placeholder="Quận / huyện của bạn" value={customer.district} onChange={changeCustomer} required maxLength={80} /></label>
            <label className="field c-span-two">Phường / Xã <span>*</span><input className="input" name="ward" minLength={2} autoComplete="address-level3" placeholder="Phường / xã của bạn" value={customer.ward} onChange={changeCustomer} required maxLength={80} /></label>
            <label className="field c-span-two">Ghi chú cho đơn hàng <span className="muted">(không bắt buộc)</span><textarea className="input" name="note" rows={3} placeholder="Ví dụ: gọi trước khi giao hàng…" value={customer.note} onChange={changeCustomer} maxLength={500} /></label>
          </div>
        </section>
        <section className="c-form-section"><div className="c-form-section-title"><span>03</span><h2>Phương thức thanh toán</h2></div><label className="c-payment-option"><input type="radio" name="paymentMethod" value="cod" checked readOnly /><span><strong>Thanh toán khi nhận hàng (COD)</strong><small>Thanh toán cho đơn vị vận chuyển khi nhận sản phẩm.</small></span><Truck size={24} /></label></section>
      </div>
      <aside className="c-order-summary"><h2>Đơn hàng của bạn <span>({cart.reduce((sum, item) => sum + item.quantity, 0)})</span></h2><div className="c-summary-products">{cart.map(item => <SummaryItem key={`${item.product.id}-${item.color}`} item={item} />)}</div>
        <div className="c-coupon"><label htmlFor="checkout-coupon">Mã ưu đãi</label><div><input id="checkout-coupon" className="input" value={couponInput} onChange={event => setCouponInput(event.target.value)} placeholder="Nhập mã ưu đãi" maxLength={30} /><button className="btn btn-outline" type="button" onClick={applyCoupon}>Áp dụng</button></div>{couponMessage && <p className={coupon ? 'c-coupon-success' : 'muted'} role="status">{couponMessage}</p>}{!couponMessage && <p className="muted">Chào bạn mới: HELLO10 giảm 10%, tối đa 500.000₫.</p>}</div>
        <div className="c-totals"><div><span>Tạm tính</span><strong>{formatPrice(cartTotal)}</strong></div>{discount > 0 && <div className="c-discount"><span>Ưu đãi HELLO10</span><strong>−{formatPrice(discount)}</strong></div>}<div><span>Phí giao hàng</span><strong>{shipping === 0 ? 'Miễn phí' : formatPrice(shipping)}</strong></div><div className="c-grand-total"><span>Tổng thanh toán</span><strong>{formatPrice(total)}</strong></div></div>
        {error && <div className="alert c-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-dark c-place-order" disabled={submitting}>{submitting ? <><LoaderCircle className="c-spin" size={19} /> Đang tạo đơn…</> : <>Đặt hàng ngay <ArrowRight size={19} /></>}</button>
        <p className="c-terms-note">Bằng việc đặt hàng, bạn đồng ý với <Link to="/thong-tin/dieu-khoan">điều khoản mua hàng</Link> và <Link to="/thong-tin/bao-mat">chính sách bảo mật</Link>.</p>
        <div className="c-summary-benefits"><span><ShieldCheck size={17} /> Thông tin đơn hàng rõ ràng</span><span><Truck size={17} /> Miễn phí giao từ 2 triệu</span><span><MapPin size={17} /> Giao hàng toàn quốc</span></div>
        <Link to="/gio-hang" className="c-back-link"><ArrowLeft size={15} /> Quay lại giỏ hàng</Link>
      </aside>
    </form>
  </div>;
}
