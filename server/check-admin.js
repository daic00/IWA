// 检查管理员账号
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, 'database', 'conference.db');

try {
    const db = new Database(dbPath);
    
    console.log('\n=== 检查数据库 ===');
    console.log('数据库路径:', dbPath);
    
    // 查询所有管理员
    const admins = db.prepare('SELECT id, username, name, is_admin FROM users WHERE is_admin = 1').all();
    
    console.log('\n管理员账号列表:');
    if (admins.length === 0) {
        console.log('❌ 没有找到管理员账号！');
        console.log('\n请运行: npm run init-db');
    } else {
        admins.forEach(admin => {
            console.log(`✅ ID: ${admin.id}, Username: ${admin.username}, Name: ${admin.name}`);
        });
    }
    
    // 查询所有用户
    const allUsers = db.prepare('SELECT id, username, name, is_admin FROM users').all();
    console.log(`\n总用户数: ${allUsers.length}`);
    
    db.close();
    
} catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.message.includes('no such table')) {
        console.log('\n数据库表不存在，请运行: npm run init-db');
    } else if (error.message.includes('ENOENT')) {
        console.log('\n数据库文件不存在，请运行: npm run init-db');
    }
}
