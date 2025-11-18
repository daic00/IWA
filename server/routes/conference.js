const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF and Word documents are allowed'));
        }
    }
});

// 提交费用支付信息
router.post('/fee-payment', requireAuth, async (req, res) => {
    try {
        const {
            paperNumber, name, gender, email, participantCategory,
            iwaMemberInfo, country, institution, stateProvince, city,
            address, zipCode, affiliation, workPhone, mobilePhone, remarks
        } = req.body;
        
        // 验证必填字段
        if (!name || !email) {
            return res.json({
                success: false,
                message: 'Name and email are required'
            });
        }
        
        const userId = req.session.userId;
        
        // 检查是否已存在
        const existing = db.prepare('SELECT id FROM fee_payments WHERE user_id = ?').get(userId);
        
        if (existing) {
            // 更新现有记录
            db.prepare(`
                UPDATE fee_payments SET
                    paper_number = ?, name = ?, gender = ?, email = ?,
                    participant_category = ?, iwa_member_info = ?, country = ?,
                    institution = ?, state_province = ?, city = ?, address = ?,
                    zip_code = ?, affiliation = ?, work_phone = ?, mobile_phone = ?,
                    remarks = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `).run(
                paperNumber, name, gender, email, participantCategory,
                iwaMemberInfo, country, institution, stateProvince, city,
                address, zipCode, affiliation, workPhone, mobilePhone,
                remarks, userId
            );
            
            res.json({
                success: true,
                message: 'Fee payment information updated successfully',
                id: existing.id
            });
        } else {
            // 插入新记录
            const result = db.prepare(`
                INSERT INTO fee_payments (
                    user_id, paper_number, name, gender, email, participant_category,
                    iwa_member_info, country, institution, state_province, city,
                    address, zip_code, affiliation, work_phone, mobile_phone, remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId, paperNumber, name, gender, email, participantCategory,
                iwaMemberInfo, country, institution, stateProvince, city,
                address, zipCode, affiliation, workPhone, mobilePhone, remarks
            );
            
            res.json({
                success: true,
                message: 'Fee payment information submitted successfully',
                id: result.lastInsertRowid
            });
        }
        
    } catch (error) {
        console.error('Submit fee payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit fee payment information'
        });
    }
});

// 获取费用支付信息
router.get('/fee-payment', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const payment = db.prepare('SELECT * FROM fee_payments WHERE user_id = ?').get(userId);
        
        res.json({
            success: true,
            payment: payment || null
        });
        
    } catch (error) {
        console.error('Get fee payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get fee payment information'
        });
    }
});

// 文件名编码修复中间件（在 multer 之后执行）
function fixFilenameEncoding(req, res, next) {
    if (req.file && req.file.originalname) {
        try {
            let filename = req.file.originalname;
            
            // 关键修复：multer 将 UTF-8 文件名错误地解释为 latin1
            // 需要将 latin1 字节重新解释为 UTF-8
            const fixed = Buffer.from(filename, 'latin1').toString('utf8');
            
            // 验证修复后的文件名是否更合理
            // 检查是否包含更多有效的中文字符
            const originalChineseCount = (filename.match(/[\u4e00-\u9fff]/g) || []).length;
            const fixedChineseCount = (fixed.match(/[\u4e00-\u9fff]/g) || []).length;
            
            // 如果修复后的版本包含更多中文，或者原版完全没有中文但修复后有，使用修复后的版本
            if (fixedChineseCount > originalChineseCount || (originalChineseCount === 0 && fixedChineseCount > 0)) {
                req.file.originalname = fixed;
                console.log('Fixed filename encoding:', filename, '->', fixed);
            }
        } catch (error) {
            console.warn('Filename encoding fix error:', error.message);
        }
    }
    next();
}

// 提交摘要
router.post('/abstract', requireAuth, upload.single('file'), fixFilenameEncoding, async (req, res) => {
    try {
        const { title, authors, affiliation, topic, abstract, keywords } = req.body;
        
        // 验证必填字段
        if (!title || !authors || !affiliation || !topic) {
            return res.json({
                success: false,
                message: 'Title, authors, affiliation, and topic are required'
            });
        }
        
        // 确保 topic 是有效的数字（1-7）
        const topicNumber = parseInt(topic, 10);
        if (isNaN(topicNumber) || topicNumber < 1 || topicNumber > 7) {
            return res.json({
                success: false,
                message: 'Topic must be a number between 1 and 7'
            });
        }
        
        const userId = req.session.userId;
        const filePath = req.file ? req.file.filename : null;
        // 文件名已经在中间件中修复，直接使用
        const originalFilename = req.file ? req.file.originalname : null;
        
        // 检查是否已存在
        const existing = db.prepare('SELECT id, file_path FROM abstract_submissions WHERE user_id = ?').get(userId);
        
        if (existing) {
            // 如果上传了新文件且存在旧文件，删除旧文件
            if (filePath && existing.file_path && existing.file_path !== filePath) {
                try {
                    const oldFilePath = path.join(__dirname, '../uploads', existing.file_path);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                        console.log('Deleted old file:', existing.file_path);
                    }
                } catch (error) {
                    // 删除旧文件失败不影响新文件保存，只记录警告
                    console.warn('Failed to delete old file:', existing.file_path, error.message);
                }
            }
            
            // 更新现有记录
            db.prepare(`
                UPDATE abstract_submissions SET
                    title = ?, authors = ?, affiliation = ?, topic = ?,
                    abstract = ?, keywords = ?, file_path = COALESCE(?, file_path),
                    original_filename = COALESCE(?, original_filename),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `).run(title, authors, affiliation, topicNumber, abstract, keywords, filePath, originalFilename, userId);
            
            res.json({
                success: true,
                message: 'Abstract updated successfully',
                id: existing.id
            });
        } else {
            // 插入新记录
            const result = db.prepare(`
                INSERT INTO abstract_submissions (
                    user_id, title, authors, affiliation, topic, abstract, keywords, file_path, original_filename
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(userId, title, authors, affiliation, topicNumber, abstract, keywords, filePath, originalFilename);
            
            res.json({
                success: true,
                message: 'Abstract submitted successfully',
                id: result.lastInsertRowid
            });
        }
        
    } catch (error) {
        console.error('Submit abstract error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit abstract'
        });
    }
});

// 获取摘要信息
router.get('/abstract', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const submission = db.prepare('SELECT * FROM abstract_submissions WHERE user_id = ?').get(userId);
        
        if (submission) {
            // 确保 topic 是整数类型（SQLite INTEGER 应该返回整数，但保险起见进行转换）
            if (submission.topic !== null && submission.topic !== undefined) {
                submission.topic = Math.floor(Number(submission.topic));
            }
        }
        
        res.json({
            success: true,
            submission: submission || null
        });
        
    } catch (error) {
        console.error('Get abstract error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get abstract information'
        });
    }
});

module.exports = router;
