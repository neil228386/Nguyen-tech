export const formatPrice = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
export const normalizeSearch = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
export const categories = [
  { id: 'smartphones', label: 'Điện thoại', icon: 'Smartphone', text: 'Kết nối mọi khoảnh khắc' },
  { id: 'laptops', label: 'Laptop', icon: 'Laptop', text: 'Làm việc. Sáng tạo. Bứt phá.' },
  { id: 'tablets', label: 'Máy tính bảng', icon: 'Tablet', text: 'Nhỏ gọn, đầy cảm hứng' },
  { id: 'audio', label: 'Âm thanh', icon: 'Headphones', text: 'Đắm chìm trong chất âm' },
  { id: 'accessories', label: 'Phụ kiện', icon: 'Cable', text: 'Hoàn thiện trải nghiệm' },
  { id: 'gaming', label: 'Gaming', icon: 'Gamepad2', text: 'Sẵn sàng cho mọi cuộc chơi' },
];
