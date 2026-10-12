import { Heart, ArrowUpRight, Plus, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShop } from '../store.jsx';
import { formatPrice } from '../utils.js';

export default function ProductCard({ product }) {
  const { addToCart, wishlist, toggleWishlist } = useShop();
  const sale = product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  return <article className="product-card">
    <div className="product-image-wrap">
      {product.badge && <span className={`product-badge ${product.badge === 'Mới' ? 'new' : ''}`}>{product.badge}</span>}
      <button type="button" className={`wishlist-button ${wishlist.includes(product.id) ? 'saved' : ''}`} aria-label={`${wishlist.includes(product.id) ? 'Bỏ yêu thích' : 'Yêu thích'} ${product.name}`} onClick={() => toggleWishlist(product.id)}><Heart size={18} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} /></button>
      <Link to={`/san-pham/${product.slug}`} tabIndex={-1} aria-hidden="true"><img src={product.image} alt="" loading="lazy" onError={event => { if (!event.currentTarget.src.endsWith('/favicon.svg')) event.currentTarget.src = '/favicon.svg'; }} /></Link>
      <Link to={`/san-pham/${product.slug}`} className="product-image-link">Khám phá sản phẩm <ArrowUpRight size={14} /></Link>
    </div>
    <div className="product-content"><span className="product-brand">{product.brand}</span><h3><Link to={`/san-pham/${product.slug}`}>{product.name}</Link></h3>
      <div className="product-rating"><Star size={13} fill="currentColor" /><b>{product.rating}</b><span>({product.reviewCount})</span><span className="stock-dot" />{product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</div>
      <div className="product-price-line"><div><strong>{formatPrice(product.price)}</strong>{sale > 0 && <div className="old-price-row"><del>{formatPrice(product.oldPrice)}</del><span>−{sale}%</span></div>}</div><button type="button" className="add-button" onClick={() => addToCart(product)} disabled={!product.stock} aria-label={`Thêm ${product.name} vào giỏ`}><Plus size={20} /></button></div>
    </div>
  </article>;
}
