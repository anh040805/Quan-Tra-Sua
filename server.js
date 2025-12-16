// File: server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Phục vụ file giao diện

// 1. Kết nối MongoDB
// Lưu ý: Nếu máy bạn chưa cài MongoDB Server, bước này có thể báo lỗi sau.
mongoose.connect('mongodb+srv://admin:trasua123@trasua.hycfxqc.mongodb.net/?appName=Trasua')
    .then(() => console.log('✅ Đã kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối MongoDB (Bạn đã cài MongoDB Server chưa?):', err));

// 2. Tạo khuôn mẫu dữ liệu
const ProductSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    image: String
});
const Product = mongoose.model('Product', ProductSchema);

// 3. API tạo dữ liệu mẫu (Chạy 1 lần)
app.get('/api/init', async (req, res) => {
    try {
        await Product.deleteMany({}); 
        await Product.insertMany([
            { name: "Trà Sữa Trân Châu Đường Đen", price: 35000, description: "Vị trà đậm đà, đường đen Hàn Quốc.", image: "https://cdn-icons-png.flaticon.com/512/3081/3081162.png" },
            { name: "Trà Đào Cam Sả", price: 40000, description: "Thanh mát giải nhiệt, full topping đào.", image: "https://cdn-icons-png.flaticon.com/512/931/931949.png" },
            { name: "Matcha Đá Xay", price: 45000, description: "Bột Matcha Nhật Bản xay nhuyễn.", image: "https://cdn-icons-png.flaticon.com/512/2405/2405451.png" }
        ]);
        res.send("Đã tạo dữ liệu mẫu thành công! Hãy quay lại trang chủ.");
    } catch (e) {
        res.status(500).send("Lỗi tạo dữ liệu: " + e.message);
    }
});

// 4. API lấy danh sách món
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// 5. Chạy Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại Port: ${PORT}`);
});