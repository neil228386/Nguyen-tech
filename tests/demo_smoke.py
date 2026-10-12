"""Load the standalone demo with all network access disabled.

The HTML document is supplied directly to Chromium; assets/API may not request
the network. This also works in cloud browsers that block file:// navigation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = 'http://127.0.0.1:3113/demo.html'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(offline=True, viewport={'width': 1366, 'height': 900})
    context.route(URL, lambda route: route.fulfill(content_type='text/html', body=(ROOT / 'demo/nguyen-tech-demo.html').read_text()))
    page = context.new_page()
    errors, unexpected = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: unexpected.append(request.url) if request.url.startswith(('http:', 'https:')) and request.url != URL else None)
    page.goto(URL)
    page.locator('.product-card').first.wait_for()
    assert page.locator('.product-card').count() == 4
    page.locator('.add-button').first.click()
    page.locator('.header-cart').click()
    page.locator('.cart-row').wait_for()
    page.get_by_role('link', name='Tiến hành đặt hàng').click()
    page.get_by_role('heading', name='Hoàn tất đơn hàng.').wait_for()
    for name, value in {'name': 'Khách Xem Mẫu', 'email': 'demo@example.test', 'phone': '0901234567', 'address': '123 Đường Mẫu', 'city': 'Thành phố Mẫu', 'district': 'Quận Mẫu', 'ward': 'Phường Mẫu'}.items():
        page.locator(f'input[name="{name}"]').fill(value)
    page.get_by_role('button', name='Đặt hàng ngay').click()
    page.get_by_role('heading', name='Đặt hàng thành công!').wait_for()
    number = page.locator('.c-order-number strong').inner_text()
    page.get_by_role('link', name='Tra cứu đơn hàng', exact=True).first.click()
    page.get_by_role('heading', name='Đơn hàng của bạn đang ở đâu?').wait_for()
    page.locator('input[name="number"]').fill(number)
    page.locator('input[name="email"]').fill('demo@example.test')
    page.get_by_role('button', name='Tra cứu đơn', exact=True).click()
    page.locator('.c-tracking-result').wait_for()
    page.locator('.header-account').click()
    page.get_by_role('heading', name='Chào mừng trở lại.').wait_for()
    page.locator('input[name="email"]').fill('demo@example.test')
    page.locator('input[name="password"]').fill('MatKhauMau')
    page.locator('button[type="submit"]').click()
    page.locator('.c-profile-card').wait_for()
    page.get_by_role('link', name='Quản trị cửa hàng').click()
    page.get_by_role('heading', name='Quản trị cửa hàng.').wait_for()
    page.locator('.a-order-card').wait_for()
    page.locator('.brand').first.click()
    page.locator('.product-card').first.wait_for()
    for width in [375, 1366]:
        page.set_viewport_size({'width': width, 'height': 900})
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    assert not errors, errors
    assert not unexpected, [url[:160] for url in unexpected]
    browser.close()
    print('PASS: standalone demo shopping/admin flows, mobile layout; no asset/API network requests or JavaScript errors.')
