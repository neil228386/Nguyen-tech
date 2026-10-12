import { build } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { seedProducts } from '../server/products.mjs';

process.env.VITE_DEMO = 'true';
const result = await build({ base: './', build: { write: false, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true } } } });
const output = (Array.isArray(result) ? result[0] : result).output;
let script = output.find(item => item.type === 'chunk' && item.isEntry).code;
let css = output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css')).map(item => item.source).join('\n');
const mime = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
function dataUri(path) {
  const bytes = readFileSync(resolve('public', path.replace(/^\//, '')));
  const type = mime[extname(path)] || (bytes[0] === 0x89 ? 'image/png' : bytes.subarray(0,4).toString() === 'RIFF' ? 'image/webp' : 'image/jpeg');
  return `data:${type};base64,${bytes.toString('base64')}`;
}
const paths = new Set(seedProducts.flatMap(product => [product.image, ...product.gallery]));
const assets = Object.fromEntries([...paths].map(path => [path, dataUri(path)]));
for (const path of ['/images/hero-macbook.jpg', '/images/airpods.jpg', '/images/workstation.jpg', '/favicon.svg']) script = script.split(path).join(dataUri(path));
css = css.replace(/\/fonts\/[A-Za-z0-9-]+\.woff2/g, path => dataUri(path));
css += '\n.offline-notice{padding:12px 20px;background:#ecf9c7;color:#354522;text-align:center;font:500 11px/1.7 "Be Vietnam Pro",sans-serif;border-bottom:1px solid #cbdc9b}.offline-notice strong{font-weight:700}.offline-notice a{text-decoration:underline;margin-left:8px}';
const html = `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nguyen Tech — Bản mẫu mở trực tiếp</title><link rel="icon" href="${dataUri('/favicon.svg')}"><style>${css}</style></head><body><div class="offline-notice"><strong>BẢN MẪU OFFLINE</strong> · Dùng thông tin giả để thử mua hàng. Đơn và tài khoản chỉ mô phỏng, mất khi tải lại. Không gửi dữ liệu ra mạng. Đăng nhập mẫu bằng email bất kỳ để thử quản trị.<a href="#/quan-tri">Xem quản trị</a></div><div id="root"></div><script>window.__NT_ASSETS__=${JSON.stringify(assets).replace(/</g,'\\u003c')};</script><script type="module">${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
mkdirSync('demo', { recursive: true });
writeFileSync('demo/nguyen-tech-demo.html', html);
writeFileSync('/tmp/nguyen-tech-demo.html', html);
console.log(`Standalone demo written: demo/nguyen-tech-demo.html (${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB)`);
