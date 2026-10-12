import { demoApi } from './demo-api.js';

export async function api(path, options = {}) {
  if (import.meta.env.VITE_DEMO === 'true') return demoApi(path, options);
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('Không thể kết nối với cửa hàng. Vui lòng thử lại.'); }
  if (!response.ok) throw new Error(data.error || data.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
  return data;
}
