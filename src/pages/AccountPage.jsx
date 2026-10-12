import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, LoaderCircle, LogOut, Package, ShieldCheck, UserRound } from 'lucide-react';
import { useShop } from '../store';
import { api } from '../api';
import { formatPrice } from '../utils';
import './commerce.css';

const statuses = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang chuẩn bị', shipping: 'Đang giao hàng', shipped: 'Đang giao hàng', delivered: 'Đã giao hàng', completed: 'Hoàn tất', cancelled: 'Đã hủy' };

export default function AccountPage() {
  const { user, setUser, toast } = useShop();
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!user) { setOrders([]); return; }
    let active = true;
    setOrdersLoading(true);
    setOrdersError('');
    api('/api/orders').then(data => { if (active) setOrders(data.orders || []); }).catch(failure => { if (active) setOrdersError(failure.message || 'Không thể tải đơn hàng.'); }).finally(() => { if (active) setOrdersLoading(false); });
    return () => { active = false; };
  }, [user, retry]);

  async function submitAuth(event) {
    event.preventDefault();
    if (busy) return;
    if (mode === 'register' && !values.name.trim()) { setError('Vui lòng nhập họ và tên.'); return; }
    setError('');
    setBusy(true);
    try {
      const data = await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify({ ...values, email: values.email.trim(), name: values.name.trim() }) });
      setUser(data.user);
      setValues({ name: '', email: '', password: '' });
      toast(mode === 'register' ? 'Tạo tài khoản thành công. Chào mừng bạn!' : 'Đăng nhập thành công.');
    } catch (failure) { setError(failure.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setOrders([]);
      toast('Bạn đã đăng xuất.');
    } catch (failure) { setError(failure.message || 'Không thể đăng xuất. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }

  if (user) return <div className="page-container c-page">
    <div className="breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><span>Tài khoản</span></div>
    <div className="c-page-heading"><div><span className="section-eyebrow">KHÔNG GIAN CỦA BẠN</span><h1 className="page-title">Xin chào, {user.name.split(' ').filter(Boolean).at(-1)}.</h1><p className="muted">Quản lý thông tin và theo dõi mọi đơn hàng ở một nơi.</p></div><button className="btn btn-outline" type="button" onClick={logout} disabled={busy}><LogOut size={17} /> {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div>
    {error && <div className="alert c-error" role="alert">{error}</div>}
    <div className="c-account-layout"><aside className="c-profile-card"><div className="c-avatar">{user.name.charAt(0).toUpperCase()}</div><h2>{user.name}</h2><p>{user.email}</p><span className="c-member-label"><Check size={14} /> Thành viên Nguyễn Tech</span><div className="c-profile-note"><ShieldCheck size={20} /><p>Thông tin tài khoản được sử dụng để xác nhận và quản lý đơn hàng của bạn.</p></div><Link className="btn btn-outline" to="/tra-cuu-don-hang">Tra cứu đơn đã mua</Link>{user.role === "admin" && <Link className="btn btn-dark" to="/quan-tri">Quản trị cửa hàng <ArrowRight size={16} /></Link>}</aside>
      <section className="c-orders-card"><div className="c-orders-title"><h2>Đơn hàng của tôi</h2><span>{orders.length} đơn hàng</span></div>{ordersLoading ? <div className="c-loading" role="status"><LoaderCircle className="c-spin" size={24} /> Đang tải đơn hàng…</div> : ordersError ? <div className="empty-state"><p role="alert">{ordersError}</p><button type="button" className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : orders.length === 0 ? <div className="empty-state c-account-empty"><Package size={44} /><h3>Chuyến mua sắm đầu tiên đang chờ bạn</h3><p className="muted">Các đơn hàng được đặt khi bạn đăng nhập sẽ xuất hiện tại đây.</p><Link to="/san-pham" className="btn btn-dark">Khám phá sản phẩm <ArrowRight size={17} /></Link></div> : <div className="c-account-orders">{orders.map(order => <article className="c-account-order" key={order.id || order.number}><div className="c-account-order-top"><div><strong>{order.number}</strong><span>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span></div><span className={`badge c-status-${order.status}`}>{statuses[order.status] || order.status}</span></div><div className="c-account-order-bottom"><span>{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} sản phẩm</span><strong>{formatPrice(order.total)}</strong><Link to={`/tra-cuu-don-hang?number=${encodeURIComponent(order.number)}`}>Xem chi tiết <ArrowRight size={15} /></Link></div></article>)}</div>}</section>
    </div>
  </div>;

  return <div className="page-container c-page">
    <div className="breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><span>Tài khoản</span></div>
    <div className="c-auth-layout"><section className="c-auth-intro"><span className="section-eyebrow">KẾT NỐI VỚI NGUYỄN TECH</span><h1>Công nghệ tốt.<br />Trải nghiệm tốt hơn.</h1><p>Tạo tài khoản để mọi lần mua sắm trở nên đơn giản hơn.</p><div className="c-auth-perks"><div><Package size={23} /><span><strong>Theo dõi đơn hàng</strong><small>Xem lịch sử mua sắm và trạng thái giao hàng.</small></span></div><div><ShieldCheck size={23} /><span><strong>Thông tin được bảo vệ</strong><small>Quản lý tài khoản và đơn hàng của riêng bạn.</small></span></div><div><UserRound size={23} /><span><strong>Trải nghiệm dành cho bạn</strong><small>Thông tin người nhận được điền nhanh hơn.</small></span></div></div><div className="c-auth-art" aria-hidden="true"><span>N</span><i /><b>TECH FOR YOUR NEXT.</b></div></section>
      <section className="c-auth-card"><div className="c-auth-tabs" role="tablist" aria-label="Tài khoản"><button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Đăng nhập</button><button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Tạo tài khoản</button></div><h2>{mode === 'login' ? 'Chào mừng trở lại.' : 'Bắt đầu cùng Nguyễn Tech.'}</h2><p className="muted">{mode === 'login' ? 'Đăng nhập để tiếp tục trải nghiệm mua sắm.' : 'Chỉ một phút để tạo tài khoản của bạn.'}</p>
        <form onSubmit={submitAuth}>{mode === 'register' && <label className="field">Họ và tên<input className="input" value={values.name} onChange={event => setValues(previous => ({ ...previous, name: event.target.value }))} name="name" minLength={2} autoComplete="name" placeholder="Nguyễn Văn An" required maxLength={80} /></label>}<label className="field">Email<input className="input" value={values.email} onChange={event => setValues(previous => ({ ...previous, email: event.target.value }))} name="email" type="email" autoComplete="email" placeholder="ban@email.com" required maxLength={200} /></label><label className="field">Mật khẩu<input className="input" value={values.password} onChange={event => setValues(previous => ({ ...previous, password: event.target.value }))} name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'Tối thiểu 8 ký tự' : 'Nhập mật khẩu của bạn'} required minLength={mode === 'register' ? 8 : 1} maxLength={128} /></label>{mode === 'register' && <p className="c-auth-terms">Khi đăng ký, bạn đồng ý với <Link to="/thong-tin/dieu-khoan">điều khoản sử dụng</Link> và <Link to="/thong-tin/bao-mat">chính sách bảo mật</Link>.</p>}{error && <div className="alert c-error" role="alert">{error}</div>}<button type="submit" className="btn btn-dark c-auth-submit" disabled={busy}>{busy ? <><LoaderCircle className="c-spin" size={18} /> Đang xử lý…</> : <>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}<ArrowRight size={18} /></>}</button></form>
        <p className="c-guest-note">Bạn vẫn có thể <Link to="/san-pham">mua hàng</Link> và <Link to="/tra-cuu-don-hang">tra cứu đơn</Link> mà không cần tài khoản.</p>
      </section>
    </div>
  </div>;
}
