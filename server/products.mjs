const localImages = {
  'iphone-16-pro': '/images/iphone-16-pro.jpg',
  'galaxy-s25-ultra': '/images/galaxy-s25-ultra.jpg',
  'iphone-16': '/images/iphone-16.jpg',
  'pixel-9-pro': '/images/pixel-9-pro.jpg',
  'macbook-air-m4': '/images/macbook-air-m4.jpg',
  'asus-zenbook-14': '/images/asus-zenbook-14.jpg',
  'macbook-pro-m4': '/images/macbook-pro-m4.jpg',
  'ipad-air-m3': '/images/ipad-air-m3.jpg',
  'galaxy-tab-s10': '/images/galaxy-tab-s10.jpg',
  'airpods-pro-2': '/images/airpods-pro-2.jpg',
  'sony-wh-1000xm5': '/images/sony-wh-1000xm5.jpg',
  'jbl-flip-6': '/images/jbl-flip-6.jpg',
  'apple-watch-series-10': '/images/apple-watch-series-10.jpg',
  'anker-powercore-20000': '/images/anker-powercore-20000.jpg',
  'playstation-5': '/images/playstation-5.jpg',
  'logitech-g-pro-x': '/images/logitech-g-pro-x.jpg',
};

const catalogue = [
  ['iphone-16-pro', 'iPhone 16 Pro 256GB', 'smartphones', 'Apple', 28990000, 31990000, 'photo-1592750475338-74b7b21085ab', 'Bán chạy', 24, ['Titan tự nhiên', 'Titan đen', 'Titan trắng'], [['Màn hình', '6.3 inch Super Retina XDR'], ['Chip', 'Apple A18 Pro'], ['Bộ nhớ', '256GB'], ['Camera', '48MP Fusion']], 'Thiết kế titan tinh tế, sức mạnh A18 Pro và camera chuyên nghiệp để ghi lại mọi khoảnh khắc.', true],
  ['galaxy-s25-ultra', 'Samsung Galaxy S25 Ultra 256GB', 'smartphones', 'Samsung', 30990000, 33990000, 'photo-1610945265064-0e34e5519bbf', 'Mới', 18, ['Titan xám', 'Titan đen', 'Titan xanh'], [['Màn hình', '6.9 inch Dynamic AMOLED 2X'], ['Chip', 'Snapdragon 8 Elite'], ['Bộ nhớ', '12GB / 256GB'], ['Camera', '200MP']], 'Galaxy AI, bút S Pen và màn hình sống động mang đến trải nghiệm làm việc và giải trí linh hoạt.', true],
  ['iphone-16', 'iPhone 16 128GB', 'smartphones', 'Apple', 21990000, 24990000, 'photo-1603891128711-11b4b03bb138', 'Giá tốt', 32, ['Xanh lưu ly', 'Hồng', 'Đen'], [['Màn hình', '6.1 inch Super Retina XDR'], ['Chip', 'Apple A18'], ['Bộ nhớ', '128GB'], ['Camera', '48MP Fusion']], 'Hiệu năng nhanh, màu sắc trẻ trung và thời lượng pin cả ngày trong thiết kế dễ cầm nắm.', true],
  ['pixel-9-pro', 'Google Pixel 9 Pro 256GB', 'smartphones', 'Google', 24990000, 27990000, 'photo-1511707171634-5f897ff02aa9', '', 12, ['Đen Obsidian', 'Trắng Porcelain'], [['Màn hình', '6.3 inch LTPO OLED'], ['Chip', 'Google Tensor G4'], ['Bộ nhớ', '16GB / 256GB'], ['Camera', '50MP + 48MP + 48MP']], 'Camera Pixel sắc nét cùng các tính năng AI hữu ích cho những tác vụ hằng ngày.', false],
  ['macbook-air-m4', 'MacBook Air M4 13 inch 16GB/256GB', 'laptops', 'Apple', 26990000, 28990000, 'photo-1517336714731-489689fd1ca8', 'Mới', 20, ['Xanh da trời', 'Bạc', 'Đêm xanh'], [['Màn hình', '13.6 inch Liquid Retina'], ['Chip', 'Apple M4'], ['RAM', '16GB'], ['SSD', '256GB'], ['Trọng lượng', '1.24kg']], 'Mỏng nhẹ, vận hành êm ái và pin bền bỉ. Người bạn đồng hành cho học tập, sáng tạo và công việc.', true],
  ['asus-zenbook-14', 'ASUS Zenbook 14 OLED 16GB/512GB', 'laptops', 'ASUS', 24990000, 27990000, 'photo-1496181133206-80ce9b88a853', 'Giảm giá', 15, ['Xanh Ponder', 'Bạc'], [['Màn hình', '14 inch OLED 2.8K'], ['Chip', 'Intel Core Ultra 5'], ['RAM', '16GB'], ['SSD', '512GB']], 'Màn hình OLED rực rỡ và hiệu năng cân bằng trong thân máy gọn gàng, phù hợp làm việc di động.', true],
  ['macbook-pro-m4', 'MacBook Pro M4 14 inch 16GB/512GB', 'laptops', 'Apple', 42990000, 45990000, 'photo-1517336714731-489689fd1ca8', 'Cao cấp', 10, ['Đen không gian', 'Bạc'], [['Màn hình', '14.2 inch Liquid Retina XDR'], ['Chip', 'Apple M4'], ['RAM', '16GB'], ['SSD', '512GB']], 'Hiệu năng mạnh mẽ cho dựng video, lập trình và sáng tạo cùng màn hình XDR chi tiết.', false],
  ['ipad-air-m3', 'iPad Air M3 11 inch Wi-Fi 128GB', 'tablets', 'Apple', 16990000, 18990000, 'photo-1544244015-0df4b3ffc6b0', 'Mới', 22, ['Xanh dương', 'Tím', 'Ánh sao'], [['Màn hình', '11 inch Liquid Retina'], ['Chip', 'Apple M3'], ['Bộ nhớ', '128GB'], ['Kết nối', 'Wi-Fi 6E']], 'Không gian sáng tạo linh hoạt để ghi chú, vẽ, học tập và giải trí ở bất kỳ đâu.', true],
  ['galaxy-tab-s10', 'Samsung Galaxy Tab S10+ 256GB', 'tablets', 'Samsung', 20990000, 23990000, 'photo-1585790050230-5dd28404ccb9', '', 11, ['Xám Moonstone', 'Bạc Platinum'], [['Màn hình', '12.4 inch Dynamic AMOLED 2X'], ['Chip', 'MediaTek Dimensity 9300+'], ['Bộ nhớ', '12GB / 256GB'], ['Phụ kiện', 'S Pen đi kèm']], 'Màn hình lớn cùng bút S Pen hỗ trợ ghi chú và sáng tạo, kết hợp khả năng đa nhiệm tiện lợi.', false],
  ['airpods-pro-2', 'AirPods Pro 2 USB-C', 'audio', 'Apple', 5290000, 6290000, 'photo-1606841837239-c5a1a4a07af7', 'Bán chạy', 48, ['Trắng'], [['Chip', 'Apple H2'], ['Chống ồn', 'Chủ động ANC'], ['Pin', 'Tối đa 30 giờ với hộp sạc'], ['Sạc', 'USB-C / MagSafe']], 'Âm thanh trong trẻo, chống ồn chủ động và thiết kế gọn nhẹ cho cả ngày thưởng thức âm nhạc.', true],
  ['sony-wh-1000xm5', 'Sony WH-1000XM5', 'audio', 'Sony', 7990000, 8990000, 'photo-1546435770-a3e426bf472b', 'Giá tốt', 21, ['Đen', 'Bạc', 'Xanh'], [['Chống ồn', 'ANC với 8 micro'], ['Pin', 'Tối đa 30 giờ'], ['Kết nối', 'Bluetooth 5.2'], ['Trọng lượng', '250g']], 'Tai nghe chống ồn cao cấp, âm thanh giàu chi tiết và đệm tai êm ái cho những chuyến đi dài.', true],
  ['jbl-flip-6', 'Loa Bluetooth JBL Flip 6', 'audio', 'JBL', 2490000, 2990000, 'photo-1608043152269-423dbba4e7e1', '', 35, ['Đen', 'Xanh', 'Đỏ'], [['Công suất', '30W'], ['Pin', 'Tối đa 12 giờ'], ['Kháng nước', 'IP67'], ['Kết nối', 'Bluetooth 5.1']], 'Âm thanh sống động trong thiết kế di động, chống nước và bụi để đồng hành cùng mọi cuộc vui.', false],
  ['apple-watch-series-10', 'Apple Watch Series 10 GPS 42mm', 'accessories', 'Apple', 9990000, 10990000, 'photo-1546868871-7041f2a55e12', 'Mới', 17, ['Đen bóng', 'Vàng hồng', 'Bạc'], [['Màn hình', 'OLED Retina luôn bật'], ['Chip', 'Apple S10'], ['Kích thước', '42mm'], ['Kháng nước', '50m']], 'Theo dõi vận động, sức khỏe và thông báo tiện lợi với thiết kế mỏng nhẹ, thanh lịch.', true],
  ['anker-powercore-20000', 'Pin dự phòng Anker 20.000mAh 30W', 'accessories', 'Anker', 1290000, 1590000, 'photo-1609592806787-3d9c673bef1a', 'Giá tốt', 50, ['Đen', 'Trắng'], [['Dung lượng', '20.000mAh'], ['Công suất', '30W USB-C PD'], ['Cổng sạc', '2 × USB-C, 1 × USB-A'], ['Bảo vệ', 'MultiProtect']], 'Nguồn năng lượng dự phòng cho điện thoại và máy tính bảng, hỗ trợ sạc nhanh qua USB-C.', false],
  ['playstation-5', 'Sony PlayStation 5 Slim 1TB', 'gaming', 'Sony', 12990000, 14990000, 'photo-1606813907291-d86efa9b94db', 'Hot', 14, ['Trắng'], [['Bộ nhớ', 'SSD 1TB'], ['Độ phân giải', 'Tối đa 4K 120Hz'], ['Tay cầm', 'DualSense'], ['Phiên bản', 'Slim có ổ đĩa']], 'Khám phá thế giới game với đồ họa ấn tượng, tải nhanh và trải nghiệm tay cầm DualSense.', true],
  ['logitech-g-pro-x', 'Chuột Logitech G Pro X Superlight 2', 'gaming', 'Logitech', 2990000, 3490000, 'photo-1527814050087-3793815479db', '', 28, ['Đen', 'Trắng', 'Hồng'], [['Cảm biến', 'HERO 2'], ['Trọng lượng', '60g'], ['Kết nối', 'LIGHTSPEED không dây'], ['Pin', 'Tối đa 95 giờ']], 'Chuột chơi game nhẹ và chính xác, kết nối không dây nhanh để theo kịp mọi thao tác.', false],
];

export const seedProducts = catalogue.map(([slug, name, category, brand, price, oldPrice, _photo, badge, stock, colors, specs, description, featured], index) => ({
  id: slug, slug, name, category, brand, price, oldPrice,
  image: localImages[slug], gallery: [localImages[slug]], imageDisclaimer: 'Ảnh minh họa; thiết kế và màu sắc thực tế có thể khác.', rating: index % 3 === 0 ? 4.9 : 4.8,
  reviewCount: 64 + index * 23, badge, stock, colors,
  specs: specs.map(([label, value]) => ({ label, value })), description, featured,
}));
