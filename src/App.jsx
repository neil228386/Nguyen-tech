import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, Menu, Search, ShoppingBag, UserRound, X, Zap, Truck, ShieldCheck, Headphones, Instagram, Facebook, Mail } from 'lucide-react';
import { useShop } from './store.jsx';
import { categories } from './utils.js';
import HomePage from './pages/HomePage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import TrackOrderPage from './pages/TrackOrderPage.jsx';
import InfoPage from './pages/InfoPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function Brand() { return <Link to="/" className="brand" aria-label="Nguyen Tech trang chủ"><span className="brand-mark"><Zap size={22} fill="currentColor" /></span><span>NGUYEN<span className="brand-light">TECH</span><span className="brand-period">.</span></span></Link>; }
function Header() {
  const { cartCount, wishlist, user } = useShop();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname, location.search]);
  function search(event) { event.preventDefault(); navigate(`/san-pham${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`); }
  return <>
    <div className="announcement"><div className="page-container"><span><span className="announcement-dot" /> Một thế giới công nghệ. Vô vàn khả năng.</span><Link to="/san-pham?deals=1">Ưu đãi chào bạn mới: HELLO10 <ArrowRight size={13} /></Link></div></div>
    <header className="site-header"><div className="page-container header-main"><Brand /><form onSubmit={search} className="header-search" role="search"><Search size={19} /><input aria-label="Tìm kiếm sản phẩm" placeholder="Bạn đang tìm thiết bị nào?" value={query} onChange={event => setQuery(event.target.value)} /><kbd>↵</kbd></form><div className="header-actions"><Link to="/tai-khoan" className="header-account"><UserRound size={21} /><span><small>{user ? 'Xin chào,' : 'Chào bạn,'}</small><b>{user ? user.name.split(' ').at(-1) : 'Đăng nhập'}</b></span></Link><Link to="/yeu-thich" className="header-icon" aria-label={`Sản phẩm yêu thích (${wishlist.length})`}><Heart size={21} />{wishlist.length > 0 && <span className="small-counter">{wishlist.length}</span>}</Link><span className="header-divider" /><Link to="/gio-hang" className="header-cart" aria-label={`Giỏ hàng (${cartCount})`}><ShoppingBag size={21} /><span>Giỏ hàng</span><b>{cartCount}</b></Link><button type="button" className="mobile-menu-button" aria-expanded={mobileOpen} aria-controls="primary-navigation" aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button></div></div>
    <div id="primary-navigation" className={`navigation ${mobileOpen ? 'mobile-open' : ''}`}><nav className="page-container navigation-inner" aria-label="Điều hướng chính"><NavLink to="/" end>Trang chủ</NavLink><Link to="/san-pham" className="all-products">Tất cả sản phẩm <ChevronDown size={13} /></Link>{categories.map(category => <Link key={category.id} to={`/san-pham?category=${category.id}`} className={location.search.includes(category.id) ? 'active' : ''}>{category.label}</Link>)}<Link to="/san-pham?deals=1" className="nav-deals"><Zap size={14} />Ưu đãi hôm nay</Link></nav><form className="mobile-search" onSubmit={search}><Search size={18} /><input aria-label="Tìm kiếm trên điện thoại" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm kiếm sản phẩm..." /></form></div></header>
  </>;
}
function Footer() {
  return <footer className="site-footer"><div className="page-container"><div className="footer-top"><div><Brand /><p>Công nghệ tốt hơn.<br />Cuộc sống thú vị hơn.</p><span className="footer-tagline">Đồng hành cùng bạn trong mỗi lựa chọn.</span></div><div className="footer-column"><h3>Khám phá</h3>{categories.slice(0,4).map(category => <Link key={category.id} to={`/san-pham?category=${category.id}`}>{category.label}</Link>)}</div><div className="footer-column"><h3>Hỗ trợ khách hàng</h3><Link to="/tra-cuu-don-hang">Tra cứu đơn hàng</Link><Link to="/thong-tin/giao-hang">Giao hàng & thanh toán</Link><Link to="/thong-tin/doi-tra">Đổi trả & bảo hành</Link><Link to="/thong-tin/lien-he">Liên hệ với chúng tôi</Link></div><div className="footer-column"><h3>Về Nguyen Tech</h3><Link to="/thong-tin/ve-chung-toi">Câu chuyện của chúng tôi</Link><Link to="/thong-tin/bao-mat">Chính sách bảo mật</Link><Link to="/thong-tin/dieu-khoan">Điều khoản sử dụng</Link><span className="footer-availability"><span />Cửa hàng trực tuyến • 24/7</span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nguyen Tech. Được tạo với đam mê công nghệ.</span><div className="payment-tags"><span>Thanh toán khi nhận hàng</span><ShieldCheck size={17} /><span>Đặt hàng an toàn</span></div></div><p className="demo-note">Bản phát triển của cửa hàng. Sản phẩm và giá là dữ liệu mẫu; đơn hàng được lưu để kiểm thử, chưa gửi tới đơn vị vận chuyển.</p></div></footer>;
}
export default function App() {
  const location = useLocation();
  const { notification } = useShop();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return <><a className="skip-link" href="#main">Bỏ qua đến nội dung</a><Header /><main id="main"><Routes><Route path="/" element={<HomePage />} /><Route path="/san-pham" element={<CatalogPage />} /><Route path="/san-pham/:slug" element={<ProductPage />} /><Route path="/gio-hang" element={<CartPage />} /><Route path="/thanh-toan" element={<CheckoutPage />} /><Route path="/tai-khoan" element={<AccountPage />} /><Route path="/quan-tri" element={<AdminPage />} /><Route path="/tra-cuu-don-hang" element={<TrackOrderPage />} /><Route path="/yeu-thich" element={<CatalogPage wishlistOnly />} /><Route path="/thong-tin/:section" element={<InfoPage />} /><Route path="*" element={<div className="page-container empty-state"><span className="section-eyebrow">404</span><h1>Trang này đang đi lạc.</h1><p>Khám phá những thiết bị mới từ trang chủ nhé.</p><Link className="btn btn-dark" to="/">Về trang chủ <ArrowRight size={16} /></Link></div>} /></Routes></main><Footer />{notification && <div className="toast" role="status"><span><Check size={16} /></span>{notification}</div>}</>;
}
