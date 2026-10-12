import { seedProducts } from '../server/products.mjs';

let products;
let user = null;
const orders = [];
const clone = value => JSON.parse(JSON.stringify(value));
const normalize = value => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

// Isolated offline demonstration. No requests, password storage or real orders.
export async function demoApi(path, options = {}) {
  products ||= seedProducts.map(product => ({ ...clone(product), image: window.__NT_ASSETS__[product.image], gallery: product.gallery.map(image => window.__NT_ASSETS__[image]) }));
  const url = new URL(path, 'https://offline.example');
  const route = url.pathname;
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : {};
  const fail = message => { throw new Error(message); };
  const result = value => clone(value);
  if (route === '/api/health') return { ok: true, demo: true };
  if (route === '/api/products') return result({ products });
  if (route.startsWith('/api/products/')) {
    const product = products.find(item => item.slug === decodeURIComponent(route.split('/').at(-1)));
    if (!product) fail('Không tìm thấy sản phẩm mẫu.');
    return result({ product });
  }
  if (route === '/api/auth/me') return result({ user });
  if (route === '/api/auth/logout') { user = null; return { user: null }; }
  if (['/api/auth/login', '/api/auth/register'].includes(route)) {
    user = { id: 'offline-demo-user', name: body.name || 'Khách xem bản mẫu', email: body.email, role: 'admin' };
    return result({ user });
  }
  if (route === '/api/orders' && method === 'POST') {
    if (!Array.isArray(body.items) || !body.items.length) fail('Giỏ hàng đang trống.');
    const amounts = new Map();
    const items = body.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product || !Number.isInteger(item.quantity) || item.quantity < 1) fail('Sản phẩm không hợp lệ.');
      amounts.set(product.id, (amounts.get(product.id) || 0) + item.quantity);
      if (amounts.get(product.id) > Math.min(product.stock, 20)) fail('Số lượng vượt quá tồn kho mẫu.');
      return { productId: product.id, name: product.name, slug: product.slug, image: product.image, price: product.price, quantity: item.quantity, color: item.color };
    });
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = body.coupon === 'HELLO10' ? Math.min(Math.round(subtotal * .1), 500000) : 0;
    const shipping = subtotal >= 2000000 ? 0 : 30000;
    const total = subtotal - discount + shipping;
    if (body.expectedTotal !== undefined && body.expectedTotal !== total) fail('Giá mẫu đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.');
    for (const [id, quantity] of amounts) products.find(p => p.id === id).stock -= quantity;
    const order = { number: `MAU-${Date.now().toString(36).toUpperCase()}-${orders.length + 1}`, createdAt: new Date().toISOString(), status: 'pending', items, subtotal, discount, shipping, total, customer: body.customer, paymentMethod: 'cod', userId: user?.id || null };
    orders.unshift(order);
    return result({ order });
  }
  if (route === '/api/orders') return result({ orders: orders.filter(order => user && order.userId === user.id) });
  if (route === '/api/orders/lookup') {
    const order = orders.find(order => order.number === body.number && normalize(order.customer.email) === normalize(body.email));
    if (!order) fail('Không tìm thấy đơn mẫu. Đơn chỉ tồn tại đến khi bạn tải lại tệp.');
    return result({ order });
  }
  if (route.startsWith('/api/admin')) {
    if (user?.role !== 'admin') fail('Đăng nhập bằng thông tin giả để thử trang quản trị. Bản mẫu không xác thực hoặc lưu mật khẩu.');
    if (route === '/api/admin/orders') return result({ orders });
    if (route === '/api/admin/products') return result({ products });
    if (route.startsWith('/api/admin/products/')) {
      const product = products.find(p => p.id === decodeURIComponent(route.split('/').at(-1)));
      if (!product) fail('Không tìm thấy sản phẩm.');
      if (!Number.isInteger(body.price) || body.price < 1000 || !Number.isInteger(body.stock) || body.stock < 0) fail('Giá hoặc tồn kho không hợp lệ.');
      Object.assign(product, { price: body.price, stock: body.stock });
      return result({ product });
    }
    if (route.startsWith('/api/admin/orders/')) {
      const order = orders.find(o => o.number === decodeURIComponent(route.split('/').at(-1)));
      if (!order) fail('Không tìm thấy đơn mẫu.');
      const transitions = { pending: ['confirmed', 'cancelled'], confirmed: ['shipping', 'cancelled'], shipping: ['completed'], completed: [], cancelled: [] };
      if (!transitions[order.status].includes(body.status)) fail('Trạng thái không hợp lệ.');
      if (body.status === 'cancelled') for (const item of order.items) products.find(p => p.id === item.productId).stock += item.quantity;
      order.status = body.status;
      return result({ order });
    }
  }
  fail('Chức năng này chưa có trong bản mẫu offline.');
}
