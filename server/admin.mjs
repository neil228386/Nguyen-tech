import { createApp } from './index.mjs';

const supplied = process.argv[2];
if (process.argv.length !== 3 || typeof supplied !== 'string' || supplied.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplied.trim())) {
  console.error('Cách dùng: node server/admin.mjs <email-tài-khoản-đã-đăng-ký>');
  process.exitCode = 1;
} else {
  const instance = createApp();
  try {
    const email = supplied.trim().toLowerCase();
    const user = instance.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      console.error('Không tìm thấy tài khoản. Hãy đăng ký trên website trước khi cấp quyền quản trị.');
      process.exitCode = 1;
    } else {
      instance.db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
      console.log('Đã cấp quyền quản trị cho tài khoản đã đăng ký.');
    }
  } finally { instance.close(); }
}
