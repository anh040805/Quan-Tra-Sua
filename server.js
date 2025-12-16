// FILE: server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --- CẤU HÌNH ĐƯỜNG DẪN THÔNG MINH ---
// Tự động tìm file index.html dù ở trong 'public' hay ở ngoài
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.use(express.static(__dirname)); 

// --- KẾT NỐI DATABASE ---
// ⚠️ QUAN TRỌNG: Hãy thay mật khẩu của bạn vào chỗ TraSua123
const mongoURI = 'mongodb+srv://admin:trasua123@trasua.hycfxqc.mongodb.net/?appName=Trasua';
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Đã kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

// --- TẠO SCHEMA (KHUÔN DỮ LIỆU) ---
const ProductSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    image: String,
    category: String
});

const OrderSchema = new mongoose.Schema({
    customerName: String,
    phone: String, // Dùng SĐT để định danh khách hàng
    address: String,
    items: Array,
    totalPrice: Number,
    status: { type: String, default: 'Đang xử lý' },
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);

// --- CÁC API (CHỨC NĂNG) ---

// 1. Lấy menu
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Tạo dữ liệu mẫu (Reset Menu)
app.get('/api/init', async (req, res) => {
    await Product.deleteMany({});
    await Product.insertMany([
        { name: "Trà Sữa Trân Châu Đường Đen", price: 35000, category: "Trà Sữa", description: "Sữa tươi thanh trùng, trân châu nấu đường đen đậm đà.", image: "https://cdn-icons-png.flaticon.com/512/3081/3081162.png" },
        { name: "Trà Đào Cam Sả", price: 40000, category: "Trà Trái Cây", description: "Đào ngâm giòn, vị trà thơm hương sả.", image: "https://cdn-icons-png.flaticon.com/512/931/931949.png" },
        { name: "Matcha Đá Xay", price: 45000, category: "Đá Xay", description: "Matcha Nhật Bản xay nhuyễn với lớp kem cheese béo.", image: "https://cdn-icons-png.flaticon.com/512/2405/2405451.png" },
        { name: "Lục Trà Kim Quất", price: 30000, category: "Trà Trái Cây", description: "Vị chua ngọt thanh mát, giải nhiệt cực đã.", image: "https://cdn-icons-png.flaticon.com/512/3081/3081096.png" },
        { name: "Cà Phê Sữa Đá", price: 25000, category: "Cà Phê", description: "Cà phê rang xay nguyên chất, sữa đặc béo ngậy.", image: "https://cdn-icons-png.flaticon.com/512/2935/2935413.png" },
        { name: "Trà Sữa Thái Xanh", price: 32000, category: "Trà Sữa", description: "Hương thơm trà Thái đặc trưng, màu xanh bắt mắt.", image: "https://cdn-icons-png.flaticon.com/512/1187/1187466.png" }
    ]);
    res.send("Đã khởi tạo Menu thành công! Hãy quay lại trang chủ.");
});

// 3. Đặt hàng
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.json({ success: true, message: "Đã nhận đơn hàng!" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 4. Xem lịch sử (Tìm theo số điện thoại)
app.get('/api/history/:phone', async (req, res) => {
    try {
        const orders = await Order.find({ phone: req.params.phone }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- XỬ LÝ LỖI KHÔNG TÌM THẤY FILE ---
app.get('*', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) res.sendFile(path.join(__dirname, 'index.html'));
    });
});

// --- CHẠY SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server đang chạy tại Port: ${PORT}`));