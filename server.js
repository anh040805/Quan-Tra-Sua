const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // <--- MỚI THÊM: Thư viện xử lý đường dẫn

const app = express();
app.use(cors());
app.use(express.json());

// --- PHẦN SỬA LỖI QUAN TRỌNG ---
// Server sẽ tìm file index.html ở khắp nơi:
app.use(express.static('public'));                       // Tìm trong thư mục public
app.use(express.static(path.join(__dirname, 'public'))); // Tìm kỹ hơn trong public (cho Render)
app.use(express.static(__dirname));                      // Tìm ngay tại thư mục gốc (nếu bạn lỡ để file ở ngoài)

// Nếu vẫn không thấy, ép nó trả về file index.html nếu có
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) res.sendFile(path.join(__dirname, 'index.html'));
    });
});
// --------------------------------

// 1. Kết nối MongoDB (Giữ nguyên link của bạn)
mongoose.connect('mongodb+srv://admin:trasua123@trasua.hycfxqc.mongodb.net/?appName=Trasua')
    .then(() => console.log('✅ Đã kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối:', err));

// 2. Schema (Giữ nguyên)
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, price: Number, description: String, image: String
}));
const Order = mongoose.model('Order', new mongoose.Schema({
    customerName: String, items: Array, totalPrice: Number, status: { type: String, default: 'Mới đặt' }, createdAt: { type: Date, default: Date.now }
}));

// 3. Các API (Giữ nguyên)
app.get('/api/init', async (req, res) => {
    await Product.deleteMany({});
    await Product.insertMany([
        { name: "Trà Sữa Trân Châu Đường Đen", price: 35000, description: "Vị trà đậm đà, đường đen Hàn Quốc.", image: "https://cdn-icons-png.flaticon.com/512/3081/3081162.png" },
        { name: "Trà Đào Cam Sả", price: 40000, description: "Thanh mát giải nhiệt, full topping đào.", image: "https://cdn-icons-png.flaticon.com/512/931/931949.png" },
        { name: "Matcha Đá Xay", price: 45000, description: "Bột Matcha Nhật Bản xay nhuyễn.", image: "https://cdn-icons-png.flaticon.com/512/2405/2405451.png" }
    ]);
    res.send("Đã Reset dữ liệu!");
});

app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.json({ success: true, message: "Đã nhận đơn!" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại Port: ${PORT}`);
});