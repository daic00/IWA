const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// 导入路由
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const conferenceRoutes = require('./routes/conference');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'iwa-conference-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24小时
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// 静态文件服务（服务前端页面）
app.use(express.static(path.join(__dirname, '..')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/conference', conferenceRoutes);

// 根路径重定向
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404处理
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
            success: false, 
            message: 'API endpoint not found' 
        });
    } else {
        res.status(404).sendFile(path.join(__dirname, '..', 'index.html'));
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log('\n🚀 IWA Conference Server Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Database: ${process.env.DB_PATH || './database/conference.db'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📚 Available Endpoints:');
    console.log('   Frontend:');
    console.log('   - http://localhost:' + PORT + ' (Homepage)');
    console.log('   - http://localhost:' + PORT + '/login.html (User Login)');
    console.log('   - http://localhost:' + PORT + '/register.html (User Registration)');
    console.log('   - http://localhost:' + PORT + '/admin/login.html (Admin Login)');
    console.log('\n   API:');
    console.log('   - POST /api/auth/register (User Registration)');
    console.log('   - POST /api/auth/login (User Login)');
    console.log('   - GET  /api/auth/me (Get Current User)');
    console.log('   - POST /api/auth/change-password (Change Password - Logged In)');
    console.log('   - POST /api/auth/reset-password (Reset Password - Not Logged In)');
    console.log('   - POST /api/auth/logout (Logout)');
    console.log('\n   Admin API:');
    console.log('   - POST /api/admin/login (Admin Login)');
    console.log('   - GET  /api/admin/users (Get All Users)');
    console.log('   - POST /api/admin/users (Create User)');
    console.log('   - PUT  /api/admin/users/:id (Update User)');
    console.log('   - DELETE /api/admin/users/:id (Delete User)');
    console.log('   - POST /api/admin/reset-password (Reset User Password)');
    console.log('\n🔑 Default Admin Account:');
    console.log('   Username: ' + (process.env.ADMIN_USERNAME || 'admin'));
    console.log('   Password: ' + (process.env.ADMIN_PASSWORD || 'Admin@2025'));
    console.log('   ⚠️  Please change the password after first login!');
    console.log('\n✅ Server is ready!\n');
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('\n📴 Shutting down server...');
    process.exit(0);
});
