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
        id_number TEXT,
        organization TEXT NOT NULL,
        receipt_number TEXT,
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
        institution TEXT,
        state_province TEXT,
        city TEXT,
        address TEXT,
        zip_code TEXT,
        affiliation TEXT,
        work_phone TEXT,
        mobile_phone TEXT,
        remarks TEXT,
        receipt_number TEXT,
        payment_status TEXT DEFAULT 'NotPaid',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// 为已存在的 fee_payments 表添加 receipt_number / payment_status 字段（如果不存在）
try {
    const feeInfo = db.prepare("PRAGMA table_info(fee_payments)").all();
    const hasReceiptNumber = feeInfo.some(col => col.name === 'receipt_number');
    const hasPaymentStatus = feeInfo.some(col => col.name === 'payment_status');
    if (!hasReceiptNumber) {
        db.exec(`
            ALTER TABLE fee_payments
            ADD COLUMN receipt_number TEXT;
        `);
        console.log('✅ Added receipt_number column to fee_payments table');
    }
    if (!hasPaymentStatus) {
        db.exec(`
            ALTER TABLE fee_payments
            ADD COLUMN payment_status TEXT DEFAULT 'NotPaid';
        `);
        console.log('✅ Added payment_status column to fee_payments table');
    }
} catch (error) {
    console.warn('Warning: Could not add columns to fee_payments:', error.message);
}

db.exec(`
    CREATE TABLE IF NOT EXISTS abstract_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        authors TEXT NOT NULL,
        affiliation TEXT NOT NULL,
        topic INTEGER NOT NULL,
        presentation_type TEXT,
        abstract TEXT NOT NULL,
        keywords TEXT NOT NULL,
        file_path TEXT,
        original_filename TEXT,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// 为已存在的表添加 original_filename 字段（如果不存在）
try {
    // 先检查列是否存在
    const tableInfo = db.prepare("PRAGMA table_info(abstract_submissions)").all();
    const hasOriginalFilename = tableInfo.some(col => col.name === 'original_filename');
    const hasTheme = tableInfo.some(col => col.name === 'theme');
    const hasTopic = tableInfo.some(col => col.name === 'topic');
    const hasPresentationType = tableInfo.some(col => col.name === 'presentation_type');
    
    if (!hasOriginalFilename) {
        db.exec(`
            ALTER TABLE abstract_submissions 
            ADD COLUMN original_filename TEXT;
        `);
        console.log('✅ Added original_filename column to abstract_submissions table');
    }
    
    // 迁移 theme 到 topic（如果存在旧字段）
    if (hasTheme && !hasTopic) {
        // 先添加 topic 字段为 INTEGER（先可空，因为可能有旧数据）
        db.exec(`
            ALTER TABLE abstract_submissions 
            ADD COLUMN topic INTEGER;
        `);
        // 从 theme 字段提取数字并迁移到 topic
        // 尝试从 "Session X: ..." 格式提取数字
        try {
            db.exec(`
                UPDATE abstract_submissions 
                SET topic = CAST(SUBSTR(theme, 9, 1) AS INTEGER)
                WHERE theme LIKE 'Session %:%' 
                  AND CAST(SUBSTR(theme, 9, 1) AS INTEGER) BETWEEN 1 AND 7;
            `);
        } catch (e) {
            // 如果提取失败，尝试其他方式
            console.warn('Could not extract topic from theme:', e.message);
        }
        console.log('✅ Migrated theme to topic column in abstract_submissions table');
    } else if (!hasTopic && !hasTheme) {
        // 如果既没有 theme 也没有 topic，添加 topic（可空，新记录时通过应用层保证必填）
        db.exec(`
            ALTER TABLE abstract_submissions 
            ADD COLUMN topic INTEGER;
        `);
        console.log('✅ Added topic column to abstract_submissions table');
    }
    
    if (!hasPresentationType) {
        db.exec(`
            ALTER TABLE abstract_submissions 
            ADD COLUMN presentation_type TEXT;
        `);
        console.log('✅ Added presentation_type column to abstract_submissions table');
    }
} catch (error) {
    console.warn('Warning: Could not add column:', error.message);
}

// 创建索引
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_fee_payments_user_id ON fee_payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_abstract_submissions_user_id ON abstract_submissions(user_id);
`);

// 为已存在的用户表添加 id_number / receipt_number 字段（如果不存在）
try {
    const usersInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasIdNumber = usersInfo.some(col => col.name === 'id_number');
    const hasUserReceipt = usersInfo.some(col => col.name === 'receipt_number');
    if (!hasIdNumber) {
        db.exec(`
            ALTER TABLE users
            ADD COLUMN id_number TEXT;
        `);
        console.log('✅ Added id_number column to users table');
    }
    if (!hasUserReceipt) {
        db.exec(`
            ALTER TABLE users
            ADD COLUMN receipt_number TEXT;
        `);
        console.log('✅ Added receipt_number column to users table');
    }
} catch (error) {
    console.warn('Warning: Could not add extra columns to users table:', error.message);
}

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
