"""Exercise customer and admin workflows against a fresh, disposable SQLite database.

Requires Python Playwright and Chromium; uses the already-built dist/ frontend.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:3107'


def checkout(page, email):
    page.goto(BASE + '/thanh-toan')
    page.locator('input[name="name"]').fill('Nguyễn Test')
    page.locator('input[name="email"]').fill(email)
    page.locator('input[name="phone"]').fill('0901234567')
    page.locator('input[name="address"]').fill('123 Đường Kiểm Thử')
    page.locator('input[name="city"]').fill('Hồ Chí Minh')
    page.locator('input[name="district"]').fill('Quận 1')
    page.locator('input[name="ward"]').fill('Bến Nghé')
    page.locator('#checkout-coupon').fill('HELLO10')
    page.get_by_role('button', name='Áp dụng', exact=True).click()
    assert page.locator('.c-discount').count() == 1
    page.get_by_role('button', name='Đặt hàng ngay').click()
    page.get_by_role('heading', name='Đặt hàng thành công!').wait_for()
    return page.locator('.c-order-number strong').inner_text()


def run():
    if not (ROOT / 'dist/index.html').exists():
        raise RuntimeError('Run npm run build before the browser suite.')
    with tempfile.TemporaryDirectory(prefix='nguyen-tech-browser-') as tmp:
        env = {**os.environ, 'DATABASE_PATH': str(Path(tmp) / 'shop.sqlite'), 'PORT': '3107', 'NODE_ENV': 'test'}
        server = subprocess.Popen(['node', 'server/index.mjs'], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            for attempt in range(50):
                try:
                    with urllib.request.urlopen(BASE + '/api/health', timeout=1) as response:
                        if json.load(response)['ok']:
                            break
                except Exception:
                    time.sleep(0.1)
            else:
                raise RuntimeError('Disposable backend failed to start.')
            with sync_playwright() as pw:
                browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
                page = browser.new_page(viewport={'width': 1440, 'height': 1000})
                errors = []
                page.on('pageerror', lambda err: errors.append(str(err)))
                page.goto(BASE)
                page.locator('.product-card').first.wait_for()
                assert page.locator('.product-card').count() == 4
                assert page.locator('h1').inner_text().startswith('Công nghệ mới.')
                page.locator('.header-search input').fill('MacBook')
                page.locator('.header-search input').press('Enter')
                page.wait_for_url('**/san-pham?q=MacBook')
                assert page.locator('.product-card').count() == 2
                page.get_by_label('Sắp xếp sản phẩm').select_option('price-asc')
                assert 'Air' in page.locator('.product-card h3').first.inner_text()
                page.locator('.wishlist-button').first.click()
                page.goto(BASE + '/san-pham?q=chong%20on')
                page.locator('.product-card').first.wait_for()
                assert page.locator('.product-card').count() == 2
                page.goto(BASE + '/yeu-thich')
                assert page.locator('.product-card').count() == 1
                page.locator('.product-card h3 a').click()
                page.locator('.product-purchase h1').wait_for()
                page.get_by_role('button', name='Thông số kỹ thuật', exact=True).click()
                assert page.locator('.full-specs dt').count() >= 4
                page.get_by_role('button', name='Thêm vào giỏ hàng', exact=True).click()
                page.goto(BASE + '/gio-hang')
                assert page.locator('.cart-row').count() == 1
                page.evaluate("const rows=JSON.parse(localStorage.getItem('nt-cart')); rows[0].product.price=1000; rows[0].product.stock=0; localStorage.setItem('nt-cart',JSON.stringify(rows));")
                page.reload()
                page.locator('.cart-item-copy > strong').filter(has_text='26.990.000').wait_for()
                assert page.locator('.cart-row').count() == 1
                guest_order = checkout(page, 'guest@example.test')
                assert page.locator('.header-cart b').inner_text() == '0'
                page.goto(BASE + '/tra-cuu-don-hang')
                page.locator('input[name="number"]').fill(guest_order)
                page.locator('input[name="email"]').fill('wrong@example.test')
                page.get_by_role('button', name='Tra cứu đơn', exact=True).click()
                page.locator('.c-lookup-error').wait_for()
                page.locator('input[name="email"]').fill('guest@example.test')
                page.get_by_role('button', name='Tra cứu đơn', exact=True).click()
                page.locator('.c-tracking-result').wait_for()
                assert page.locator('.c-tracking-result-header h2').inner_text() == guest_order
                page.goto(BASE + '/tai-khoan')
                page.get_by_role('tab', name='Tạo tài khoản', exact=True).click()
                page.locator('input[name="name"]').fill('Chủ Cửa Hàng')
                page.locator('input[name="email"]').fill('owner@example.test')
                page.locator('input[name="password"]').fill('BrowserTestOnly!2026')
                page.locator('button[type="submit"]').click()
                page.locator('.c-profile-card').wait_for()
                page.goto(BASE + '/quan-tri')
                page.get_by_role('heading', name='Khu vực quản trị.').wait_for()
                subprocess.run(['node', 'server/admin.mjs', 'owner@example.test'], cwd=ROOT, env=env, check=True, capture_output=True)
                page.reload()
                page.get_by_role('heading', name='Quản trị cửa hàng.').wait_for()
                assert page.locator('.a-order-card').count() == 1
                page.locator('.a-order-card').get_by_text('Xác nhận đơn', exact=True).click()
                page.locator('.a-order-card').get_by_text('Chuyển sang đang giao', exact=True).wait_for()
                page.locator('.a-order-card').get_by_text('Chuyển sang đang giao', exact=True).click()
                page.locator('.a-order-card').get_by_text('Hoàn tất đơn', exact=True).wait_for()
                page.locator('.a-order-card').get_by_text('Hoàn tất đơn', exact=True).click()
                page.locator('.a-order-card .badge').filter(has_text='Hoàn tất').wait_for()
                page.get_by_role('tab', name='Sản phẩm & tồn kho', exact=True).click()
                page.locator('.a-product-row').first.wait_for()
                editor = page.locator('.a-product-row').filter(has=page.get_by_label('Giá bán MacBook Air M4 13 inch 16GB/256GB', exact=True))
                editor.get_by_label('Giá bán MacBook Air M4 13 inch 16GB/256GB', exact=True).fill('70000000')
                editor.get_by_label('Tồn kho MacBook Air M4 13 inch 16GB/256GB', exact=True).fill('17')
                editor.get_by_role('button', name='Lưu MacBook Air M4 13 inch 16GB/256GB', exact=True).click()
                editor.locator('.a-row-success').wait_for()
                page.goto(BASE + '/san-pham?q=MacBook')
                page.locator('.product-card').first.wait_for()
                assert page.locator('.product-card').count() == 2, 'Unfiltered catalogue must include products over 60m'
                page.goto(BASE + '/san-pham?category=audio')
                page.locator('.product-card').first.wait_for()
                assert page.locator('.product-card').count() == 3
                page.locator('.add-button').first.click()
                member_order = checkout(page, 'owner@example.test')
                page.goto(BASE + '/tai-khoan')
                page.locator('.c-account-order').wait_for()
                assert member_order in page.locator('.c-account-order').inner_text()
                page.get_by_role('button', name='Đăng xuất', exact=True).click()
                page.get_by_role('heading', name='Chào mừng trở lại.').wait_for()
                page.locator('input[name="email"]').fill('owner@example.test')
                page.locator('input[name="password"]').fill('BrowserTestOnly!2026')
                page.locator('button[type="submit"]').click()
                page.locator('.c-profile-card').wait_for()
                page.set_viewport_size({'width': 390, 'height': 844})
                for route in ['/', '/san-pham', '/san-pham/macbook-air-m4', '/gio-hang', '/tai-khoan', '/tra-cuu-don-hang', '/quan-tri']:
                    page.goto(BASE + route)
                    page.wait_for_timeout(200)
                    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Mobile overflow: {route}'
                assert not errors, errors
                browser.close()
                print('PASS: browser customer/admin flows, persistence, filtering, checkout, private lookup, auth and 390px mobile layout.')
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()


if __name__ == '__main__':
    run()
