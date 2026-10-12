import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { seedProducts } from './products.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const defaultDatabasePath = resolve(process.env.DATABASE_PATH || resolve(here, 'data/shop.sqlite'));
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const hash = (value) => createHash('sha256').update(value).digest('hex');
const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const safeUser = (user) => user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function string(value, label, min = 0, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new ApiError(400, `${label} không hợp lệ.`);
  }
  return value.trim();
}

function email(value) {
  const address = string(value, 'Email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new ApiError(400, 'Email không hợp lệ.');
  return address;
}

function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 }).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, digest] = stored.split(':');
  const computed = scryptSync(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
  const expected = Buffer.from(digest, 'hex');
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

function validatePassword(value, minimum = 8) {
  if (typeof value !== 'string' || value.length < minimum || value.length > 128) {
    throw new ApiError(400, 'Mật khẩu phải có từ 8 đến 128 ký tự.');
  }
  return value;
}

export function createApp({ databasePath = defaultDatabasePath, frontendOrigins = process.env.FRONTEND_ORIGIN || '', production = process.env.NODE_ENV === 'production' } = {}) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, json TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock >= 0), price_override INTEGER CHECK(price_override >= 1000));
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin')));
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, user_id TEXT REFERENCES users(id), customer_email TEXT NOT NULL, created_at TEXT NOT NULL, json TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);`);
  if (!db.prepare('PRAGMA table_info(users)').all().some((column) => column.name === 'role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin'))");
  if (!db.prepare('PRAGMA table_info(products)').all().some((column) => column.name === 'price_override')) db.exec('ALTER TABLE products ADD COLUMN price_override INTEGER CHECK(price_override >= 1000)');
  const seed = db.prepare('INSERT INTO products (id, json, stock) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json');
  for (const product of seedProducts) seed.run(product.id, JSON.stringify(product), product.stock);

  const app = express();
  app.disable('x-powered-by');
  const limits = new Map();
  const dummyPassword = passwordHash(randomBytes(24).toString('hex'));
  const origins = new Set(frontendOrigins.split(',').map((origin) => origin.trim()).filter(Boolean));
  if (!production) { origins.add('http://localhost:5173'); origins.add('http://127.0.0.1:5173'); }

  function rateLimit(scope, max, milliseconds) {
    return (req, res, next) => {
      const now = Date.now();
      if (limits.size > 2000) for (const [key, value] of limits) if (value.until <= now) limits.delete(key);
      const key = `${scope}:${req.socket.remoteAddress}`;
      let entry = limits.get(key);
      if (!entry || entry.until <= now) { entry = { count: 0, until: now + milliseconds }; limits.set(key, entry); }
      entry.count++;
      if (entry.count > max) {
        res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
        return next(new ApiError(429, 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'));
      }
      next();
    };
  }

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin) {
        let sameHost = false;
        try { sameHost = new URL(origin).host === req.get('host'); } catch {}
        if (!sameHost && !origins.has(origin)) return next(new ApiError(403, 'Nguồn yêu cầu không được phép.'));
      }
      if (!req.is('application/json')) return next(new ApiError(415, 'Vui lòng gửi dữ liệu JSON.'));
    }
    next();
  });
  app.use(express.json({ limit: '24kb' }));
  app.use('/api', (req, _res, next) => {
    if (req.method === 'POST' && req.path === '/auth/logout' && req.body === undefined) req.body = {};
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
      return next(new ApiError(400, 'Dữ liệu yêu cầu không hợp lệ.'));
    }
    next();
  });
  app.use('/api', (req, _res, next) => {
    const raw = req.get('cookie') || '';
    const token = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith('nguyentech_session='))?.slice('nguyentech_session='.length);
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const session = db.prepare('SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE token_hash = ? AND expires > ?').get(hash(token), Date.now());
      req.user = session || null;
      req.sessionHash = hash(token);
    }
    next();
  });

  function setSession(req, res, userId) {
    if (req.sessionHash) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.sessionHash);
    db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)').run(hash(token), userId, Date.now() + SESSION_SECONDS * 1000);
    res.cookie('nguyentech_session', token, { httpOnly: true, sameSite: 'lax', secure: production, maxAge: SESSION_SECONDS * 1000, path: '/' });
  }

  function getProduct(id) {
    const row = db.prepare('SELECT json, stock, price_override FROM products WHERE id = ?').get(id);
    return row ? productFromRow(row) : null;
  }
  function productFromRow(row) {
    const product = JSON.parse(row.json);
    return { ...product, stock: row.stock, price: row.price_override ?? product.price };
  }
  function getProducts() { return db.prepare('SELECT json, stock, price_override FROM products').all().map(productFromRow); }

  app.get('/api/health', (_req, res) => res.json({ ok: true, database: db.prepare('SELECT 1 AS ok').get().ok === 1 }));
  app.get('/api/products', (req, res) => {
    const q = typeof req.query.q === 'string' ? normalize(req.query.q.slice(0, 100).trim()) : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    let products = getProducts();
    if (category && category !== 'all') products = products.filter((product) => product.category === category);
    if (q) products = products.filter((product) => normalize(`${product.name} ${product.brand} ${product.description}`).includes(q));
    const sorting = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      newest: (a, b) => Number(b.badge === 'Mới') - Number(a.badge === 'Mới'),
      featured: (a, b) => Number(b.featured) - Number(a.featured),
    };
    products.sort(typeof req.query.sort === 'string' && Object.hasOwn(sorting, req.query.sort) ? sorting[req.query.sort] : sorting.featured);
    res.json({ products });
  });
  app.get('/api/products/:slug', (req, res) => {
    const product = getProduct(req.params.slug);
    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
    res.json({ product });
  });

  app.post('/api/auth/register', rateLimit('register', 10, 60 * 60 * 1000), (req, res) => {
    const name = string(req.body.name, 'Họ tên', 2, 80);
    const address = email(req.body.email);
    const password = validatePassword(req.body.password);
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(address)) throw new ApiError(409, 'Email đã được đăng ký.');
    const user = { id: randomUUID(), name, email: address, role: 'customer' };
    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(user.id, user.name, user.email, passwordHash(password));
    setSession(req, res, user.id);
    res.status(201).json({ user });
  });
  app.post('/api/auth/login', rateLimit('login', 10, 15 * 60 * 1000), (req, res) => {
    const address = email(req.body.email);
    const password = validatePassword(req.body.password, 1);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(address);
    const valid = verifyPassword(password, user?.password_hash || dummyPassword);
    if (!user || !valid) throw new ApiError(401, 'Email hoặc mật khẩu chưa đúng.');
    setSession(req, res, user.id);
    res.json({ user: safeUser(user) });
  });
  app.get('/api/auth/me', (req, res) => res.json({ user: safeUser(req.user) }));
  app.post('/api/auth/logout', (req, res) => {
    if (req.sessionHash) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.sessionHash);
    res.clearCookie('nguyentech_session', { httpOnly: true, sameSite: 'lax', secure: production, path: '/' });
    res.json({ user: null });
  });

  app.post('/api/orders', rateLimit('orders', 20, 60 * 60 * 1000), (req, res) => {
    const input = req.body.customer;
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'Thông tin giao hàng không hợp lệ.');
    const customer = {
      name: string(input.name, 'Họ tên', 2, 80), email: email(input.email),
      phone: string(input.phone, 'Số điện thoại', 9, 20),
      address: string(input.address, 'Địa chỉ', 5, 200), ward: string(input.ward, 'Phường/xã', 2, 80),
      district: string(input.district, 'Quận/huyện', 2, 80), city: string(input.city, 'Tỉnh/thành phố', 2, 80),
      note: string(input.note ?? '', 'Ghi chú', 0, 500),
    };
    if (!/^(?:\+84|0)[\d .()-]{8,16}$/.test(customer.phone) || !/^(?:0\d{9}|84\d{9})$/.test(customer.phone.replace(/\D/g, ''))) throw new ApiError(400, 'Số điện thoại Việt Nam không hợp lệ.');
    if (req.body.paymentMethod !== 'cod') throw new ApiError(400, 'Hiện cửa hàng hỗ trợ thanh toán khi nhận hàng (COD).');
    const coupon = string(req.body.coupon ?? '', 'Mã ưu đãi', 0, 40).toUpperCase();
    if (coupon && coupon !== 'HELLO10') throw new ApiError(400, 'Mã ưu đãi không hợp lệ.');
    if (req.body.expectedTotal !== undefined && (!Number.isSafeInteger(req.body.expectedTotal) || req.body.expectedTotal < 0)) throw new ApiError(400, 'Tổng tiền dự kiến không hợp lệ.');
    if (!Array.isArray(req.body.items) || !req.body.items.length || req.body.items.length > 50) throw new ApiError(400, 'Giỏ hàng không hợp lệ.');
    const seen = new Map();
    const prepared = req.body.items.map((item) => {
      if (!item || typeof item !== 'object') throw new ApiError(400, 'Sản phẩm trong giỏ hàng không hợp lệ.');
      const id = string(item.productId, 'Sản phẩm', 1, 100);
      const quantity = item.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new ApiError(400, 'Số lượng sản phẩm phải từ 1 đến 20.');
      const color = string(item.color ?? '', 'Màu sắc', 0, 80);
      seen.set(id, (seen.get(id) || 0) + quantity);
      if (seen.get(id) > 20) throw new ApiError(400, 'Tổng số lượng mỗi sản phẩm không được vượt quá 20.');
      return { id, quantity, color };
    });
    db.exec('BEGIN IMMEDIATE');
    try {
      const items = prepared.map(({ id, quantity, color }) => {
        const product = getProduct(id);
        if (!product) throw new ApiError(400, 'Một sản phẩm trong giỏ hàng không còn tồn tại.');
        if (seen.get(id) > product.stock) throw new ApiError(409, `${product.name} chỉ còn ${product.stock} sản phẩm.`);
        const selectedColor = color || product.colors[0];
        if (!product.colors.includes(selectedColor)) throw new ApiError(400, 'Màu sản phẩm không hợp lệ.');
        return { productId: id, name: product.name, slug: product.slug, image: product.image, price: product.price, quantity, color: selectedColor };
      });
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discount = coupon === 'HELLO10' ? Math.min(Math.round(subtotal * 0.1), 500000) : 0;
      const shipping = subtotal >= 2000000 ? 0 : 30000;
      const total = subtotal - discount + shipping;
      if (req.body.expectedTotal !== undefined && req.body.expectedTotal !== total) throw new ApiError(409, 'Giá hoặc phí đơn hàng đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.');
      const createdAt = new Date().toISOString();
      const order = {
        number: `NT-${createdAt.slice(0, 10).replaceAll('-', '')}-${randomBytes(5).toString('hex').toUpperCase()}`,
        createdAt, status: 'pending', items, subtotal, discount, shipping, total,
        customer, paymentMethod: 'cod', coupon,
      };
      for (const [id, quantity] of seen) db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, id);
      db.prepare('INSERT INTO orders (id, number, user_id, customer_email, created_at, json) VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), order.number, req.user?.id || null, customer.email, createdAt, JSON.stringify(order));
      db.exec('COMMIT');
      res.status(201).json({ order });
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  });
  app.get('/api/orders', (req, res) => {
    if (!req.user) throw new ApiError(401, 'Vui lòng đăng nhập để xem đơn hàng.');
    const orders = db.prepare('SELECT json FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id).map((row) => JSON.parse(row.json));
    res.json({ orders });
  });
  app.post('/api/orders/lookup', rateLimit('lookup', 8, 15 * 60 * 1000), (req, res) => {
    const number = string(req.body.number, 'Mã đơn hàng', 1, 40).toUpperCase();
    const address = email(req.body.email);
    const row = db.prepare('SELECT json FROM orders WHERE number = ? AND customer_email = ?').get(number, address);
    if (!row) throw new ApiError(404, 'Không tìm thấy đơn hàng với thông tin đã nhập.');
    res.json({ order: JSON.parse(row.json) });
  });

  app.use('/api/admin', (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Vui lòng đăng nhập để tiếp tục.'));
    if (req.user.role !== 'admin') return next(new ApiError(403, 'Bạn không có quyền quản trị cửa hàng.'));
    next();
  });
  app.get('/api/admin/orders', (_req, res) => {
    const orders = db.prepare('SELECT json FROM orders ORDER BY created_at DESC').all().map((row) => JSON.parse(row.json));
    res.json({ orders });
  });
  app.get('/api/admin/products', (_req, res) => res.json({ products: getProducts() }));
  app.patch('/api/admin/products/:id', (req, res) => {
    const product = getProduct(req.params.id);
    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
    const { price, stock } = req.body;
    if (price === undefined && stock === undefined) throw new ApiError(400, 'Vui lòng cung cấp giá hoặc số lượng tồn kho.');
    if (price !== undefined && (!Number.isSafeInteger(price) || price < 1000 || price > 1000000000)) throw new ApiError(400, 'Giá bán phải là số nguyên từ 1.000₫ đến 1.000.000.000₫.');
    if (stock !== undefined && (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000)) throw new ApiError(400, 'Tồn kho phải là số nguyên từ 0 đến 1.000.000.');
    if (price !== undefined && stock !== undefined) db.prepare('UPDATE products SET price_override = ?, stock = ? WHERE id = ?').run(price, stock, product.id);
    else if (price !== undefined) db.prepare('UPDATE products SET price_override = ? WHERE id = ?').run(price, product.id);
    else db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, product.id);
    res.json({ product: getProduct(product.id) });
  });
  app.patch('/api/admin/orders/:number', (req, res) => {
    const status = string(req.body.status, 'Trạng thái', 1, 20);
    const transitions = { pending: ['confirmed', 'cancelled'], confirmed: ['shipping', 'cancelled'], shipping: ['completed'], completed: [], cancelled: [] };
    if (!Object.hasOwn(transitions, status)) throw new ApiError(400, 'Trạng thái đơn hàng không hợp lệ.');
    db.exec('BEGIN IMMEDIATE');
    try {
      const row = db.prepare('SELECT id, json FROM orders WHERE number = ?').get(req.params.number);
      if (!row) throw new ApiError(404, 'Không tìm thấy đơn hàng.');
      const order = JSON.parse(row.json);
      if (order.status === status) { db.exec('COMMIT'); return res.json({ order }); }
      if (!transitions[order.status]?.includes(status)) throw new ApiError(409, 'Không thể chuyển đơn hàng sang trạng thái này.');
      if (status === 'cancelled') {
        for (const item of order.items) db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.productId);
      }
      order.status = status;
      order.updatedAt = new Date().toISOString();
      db.prepare('UPDATE orders SET json = ? WHERE id = ?').run(JSON.stringify(order), row.id);
      db.exec('COMMIT');
      res.json({ order });
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  });
  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'Không tìm thấy chức năng yêu cầu.')));
  const dist = resolve(here, '../dist');
  if (existsSync(resolve(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get(/.*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Dữ liệu JSON không hợp lệ.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Dữ liệu gửi lên quá lớn.' });
    if (!error.status) console.error('API error:', error.message);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  });
  return { app, db, close: () => db.close() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const instance = createApp();
  const port = Number(process.env.PORT || 3001);
  const server = instance.app.listen(port, '0.0.0.0', () => console.log(`Nguyen Tech API listening on http://localhost:${port}`));
  function shutdown() { server.close(() => { instance.close(); process.exit(0); }); }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
