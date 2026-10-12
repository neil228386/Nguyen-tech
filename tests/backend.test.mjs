import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server/index.mjs';

let instance;
let server;
let base;
let directory;
let adminCookie;

before(async () => {
  directory = mkdtempSync(join(tmpdir(), 'nguyen-tech-test-'));
  instance = createApp({ databasePath: join(directory, 'shop.sqlite') });
  server = await new Promise((resolve) => {
    const value = instance.app.listen(0, '127.0.0.1', () => resolve(value));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  instance.close();
  rmSync(directory, { recursive: true, force: true });
});

async function request(path, { body, cookie, headers = {}, method = body === undefined ? 'GET' : 'POST' } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
}

const customer = { name: 'Nguyễn Văn An', email: 'buyer@example.com', phone: '0901234567', address: '123 Nguyễn Huệ', ward: 'Bến Nghé', district: 'Quận 1', city: 'TP. Hồ Chí Minh', note: '' };
const checkout = (items, extra = {}) => ({ customer, items, paymentMethod: 'cod', coupon: '', ...extra });

test('catalogue is seeded, searchable and sorted; health checks SQLite', async () => {
  assert.deepEqual((await request('/api/health')).data, { ok: true, database: true });
  const all = (await request('/api/products')).data.products;
  assert.equal(all.length, 16);
  assert.ok(all.every((product) => product.stock > 0 && product.specs.length && product.gallery.length));
  const search = (await request('/api/products?q=iphone&category=smartphones&sort=price-asc')).data.products;
  assert.equal(search.length, 2);
  assert.ok(search[0].price <= search[1].price);
  assert.equal((await request('/api/products?sort=__proto__')).status, 200);
  assert.equal((await request('/api/products/macbook-air-m4')).data.product.id, 'macbook-air-m4');
  assert.equal((await request('/api/products/does-not-exist')).status, 404);
});

test('sessions authenticate users, hashes hide passwords, and logout revokes session', async () => {
  const registration = await request('/api/auth/register', { body: { name: 'Khách hàng', email: 'Account@Example.com', password: 'secure-password-123' } });
  assert.equal(registration.status, 201);
  assert.equal(registration.data.user.email, 'account@example.com');
  assert.ok(registration.headers.get('set-cookie').includes('HttpOnly'));
  assert.ok(registration.headers.get('set-cookie').includes('SameSite=Lax'));
  assert.equal((await request('/api/auth/me', { cookie: registration.cookie })).data.user.id, registration.data.user.id);
  const stored = instance.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(registration.data.user.id).password_hash;
  assert.ok(!stored.includes('secure-password-123'));
  assert.equal((await request('/api/auth/register', { body: { name: 'Other', email: 'account@example.com', password: 'another-password' } })).status, 409);
  assert.equal((await request('/api/auth/login', { body: { email: 'account@example.com', password: 'wrong-password' } })).status, 401);
  const login = await request('/api/auth/login', { body: { email: 'account@example.com', password: 'secure-password-123' } });
  assert.equal(login.status, 200);
  assert.equal((await request('/api/auth/logout', { body: {}, cookie: login.cookie })).status, 200);
  assert.equal((await request('/api/auth/me', { cookie: login.cookie })).data.user, null);
});

test('checkout trusts catalogue prices, caps coupon, deducts stock and privately looks up orders', async () => {
  const product = (await request('/api/products/iphone-16-pro')).data.product;
  const result = await request('/api/orders', { body: checkout([{ productId: product.id, quantity: 2, color: product.colors[0], price: 1 }], { coupon: 'hello10' }) });
  assert.equal(result.status, 201);
  const order = result.data.order;
  assert.equal(order.subtotal, product.price * 2);
  assert.equal(order.discount, 500000);
  assert.equal(order.shipping, 0);
  assert.equal(order.total, product.price * 2 - 500000);
  assert.equal(order.items[0].price, product.price);
  assert.equal((await request(`/api/products/${product.id}`)).data.product.stock, product.stock - 2);
  assert.equal((await request('/api/orders')).status, 401);
  assert.equal((await request('/api/orders/lookup', { body: { number: order.number, email: 'wrong@example.com' } })).status, 404);
  assert.equal((await request('/api/orders/lookup', { body: { number: order.number, email: customer.email } })).data.order.number, order.number);
});

test('authenticated orders are bound to user ID; matching guest email grants no account access', async () => {
  const buyer = await request('/api/auth/register', { body: { name: 'Buyer', email: customer.email, password: 'strong-password-123' } });
  assert.deepEqual((await request('/api/orders', { cookie: buyer.cookie })).data.orders, []);
  const own = await request('/api/orders', { cookie: buyer.cookie, body: checkout([{ productId: 'airpods-pro-2', quantity: 1, color: 'Trắng' }]) });
  assert.equal(own.status, 201);
  const ownOrders = (await request('/api/orders', { cookie: buyer.cookie })).data.orders;
  assert.equal(ownOrders.length, 1);
  assert.equal(ownOrders[0].number, own.data.order.number);
  const other = await request('/api/auth/register', { body: { name: 'Other user', email: 'other@example.com', password: 'strong-password-123' } });
  assert.deepEqual((await request('/api/orders', { cookie: other.cookie })).data.orders, []);
});

test('invalid checkout rolls back inventory and duplicate lines cannot exceed stock', async () => {
  const before = (await request('/api/products/playstation-5')).data.product;
  const result = await request('/api/orders', { body: checkout([{ productId: before.id, quantity: 8, color: 'Trắng' }, { productId: before.id, quantity: 8, color: 'Trắng' }]) });
  assert.equal(result.status, 409);
  assert.equal((await request(`/api/products/${before.id}`)).data.product.stock, before.stock);
  const badColor = await request('/api/orders', { body: checkout([{ productId: 'airpods-pro-2', quantity: 1, color: 'Đỏ' }]) });
  assert.equal(badColor.status, 400);
  assert.equal((await request('/api/orders', { body: checkout([{ productId: 'iphone-16', quantity: 0 }]) })).status, 400);
  assert.equal((await request('/api/orders', { body: checkout([{ productId: 'iphone-16', quantity: 1 }], { paymentMethod: 'card' }) })).status, 400);
  assert.equal((await request('/api/orders', { body: checkout([{ productId: 'iphone-16', quantity: 1 }], { customer: { ...customer, phone: '123' } }) })).status, 400);
});

test('shipping and uncapped 10% discounts are calculated for small orders', async () => {
  const result = await request('/api/orders', { body: checkout([{ productId: 'anker-powercore-20000', quantity: 1, color: 'Đen' }], { coupon: 'HELLO10' }) });
  assert.equal(result.status, 201);
  assert.equal(result.data.order.discount, 129000);
  assert.equal(result.data.order.shipping, 30000);
  assert.equal(result.data.order.total, 1191000);
});

test('API rejects foreign origins, malformed JSON, missing bodies and excessive lookup attempts', async () => {
  assert.equal((await request('/api/auth/login', { body: { email: 'account@example.com', password: 'secure-password-123' }, headers: { Origin: 'https://evil.example' } })).status, 403);
  const invalid = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(invalid.status, 400);
  assert.equal((await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' } })).status, 400);
  let limited;
  for (let index = 0; index < 9; index++) limited = await request('/api/orders/lookup', { body: { number: 'NT-MISSING', email: customer.email } });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
});

test('inventory, orders and cookie sessions survive an application restart', async () => {
  const databasePath = join(directory, 'restart.sqlite');
  let shop = createApp({ databasePath });
  async function listen() {
    const listener = await new Promise((resolve) => {
      const value = shop.app.listen(0, '127.0.0.1', () => resolve(value));
    });
    return { listener, url: `http://127.0.0.1:${listener.address().port}` };
  }
  let active = await listen();
  try {
    const registration = await fetch(`${active.url}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Persistent buyer', email: 'persistent@example.com', password: 'persistent-password' }) });
    const cookie = registration.headers.get('set-cookie').split(';')[0];
    assert.equal(registration.status, 201);
    const created = await fetch(`${active.url}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(checkout([{ productId: 'airpods-pro-2', quantity: 1, color: 'Trắng' }])) });
    const { order } = await created.json();
    assert.equal(created.status, 201);
    shop.db.prepare('UPDATE products SET price_override = ? WHERE id = ?').run(5555000, 'airpods-pro-2');
    await new Promise((resolve) => active.listener.close(resolve));
    shop.close();
    shop = createApp({ databasePath });
    active = await listen();
    const catalog = await (await fetch(`${active.url}/api/products/airpods-pro-2`)).json();
    assert.equal(catalog.product.stock, 47);
    assert.equal(catalog.product.price, 5555000);
    const history = await (await fetch(`${active.url}/api/orders`, { headers: { Cookie: cookie } })).json();
    assert.equal(history.orders.length, 1);
    assert.equal(history.orders[0].number, order.number);
  } finally {
    await new Promise((resolve) => active.listener.close(resolve));
    shop.close();
  }
});

test('admin endpoints enforce roles; CLI promotes registered users and session roles refresh', async () => {
  assert.equal((await request('/api/admin/orders')).status, 401);
  const registration = await request('/api/auth/register', { body: { name: 'Store administrator', email: 'admin@example.com', password: 'admin-password-123', role: 'admin' } });
  assert.equal(registration.status, 201);
  assert.equal(registration.data.user.role, 'customer');
  adminCookie = registration.cookie;
  assert.equal((await request('/api/admin/products', { cookie: adminCookie })).status, 403);
  assert.equal((await request('/api/admin/products/iphone-16', { cookie: adminCookie, method: 'PATCH', body: { price: 1000, stock: 999 } })).status, 403);
  const { stdout } = await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../server/admin.mjs', import.meta.url)), 'ADMIN@example.com'], { env: { ...process.env, DATABASE_PATH: join(directory, 'shop.sqlite') } });
  assert.ok(stdout.includes('Đã cấp quyền quản trị'));
  assert.equal((await request('/api/auth/me', { cookie: adminCookie })).data.user.role, 'admin');
  assert.equal((await request('/api/admin/products', { cookie: adminCookie })).data.products.length, 16);
  assert.ok((await request('/api/admin/orders', { cookie: adminCookie })).data.orders.length >= 3);
});

test('admin price and stock edits are validated and checkout uses new trusted prices', async () => {
  assert.equal((await request('/api/admin/products/anker-powercore-20000', { cookie: adminCookie, method: 'PATCH', body: { price: 1.5 } })).status, 400);
  assert.equal((await request('/api/admin/products/anker-powercore-20000', { cookie: adminCookie, method: 'PATCH', body: { stock: -1 } })).status, 400);
  assert.equal((await request('/api/admin/products/missing', { cookie: adminCookie, method: 'PATCH', body: { stock: 0 } })).status, 404);
  const changed = await request('/api/admin/products/anker-powercore-20000', { cookie: adminCookie, method: 'PATCH', body: { price: 1500000, stock: 5 } });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.product.price, 1500000);
  assert.equal(changed.data.product.stock, 5);
  const result = await request('/api/orders', { cookie: adminCookie, body: checkout([{ productId: 'anker-powercore-20000', quantity: 1, color: 'Đen', price: 1 }]) });
  assert.equal(result.status, 201);
  assert.equal(result.data.order.subtotal, 1500000);
  assert.equal((await request('/api/products/anker-powercore-20000')).data.product.stock, 4);
});

test('admin statuses follow delivery lifecycle and cancellation restores inventory only once', async () => {
  const product = (await request('/api/products/logitech-g-pro-x')).data.product;
  const cancelledOrder = await request('/api/orders', { cookie: adminCookie, body: checkout([{ productId: product.id, quantity: 2, color: 'Đen' }]) });
  const number = cancelledOrder.data.order.number;
  assert.equal(cancelledOrder.status, 201);
  assert.equal((await request(`/api/admin/orders/${number}`, { cookie: adminCookie, method: 'PATCH', body: { status: 'shipping' } })).status, 409);
  assert.equal((await request(`/api/admin/orders/${number}`, { cookie: adminCookie, method: 'PATCH', body: { status: 'cancelled' } })).data.order.status, 'cancelled');
  assert.equal((await request(`/api/products/${product.id}`)).data.product.stock, product.stock);
  assert.equal((await request(`/api/admin/orders/${number}`, { cookie: adminCookie, method: 'PATCH', body: { status: 'cancelled' } })).status, 200);
  assert.equal((await request(`/api/products/${product.id}`)).data.product.stock, product.stock);
  assert.equal((await request(`/api/admin/orders/${number}`, { cookie: adminCookie, method: 'PATCH', body: { status: 'confirmed' } })).status, 409);
  const delivered = await request('/api/orders', { cookie: adminCookie, body: checkout([{ productId: product.id, quantity: 1, color: 'Đen' }]) });
  for (const status of ['confirmed', 'shipping', 'completed']) {
    const changed = await request(`/api/admin/orders/${delivered.data.order.number}`, { cookie: adminCookie, method: 'PATCH', body: { status } });
    assert.equal(changed.status, 200);
    assert.equal(changed.data.order.status, status);
  }
  assert.equal((await request(`/api/admin/orders/${delivered.data.order.number}`, { cookie: adminCookie, method: 'PATCH', body: { status: 'cancelled' } })).status, 409);
  assert.equal((await request(`/api/products/${product.id}`)).data.product.stock, product.stock - 1);
  const accountOrders = (await request('/api/orders', { cookie: adminCookie })).data.orders;
  assert.equal(accountOrders.find((order) => order.number === delivered.data.order.number).status, 'completed');
});

test('schema migration adds admin roles and price overrides without resetting existing data', () => {
  const databasePath = join(directory, 'legacy.sqlite');
  const legacy = new DatabaseSync(databasePath);
  legacy.exec('CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL); CREATE TABLE products (id TEXT PRIMARY KEY, json TEXT NOT NULL, stock INTEGER NOT NULL);');
  legacy.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').run('existing', 'Existing buyer', 'existing@example.com', 'preserved-password-hash');
  legacy.prepare('INSERT INTO products VALUES (?, ?, ?)').run('airpods-pro-2', '{}', 7);
  legacy.close();
  const upgraded = createApp({ databasePath });
  try {
    const user = upgraded.db.prepare('SELECT * FROM users WHERE id = ?').get('existing');
    assert.equal(user.role, 'customer');
    assert.equal(user.password_hash, 'preserved-password-hash');
    const product = upgraded.db.prepare('SELECT * FROM products WHERE id = ?').get('airpods-pro-2');
    assert.equal(product.stock, 7);
    assert.equal(product.price_override, null);
    assert.equal(JSON.parse(product.json).id, 'airpods-pro-2');
  } finally { upgraded.close(); }
});

test('stale expected checkout totals reject orders without deducting stock or saving orders', async () => {
  const product = (await request('/api/products/iphone-16')).data.product;
  const beforeOrders = instance.db.prepare('SELECT COUNT(*) AS count FROM orders').get().count;
  const result = await request('/api/orders', { body: checkout([{ productId: product.id, quantity: 1, color: product.colors[0] }], { expectedTotal: product.price - 1 }) });
  assert.equal(result.status, 409);
  assert.equal(result.data.message, 'Giá hoặc phí đơn hàng đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.');
  assert.equal((await request(`/api/products/${product.id}`)).data.product.stock, product.stock);
  assert.equal(instance.db.prepare('SELECT COUNT(*) AS count FROM orders').get().count, beforeOrders);
});
