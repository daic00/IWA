const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database/init');
const { requireAuth, validateUsername, validatePassword } = require('../middleware/auth');

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, password, name, organization } = req.body;
        
        // 验证输入
        if (!username || !password || !name || !organization) {
            return res.json({ 
                success: false, 
                message: 'Please fill in all required fields' 
            });
        }
        
        // 验证用户名格式
        if (!validateUsername(username)) {
            return res.json({ 
                success: false, 
                message: 'Username must be 3-20 characters (letters, numbers, underscore)' 
            });
        }
        
        // 验证密码强度
        if (!validatePassword(password)) {
            return res.json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }
        
        // 检查用户名是否已存在（唯一性校验）
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.json({ 
                success: false, 
                message: 'This username is already taken' 
            });
        }
        
        // 加密密码
        const passwordHash = await bcrypt.hash(password, 10);
        
        // 插入用户
        const stmt = db.prepare(`
            INSERT INTO users (username, password_hash, name, organization, is_admin)
            VALUES (?, ?, ?, ?, 0)
        `);
        
        const result = stmt.run(username, passwordHash, name, organization);
        
        // 自动登录
        req.session.userId = result.lastInsertRowid;
        req.session.isAdmin = 0;
        
        res.json({ 
            success: true, 
            message: 'Registration successful',
            user: {
                id: result.lastInsertRowid,
                username,
                name,
                organization
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Registration failed. Please try again.' 
        });
    }
});

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 验证输入
        if (!username || !password) {
            return res.json({ 
                success: false, 
                message: 'Please enter username and password' 
            });
        }
        
        // 查找用户
        const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_admin = 0').get(username);
        
        if (!user) {
            return res.json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
        
        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
        
        // 设置session
        req.session.userId = user.id;
        req.session.isAdmin = user.is_admin;
        
        res.json({ 
            success: true, 
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                organization: user.organization
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed. Please try again.' 
        });
    }
});

// 获取当前用户信息
router.get('/me', requireAuth, (req, res) => {
    try {
        const user = db.prepare('SELECT id, username, name, organization, is_admin, created_at FROM users WHERE id = ?')
            .get(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                organization: user.organization,
                is_admin: user.is_admin,
                created_at: user.created_at
            }
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get user info' 
        });
    }
});

// 修改密码（需要旧密码）
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // 验证输入
        if (!currentPassword || !newPassword) {
            return res.json({ 
                success: false, 
                message: 'Please provide both current and new password' 
            });
        }
        
        // 验证新密码强度
        if (!validatePassword(newPassword)) {
            return res.json({ 
                success: false, 
                message: 'New password must be at least 6 characters long' 
            });
        }
        
        // 获取用户当前密码
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.userId);
        
        if (!user) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // 验证当前密码
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isValidPassword) {
            return res.json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }
        
        // 加密新密码
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // 更新密码
        db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newPasswordHash, req.session.userId);
        
        res.json({ 
            success: true, 
            message: 'Password changed successfully' 
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to change password' 
        });
    }
});

// 重置密码（无需登录，但需要提供用户名和当前密码）
router.post('/reset-password', async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        
        // 验证输入
        if (!username || !currentPassword || !newPassword) {
            return res.json({ 
                success: false, 
                message: 'Please provide username, current password and new password' 
            });
        }
        
        // 验证新密码强度
        if (!validatePassword(newPassword)) {
            return res.json({ 
                success: false, 
                message: 'New password must be at least 6 characters long' 
            });
        }
        
        // 查找用户
        const user = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username);
        
        if (!user) {
            return res.json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
        
        // 验证当前密码
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isValidPassword) {
            return res.json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
        
        // 加密新密码
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // 更新密码
        db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newPasswordHash, user.id);
        
        res.json({ 
            success: true, 
            message: 'Password reset successfully' 
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to reset password' 
        });
    }
});

// 退出登录
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Logout failed' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Logout successful' 
        });
    });
});

module.exports = router;
