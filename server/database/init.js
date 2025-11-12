const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

// 数据库文件路径
const dbPath = path.join(__dirname, 'conference.db');

// 创建或打开数据库
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 创建用户表
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        organization TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// 创建管理员操作日志表
db.exec(`
    CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        target_user_id INTEGER,
        target_username TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
    );
`);

// 创建会议管理相关表
db.exec(`
    CREATE TABLE IF NOT EXISTS fee_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        paper_number TEXT,
        name TEXT NOT NULL,
        gender TEXT,
        email TEXT NOT NULL,
        participant_category TEXT,
        iwa_member_info TEXT,
        country TEXT,
        income_level TEXT,
        state_province TEXT,
        city TEXT,
        address TEXT,
        zip_code TEXT,
        affiliation TEXT,
        work_phone TEXT,
        mobile_phone TEXT,
        remarks TEXT,
        payment_status TEXT DEFAULT 'NotPaid',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS abstract_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        authors TEXT NOT NULL,
        affiliation TEXT NOT NULL,
        abstract TEXT NOT NULL,
        keywords TEXT NOT NULL,
        file_path TEXT,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// 创建索引
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_fee_payments_user_id ON fee_payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_abstract_submissions_user_id ON abstract_submissions(user_id);
`);

// 初始化默认管理员账号
async function initializeAdmin() {
    try {
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2025';
        const adminName = process.env.ADMIN_NAME || 'Administrator';
        const adminOrg = process.env.ADMIN_ORG || 'IWA Conference';
        
        // 检查管理员是否已存在
        const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);
        
        if (!existingAdmin) {
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            
            const stmt = db.prepare(`
                INSERT INTO users (username, password_hash, name, organization, is_admin)
                VALUES (?, ?, ?, ?, 1)
            `);
            
            stmt.run(adminUsername, passwordHash, adminName, adminOrg);
            
            console.log('✅ Default admin account created:');
            console.log(`   Username: ${adminUsername}`);
            console.log(`   Password: ${adminPassword}`);
            console.log('   ⚠️  Please change the password after first login!');
        } else {
            console.log('✅ Admin account already exists');
        }
    } catch (error) {
        console.error('❌ Error creating admin account:', error);
    }
}

// 数据库信息
function showDatabaseInfo() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get().count;
    
    console.log('\n📊 Database Statistics:');
    console.log(`   Total Users: ${userCount}`);
    console.log(`   Administrators: ${adminCount}`);
    console.log(`   Regular Users: ${userCount - adminCount}`);
}

// 如果直接运行此文件，则初始化数据库
if (require.main === module) {
    console.log('🔧 Initializing database...');
    console.log(`📁 Database path: ${dbPath}`);
    
    initializeAdmin().then(() => {
        showDatabaseInfo();
        console.log('\n✅ Database initialization complete!');
        db.close();
    });
} else {
    // 如果作为模块导入，自动初始化管理员
    initializeAdmin();
}

module.exports = db;
