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
            iwaMemberInfo, country, incomeLevel, stateProvince, city,
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
                    income_level = ?, state_province = ?, city = ?, address = ?,
                    zip_code = ?, affiliation = ?, work_phone = ?, mobile_phone = ?,
                    remarks = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `).run(
                paperNumber, name, gender, email, participantCategory,
                iwaMemberInfo, country, incomeLevel, stateProvince, city,
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
                    iwa_member_info, country, income_level, state_province, city,
                    address, zip_code, affiliation, work_phone, mobile_phone, remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId, paperNumber, name, gender, email, participantCategory,
                iwaMemberInfo, country, incomeLevel, stateProvince, city,
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

// 提交摘要
router.post('/abstract', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { title, authors, affiliation, abstract, keywords } = req.body;
        
        // 验证必填字段
        if (!title || !authors || !affiliation || !abstract || !keywords) {
            return res.json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        const userId = req.session.userId;
        const filePath = req.file ? req.file.filename : null;
        
        // 检查是否已存在
        const existing = db.prepare('SELECT id FROM abstract_submissions WHERE user_id = ?').get(userId);
        
        if (existing) {
            // 更新现有记录
            db.prepare(`
                UPDATE abstract_submissions SET
                    title = ?, authors = ?, affiliation = ?, abstract = ?,
                    keywords = ?, file_path = COALESCE(?, file_path),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `).run(title, authors, affiliation, abstract, keywords, filePath, userId);
            
            res.json({
                success: true,
                message: 'Abstract updated successfully',
                id: existing.id
            });
        } else {
            // 插入新记录
            const result = db.prepare(`
                INSERT INTO abstract_submissions (
                    user_id, title, authors, affiliation, abstract, keywords, file_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(userId, title, authors, affiliation, abstract, keywords, filePath);
            
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
