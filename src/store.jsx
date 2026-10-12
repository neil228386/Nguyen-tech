import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const ShopContext = createContext(null);
const readSaved = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
export function ShopProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = readSaved('nt-cart', []);
    return Array.isArray(saved) ? saved.filter(item => item?.product?.id && Number.isInteger(item.quantity) && item.quantity > 0) : [];
  });
  const [wishlist, setWishlist] = useState(() => { const value = readSaved('nt-wishlist', []); return Array.isArray(value) ? value : []; });
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [notification, setNotification] = useState('');
  const toast = useCallback(message => setNotification(message), []);
  const refreshProducts = useCallback(async () => {
    setProductsLoading(true); setProductsError('');
    try {
      const data = await api('/api/products'); setProducts(data.products);
      setCart(current => {
        const allocated = new Map();
        return current.flatMap(item => {
          const product = data.products.find(value => value.id === item.product.id);
          if (!product) return [];
          const remaining = Math.min(product.stock, 20) - (allocated.get(product.id) || 0);
          if (remaining <= 0) return [];
          const quantity = Math.min(item.quantity, remaining);
          allocated.set(product.id, (allocated.get(product.id) || 0) + quantity);
          return [{ product, quantity, color: product.colors.includes(item.color) ? item.color : product.colors[0] || '' }];
        });
      });
    }
    catch (e) { setProductsError(e.message); }
    finally { setProductsLoading(false); }
  }, []);
  useEffect(() => { refreshProducts(); api('/api/auth/me').then(data => setUser(data.user)).catch(() => {}); }, [refreshProducts]);
  useEffect(() => { try { localStorage.setItem('nt-cart', JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { try { localStorage.setItem('nt-wishlist', JSON.stringify(wishlist)); } catch {} }, [wishlist]);
  useEffect(() => { if (!notification) return; const timer = setTimeout(() => setNotification(''), 3500); return () => clearTimeout(timer); }, [notification]);
  function addToCart(product, quantity = 1, color = product.colors?.[0] || '') {
    if (product.stock < 1) { toast('Sản phẩm tạm hết hàng.'); return; }
    setCart(current => {
      const existing = current.find(item => item.product.id === product.id && item.color === color);
      const total = current.filter(item => item.product.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
      const amount = Math.min(quantity, Math.min(product.stock, 20) - total);
      if (amount <= 0) return current;
      return existing ? current.map(item => item === existing ? { ...item, quantity: item.quantity + amount } : item) : [...current, { product, quantity: amount, color }];
    });
    toast('Đã cập nhật giỏ hàng của bạn');
  }
  function updateQuantity(id, color, quantity) {
    setCart(current => current.map(item => {
      if (item.product.id !== id || item.color !== color) return item;
      const other = current.filter(row => row.product.id === id && row !== item).reduce((sum, row) => sum + row.quantity, 0);
      return { ...item, quantity: Math.max(1, Math.min(Number(quantity) || 1, Math.min(item.product.stock, 20) - other)) };
    }));
  }
  function toggleWishlist(id) { setWishlist(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }
  return <ShopContext.Provider value={{ cart, cartTotal: cart.reduce((total, item) => total + item.product.price * item.quantity, 0), cartCount: cart.reduce((total, item) => total + item.quantity, 0), addToCart, updateQuantity, removeFromCart: (id, color) => setCart(current => current.filter(item => item.product.id !== id || item.color !== color)), clearCart: () => setCart([]), wishlist, toggleWishlist, user, setUser, toast, notification, products, productsLoading, productsError, refreshProducts }}>{children}</ShopContext.Provider>;
}
export const useShop = () => useContext(ShopContext);
