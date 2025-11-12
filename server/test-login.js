// 测试管理员登录
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, 'database', 'conference.db');

async function testLogin() {
    try {
        const db = new Database(dbPath);
        
        const username = 'admin';
        const password = 'Admin@2025';
        
        console.log('\n=== 测试管理员登录 ===');
        console.log('测试用户名:', username);
        console.log('测试密码:', password);
        
        // 查找管理员
        const admin = db.prepare('SELECT * FROM users WHERE username = ? AND is_admin = 1').get(username);
        
        if (!admin) {
            console.log('\n❌ 找不到管理员账号！');
            db.close();
            return;
        }
        
        console.log('\n✅ 找到管理员账号:');
        console.log('   ID:', admin.id);
        console.log('   Username:', admin.username);
        console.log('   Name:', admin.name);
        console.log('   Password Hash:', admin.password_hash.substring(0, 30) + '...');
        
        // 验证密码
        console.log('\n正在验证密码...');
        const isValid = await bcrypt.compare(password, admin.password_hash);
        
        if (isValid) {
            console.log('✅ 密码验证成功！');
            console.log('\n登录信息正确:');
            console.log('   Username: admin');
            console.log('   Password: Admin@2025');
        } else {
            console.log('❌ 密码验证失败！');
            console.log('\n可能的原因:');
            console.log('1. 数据库中的密码哈希不正确');
            console.log('2. 密码可能不是 Admin@2025');
            console.log('\n建议重新初始化数据库: npm run init-db');
        }
        
        db.close();
        
    } catch (error) {
        console.error('❌ 测试出错:', error.message);
    }
}

testLogin();
