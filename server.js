// FILE: server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --- CẤU HÌNH ĐƯỜNG DẪN ---
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.use(express.static(__dirname));

// --- KẾT NỐI MONGODB ---
// ⚠️ Thay mật khẩu của bạn vào đây
// Mật khẩu là trasua123 (viết thường, không dấu)
const mongoURI = 'mongodb+srv://admin:trasua123@trasua.hycfxqc.mongodb.net/?appName=Trasua';
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Đã kết nối MongoDB!'))
    .catch(err => console.error('❌ Lỗi DB:', err));

// --- SCHEMAS (KHUÔN DỮ LIỆU) ---
// 1. Schema Tài Khoản (Mới)
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'customer' }, // 'admin' hoặc 'customer'
    fullName: String
});

// 2. Các Schema cũ
const ProductSchema = new mongoose.Schema({ name: String, price: Number, category: String, image: String });
const TableSchema = new mongoose.Schema({ name: String, status: { type: String, default: 'empty' } });
const OrderSchema = new mongoose.Schema({
    customerName: String,
    phone: String,       // <--- QUAN TRỌNG: Phải có dòng này mới lưu được SĐT
    address: String,     // Thêm địa chỉ để admin biết đường giao
    totalPrice: Number,
    items: Array,
    tableId: String,
    status: { type: String, default: 'Chờ xác nhận' }, // Thêm trạng thái đơn
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Table = mongoose.model('Table', TableSchema);
const Order = mongoose.model('Order', OrderSchema);

// --- API KHỞI TẠO (Tự tạo Admin 123456) ---
app.get('/api/init', async (req, res) => {
    // Tạo tài khoản Admin mặc định nếu chưa có
    const adminExist = await User.findOne({ username: 'admin' });
    if (!adminExist) {
        await User.create({ username: 'admin', password: '123456', role: 'admin', fullName: 'Chủ Quán' });
    }
    
    // Tạo Menu và Bàn (như cũ)
    await Product.deleteMany({});
    await Product.insertMany([
        { name: "Sữa Tươi Trân Châu Đường Đen", price: 35000, category: "Best Seller", image: "https://cdn-icons-png.flaticon.com/512/3081/3081162.png" },
        { name: "Trà Sữa Truyền Thống", price: 30000, category: "Trà Sữa", image: "https://cdn-icons-png.flaticon.com/512/968/968368.png" },
        { name: "Trà Sữa Thái Xanh", price: 32000, category: "Trà Sữa", image: "https://cdn-icons-png.flaticon.com/512/1149/1149810.png" },
        { name: "Trà Đào Cam Sả", price: 40000, category: "Trà Trái Cây", image: "https://cdn-icons-png.flaticon.com/512/931/931949.png" },
        { name: "Lục Trà Kim Quất Mật Ong", price: 38000, category: "Trà Trái Cây", image: "https://cdn-icons-png.flaticon.com/512/878/878049.png" },
        { name: "Trà Vải Hoa Hồng", price: 42000, category: "Trà Trái Cây", image: "https://cdn-icons-png.flaticon.com/512/2405/2405566.png" },
        { name: "Matcha Đá Xay", price: 45000, category: "Đá Xay", image: "https://cdn-icons-png.flaticon.com/512/2405/2405451.png" },
        { name: "Cookie Đá Xay (Oreo)", price: 48000, category: "Đá Xay", image: "https://cdn-icons-png.flaticon.com/512/1848/1848307.png" },
        { name: "Trà Sữa Khoai Môn", price: 35000, category: "Trà Sữa", image: "https://cdn-icons-png.flaticon.com/512/2442/2442304.png" },
        { name: "Sữa Tươi Matcha Nhật Bản", price: 39000, category: "Best Seller", image: "https://cdn-icons-png.flaticon.com/512/3213/3213431.png" }
    ]);
    
    await Table.deleteMany({});
    const tables = [];
    for(let i=1; i<=10; i++) tables.push({ name: `Bàn ${i}`, status: 'empty' });
    await Table.insertMany(tables);

    res.send("Đã khởi tạo: Admin (mk: 123456), Menu và Bàn!");
});

// --- API XÁC THỰC (LOGIN/REGISTER) ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    
    if (user) {
        res.json({ success: true, role: user.role, fullName: user.fullName });
    } else {
        res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password, fullName } = req.body;
    try {
        // Kiểm tra trùng
        const exist = await User.findOne({ username });
        if(exist) return res.json({ success: false, message: "Tên đăng nhập đã tồn tại!" });

        await User.create({ username, password, fullName, role: 'customer' });
        res.json({ success: true, message: "Đăng ký thành công! Hãy đăng nhập." });
    } catch (e) {
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// --- CÁC API KHÁC (Giữ nguyên logic cũ) ---
// --- API DỮ LIỆU BIỂU ĐỒ (Doanh thu 7 ngày gần nhất) ---
app.get('/api/chart-data', async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const stats = await Order.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } }, // Chỉ lấy 7 ngày qua
            { 
                $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Gom nhóm theo ngày
                    total: { $sum: "$totalPrice" } // Cộng tổng tiền
                } 
            },
            { $sort: { _id: 1 } } // Sắp xếp ngày tăng dần
        ]);
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// Lấy toàn bộ đơn hàng (Mới nhất nằm trên cùng)
app.get('/api/all-orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// --- API LỊCH SỬ ĐƠN HÀNG (Tìm theo SĐT) ---
app.get('/api/history', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.json([]); 
    try {
        // Tìm đơn hàng theo SĐT, sắp xếp mới nhất lên đầu
        const orders = await Order.find({ phone: phone }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Thêm đường dẫn cho trang History
app.get('/history', (req, res) => res.sendFile(path.join(__dirname, 'public', 'history.html')));
// Đường dẫn cho trang Home mới
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.get('/api/tables', async (req, res) => res.json(await Table.find().sort({name: 1})));
app.post('/api/tables/:id', async (req, res) => { await Table.findByIdAndUpdate(req.params.id, { status: req.body.status }); res.json({ success: true }); });
app.post('/api/orders', async (req, res) => { 
    await new Order(req.body).save();
    if(req.body.tableId) await Table.findByIdAndUpdate(req.body.tableId, { status: 'busy' });
    res.json({ success: true });
});
app.get('/api/stats', async (req, res) => {
    const total = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalPrice" }, count: {$sum: 1} } }]);
    res.json({ revenue: total[0]?.total || 0, orders: total[0]?.count || 0 });
});

// Điều hướng thông minh
app.get(/.*/, (req, res) => {
    // Mặc định vào trang login (index.html)
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
        if (err) res.status(500).send("Lỗi: Không tìm thấy file index.html");
    });
});

// --- QUAN TRỌNG: CẤU HÌNH ĐƯỜNG DẪN ---

// 1. Phục vụ các file tĩnh (html, css, js)
app.use(express.static('public'));

// 2. Mặc định vào trang chủ là Đăng Nhập
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Các đường dẫn cụ thể (để chắc chắn không lỗi)
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'public', 'menu.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server chạy tại Port: ${PORT}`));