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
// ⚠️ Thay mật khẩu của bạn vào đây nhé
const mongoURI = 'mongodb+srv://admin:trasua123@trasua.hycfxqc.mongodb.net/?appName=Trasua';
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Đã kết nối MongoDB!'))
    .catch(err => console.error('❌ Lỗi DB:', err));

// --- SCHEMAS (KHUÔN DỮ LIỆU) ---
const ProductSchema = new mongoose.Schema({
    name: String, price: Number, category: String, image: String
});

const TableSchema = new mongoose.Schema({
    name: String, status: { type: String, default: 'empty' } // empty, busy
});

const OrderSchema = new mongoose.Schema({
    customerName: String,
    totalPrice: Number,
    items: Array,
    tableId: String, // Nếu ăn tại bàn
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);
const Table = mongoose.model('Table', TableSchema);
const Order = mongoose.model('Order', OrderSchema);

// --- API KHỞI TẠO DỮ LIỆU MẪU (CHẠY 1 LẦN) ---
app.get('/api/init', async (req, res) => {
    // 1. Tạo Menu Đa Dạng
    await Product.deleteMany({});
    await Product.insertMany([
        { name: "Sữa Tươi Trân Châu Đường Đen", price: 35000, category: "Trà Sữa", image: "https://cdn-icons-png.flaticon.com/512/3081/3081162.png" },
        { name: "Trà Sữa Truyền Thống", price: 30000, category: "Trà Sữa", image: "https://cdn-icons-png.flaticon.com/512/1187/1187466.png" },
        { name: "Trà Sữa Matcha", price: 38000, category: "Trà Sữa", image: "https://cdn-icons-png.flaticon.com/512/2405/2405451.png" },
        { name: "Trà Đào Cam Sả", price: 40000, category: "Trà Trái Cây", image: "https://cdn-icons-png.flaticon.com/512/931/931949.png" },
        { name: "Lục Trà Kim Quất", price: 35000, category: "Trà Trái Cây", image: "https://cdn-icons-png.flaticon.com/512/3081/3081096.png" },
        { name: "Trà Vải Hoa Hồng", price: 42000, category: "Trà Trái Cây", image: "https://cdn-icons-png.flaticon.com/512/1047/1047503.png" },
        { name: "Cà Phê Sữa Đá", price: 25000, category: "Cà Phê", image: "https://cdn-icons-png.flaticon.com/512/2935/2935413.png" },
        { name: "Bạc Xỉu", price: 28000, category: "Cà Phê", image: "https://cdn-icons-png.flaticon.com/512/924/924514.png" }
    ]);

    // 2. Tạo Bàn (10 bàn)
    await Table.deleteMany({});
    const tables = [];
    for(let i=1; i<=10; i++) tables.push({ name: `Bàn ${i}`, status: 'empty' });
    await Table.insertMany(tables);

    // 3. Tạo Đơn Hàng Giả Lập (Để vẽ biểu đồ)
    await Order.deleteMany({});
    // Tạo 20 đơn ngẫu nhiên trong 7 ngày qua
    const fakeOrders = [];
    for(let i=0; i<20; i++) {
        const daysAgo = Math.floor(Math.random() * 7);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        fakeOrders.push({
            customerName: "Khách lẻ",
            totalPrice: Math.floor(Math.random() * 100000) + 30000,
            items: [{name: "Trà Sữa Test", price: 30000}],
            createdAt: date
        });
    }
    await Order.insertMany(fakeOrders);

    res.send("Đã khởi tạo Menu, Bàn và Dữ liệu thống kê mẫu!");
});

// --- CÁC API CHÍNH ---

// Lấy danh sách sản phẩm
app.get('/api/products', async (req, res) => res.json(await Product.find()));

// Lấy danh sách bàn
app.get('/api/tables', async (req, res) => res.json(await Table.find().sort({name: 1})));

// Cập nhật trạng thái bàn
app.post('/api/tables/:id', async (req, res) => {
    await Table.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true });
});

// Tạo đơn hàng mới
app.post('/api/orders', async (req, res) => {
    const newOrder = new Order(req.body);
    await newOrder.save();
    
    // Nếu có chọn bàn, chuyển bàn đó thành 'busy'
    if(req.body.tableId) {
        await Table.findByIdAndUpdate(req.body.tableId, { status: 'busy' });
    }
    res.json({ success: true });
});

// API THỐNG KÊ (AGGREGATION)
app.get('/api/stats', async (req, res) => {
    try {
        // 1. Tổng quan
        const totalRevenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalPrice" } } }]);
        const totalOrders = await Order.countDocuments();
        
        // 2. Thống kê theo ngày (7 ngày gần nhất)
        const dailyStats = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    dailyRevenue: { $sum: "$totalPrice" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 7 }
        ]);

        res.json({
            revenue: totalRevenue[0]?.total || 0,
            orders: totalOrders,
            daily: dailyStats
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Xử lý lỗi đường dẫn (Fix lỗi Cannot GET /)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(publicPath, 'admin.html'), (err) => {
        if (err) res.sendFile(path.join(publicPath, 'index.html'));
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server chạy tại Port: ${PORT}`));