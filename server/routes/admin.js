const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database/init');
const { requireAdmin, validateUsername, validatePassword } = require('../middleware/auth');

// 管理员登录
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
        
        // 查找管理员
        const admin = db.prepare('SELECT * FROM users WHERE username = ? AND is_admin = 1').get(username);
        
        if (!admin) {
            return res.json({ 
                success: false, 
                message: 'Invalid credentials or not an administrator' 
            });
        }
        
        // 验证密码
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!isValidPassword) {
            return res.json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
        
        // 设置session
        req.session.userId = admin.id;
        req.session.isAdmin = 1;
        
        // 记录登录日志
        logAdminAction(admin.id, 'admin_login', null, null, 'Admin logged in');
        
        res.json({ 
            success: true, 
            message: 'Login successful',
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name
            }
        });
        
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed' 
        });
    }
});

// ===== Read-only: View a user's Conference Management data =====
// Get fee payment by user ID (admin only, read-only)
router.get('/users/:id/fee-payment', requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (Number.isNaN(userId)) {
            return res.json({ success: false, message: 'Invalid user ID' });
        }

        const payment = db.prepare('SELECT * FROM fee_payments WHERE user_id = ?').get(userId);
        return res.json({ success: true, payment: payment || null });
    } catch (error) {
        console.error('Admin get fee payment error:', error);
        return res.status(500).json({ success: false, message: 'Failed to get fee payment' });
    }
});

// Set or update fee receipt number for a user (admin only)
router.post('/users/:id/fee-receipt', requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { receiptNumber, idNumber } = req.body || {};

        if (Number.isNaN(userId)) {
            return res.json({ success: false, message: 'Invalid user ID' });
        }

        const trimmedReceipt = (receiptNumber || '').trim();
        if (!trimmedReceipt) {
            return res.json({ success: false, message: 'Receipt number is required' });
        }

        // 规范化 ID Number（允许为空/清空）
        const rawIdNumber = typeof idNumber === 'string' ? idNumber : '';
        const trimmedIdNumber = rawIdNumber.trim();
        const idNumberToSave = trimmedIdNumber || null;

        const user = db.prepare('SELECT username, name FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // 如果填写了非空 ID Number，则做唯一性校验（排除当前用户）
        if (trimmedIdNumber) {
            const existingIdNumber = db.prepare('SELECT id FROM users WHERE id_number = ? AND id != ?')
                .get(trimmedIdNumber, userId);
            if (existingIdNumber) {
                return res.json({
                    success: false,
                    message: 'This ID Number has already been registered'
                });
            }
        }

        // 在 users 表上同时维护回执单号和身份证号
        db.prepare(`
            UPDATE users
            SET receipt_number = ?, id_number = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(trimmedReceipt, idNumberToSave, userId);

        // 记录日志
        try {
            const details = `Set fee receipt number for ${user.name} (${user.username}): ${trimmedReceipt}` +
                (trimmedIdNumber ? `; ID Number: ${trimmedIdNumber}` : '');
            logAdminAction(req.session.userId, 'set_fee_receipt', userId, user.username, details);
        } catch (e) {
            console.error('Log fee receipt action error:', e);
        }

        return res.json({ success: true, message: 'Receipt number saved successfully', receiptNumber: trimmedReceipt });
    } catch (error) {
        console.error('Admin set fee receipt error:', error);
        return res.status(500).json({ success: false, message: 'Failed to save receipt number' });
    }
});

// Get abstract submission by user ID (admin only, read-only)
router.get('/users/:id/abstract', requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (Number.isNaN(userId)) {
            return res.json({ success: false, message: 'Invalid user ID' });
        }

        const submission = db.prepare('SELECT * FROM abstract_submissions WHERE user_id = ?').get(userId);
        if (submission && submission.topic !== null && submission.topic !== undefined) {
            submission.topic = Math.floor(Number(submission.topic));
        }
        return res.json({ success: true, submission: submission || null });
    } catch (error) {
        console.error('Admin get abstract error:', error);
        return res.status(500).json({ success: false, message: 'Failed to get abstract' });
    }
});

// 检查管理员权限
router.get('/check', requireAdmin, (req, res) => {
    res.json({ success: true });
});

// 获取用户（分页）
router.get('/users', requireAdmin, (req, res) => {
    try {
        // 解析分页参数
        const allowedPageSizes = [10, 20, 50, 100];
        let page = parseInt(req.query.page, 10);
        let pageSize = parseInt(req.query.pageSize, 10);
        if (Number.isNaN(page) || page < 1) page = 1;
        if (Number.isNaN(pageSize) || !allowedPageSizes.includes(pageSize)) pageSize = 10;

        const totalRow = db.prepare('SELECT COUNT(*) AS count FROM users').get();
        const total = totalRow ? totalRow.count : 0;
        const offset = (page - 1) * pageSize;

        const users = db.prepare(`
            SELECT 
                id,
                username,
                name,
                id_number,
                organization,
                is_admin,
                created_at,
                updated_at,
                receipt_number
            FROM users
            ORDER BY datetime(created_at) DESC
            LIMIT $limit OFFSET $offset
        `).all({ limit: pageSize, offset: Math.max(0, offset) });

        res.json({ 
            success: true,
            users,
            total,
            page,
            pageSize
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load users' 
        });
    }
});

// 创建用户
router.post('/users', requireAdmin, async (req, res) => {
    try {
        const { username, password, name, organization, is_admin } = req.body;
        
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
        
        // 检查用户名是否已存在
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.json({ 
                success: false, 
                message: 'Username already exists' 
            });
        }
        
        // 加密密码
        const passwordHash = await bcrypt.hash(password, 10);
        
        // 插入用户
        const stmt = db.prepare(`
            INSERT INTO users (username, password_hash, name, organization, is_admin)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(username, passwordHash, name, organization, is_admin ? 1 : 0);
        
        // 记录日志
        logAdminAction(req.session.userId, 'create_user', result.lastInsertRowid, username, 
            `Created user: ${name} (${username})`);
        
        res.json({ 
            success: true, 
            message: 'User created successfully',
            userId: result.lastInsertRowid
        });
        
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create user' 
        });
    }
});

// 更新用户
router.put('/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { username, name, organization, is_admin } = req.body;
        
        // 验证输入
        if (!username || !name || !organization) {
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
        
        // 检查用户是否存在
        const existingUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
        if (!existingUser) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // 如果用户名被修改，检查新用户名是否已被其他用户使用
        if (username !== existingUser.username) {
            const usernameExists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
            if (usernameExists) {
                return res.json({ 
                    success: false, 
                    message: 'Username already exists' 
                });
            }
        }
        
        // 更新用户
        db.prepare(`
            UPDATE users 
            SET username = ?, name = ?, organization = ?, is_admin = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(username, name, organization, is_admin ? 1 : 0, userId);
        
        // 记录日志
        logAdminAction(req.session.userId, 'update_user', userId, username, 
            `Updated user: ${name} (${username})`);
        
        res.json({ 
            success: true, 
            message: 'User updated successfully' 
        });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update user' 
        });
    }
});

// 删除用户
router.delete('/users/:id', requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        // 防止删除自己
        if (userId === req.session.userId) {
            return res.json({ 
                success: false, 
                message: 'Cannot delete your own account' 
            });
        }
        
        // 获取用户信息用于日志
        const user = db.prepare('SELECT username, name FROM users WHERE id = ?').get(userId);
        
        if (!user) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // 删除用户
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        
        // 记录日志
        logAdminAction(req.session.userId, 'delete_user', userId, user.username, 
            `Deleted user: ${user.name} (${user.username})`);
        
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete user' 
        });
    }
});

// 重置用户密码
router.post('/reset-password', requireAdmin, async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        
        // 验证输入
        if (!userId || !newPassword) {
            return res.json({ 
                success: false, 
                message: 'User ID and new password are required' 
            });
        }
        
        // 验证密码强度
        if (!validatePassword(newPassword)) {
            return res.json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }
        
        // 获取用户信息
        const user = db.prepare('SELECT username, name FROM users WHERE id = ?').get(userId);
        
        if (!user) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // 加密新密码
        const passwordHash = await bcrypt.hash(newPassword, 10);
        
        // 更新密码
        db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(passwordHash, userId);
        
        // 记录日志
        logAdminAction(req.session.userId, 'reset_password', userId, user.username, 
            `Reset password for: ${user.name} (${user.username})`);
        
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

// 获取用户统计
router.get('/stats', requireAdmin, (req, res) => {
    try {
        const stats = {
            totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
            totalAdmins: db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get().count,
            recentUsers: db.prepare(`
                SELECT COUNT(*) as count FROM users 
                WHERE created_at >= datetime('now', '-7 days')
            `).get().count
        };
        
        res.json({ 
            success: true, 
            stats 
        });
        
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get statistics' 
        });
    }
});

// 记录管理员操作日志
function logAdminAction(adminId, action, targetUserId, targetUsername, details) {
    try {
        db.prepare(`
            INSERT INTO admin_logs (admin_id, action, target_user_id, target_username, details)
            VALUES (?, ?, ?, ?, ?)
        `).run(adminId, action, targetUserId, targetUsername, details);
    } catch (error) {
        console.error('Log admin action error:', error);
    }
}

module.exports = router;
