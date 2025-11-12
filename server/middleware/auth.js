// 检查用户是否已登录
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ 
            success: false, 
            message: 'Please login to continue' 
        });
    }
    next();
}

// 检查用户是否是管理员
function requireAdmin(req, res, next) {
    if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    next();
}

// 验证用户名格式（3-20个字符，字母数字下划线）
function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

// 验证密码强度（至少6个字符）
function validatePassword(password) {
    return password && password.length >= 6;
}

module.exports = {
    requireAuth,
    requireAdmin,
    validateUsername,
    validatePassword
};
