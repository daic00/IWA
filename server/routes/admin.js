const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database/init');
const { requireAdmin, validateUsername, validatePassword } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const TOPIC_LABELS = {
    1: 'Session 1: Water Quality Security and Digital Technology',
    2: 'Session 2: Green Water Treatment and Resource Recycling',
    3: 'Session 3: Water Environment Remediation and Healthy Cities',
    4: 'Session 4: Environmental System Engineering and Risk Control',
    5: 'Session 5: Industry-Academia-Research Forum',
    6: 'Session 6: Journal Forum of Energy & Environmental Sustainability',
    7: 'Session 7: Youth Student Forum'
};

let pdfCountryListCache = null;

function loadCountriesForPdf() {
    if (pdfCountryListCache) return pdfCountryListCache;
    try {
        const filePath = path.join(__dirname, '..', '..', 'data', 'countries-simplified.json');
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        pdfCountryListCache = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Load countries for PDF failed:', e.message || e);
        pdfCountryListCache = [];
    }
    return pdfCountryListCache;
}

function resolveCountryDisplay(raw) {
    const value = raw || '';
    if (!value) return value;
    const list = loadCountriesForPdf();
    if (!Array.isArray(list) || list.length === 0) return value;
    const byCode = list.find(c => c.code === value);
    if (byCode) return byCode.name;
    const byName = list.find(c => c.name === value);
    if (byName) return byName.name;
    return value;
}

function escapeHtmlForPdf(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case '\'': return '&#39;';
            default: return ch;
        }
    });
}

function safeField(text) {
    if (text === null || text === undefined || text === '') return '-';
    return escapeHtmlForPdf(text);
}

function formatAuthorsForPdf(raw) {
    if (!raw) return '-';
    let authors = [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) authors = parsed;
    } catch (e) {
        const lines = String(raw || '').split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length) {
            authors = lines.map(line => {
                const firstChunk = line.split(',')[0] || '';
                const parts = firstChunk.split(' ').filter(Boolean);
                return { firstName: parts[0] || '', surname: parts.slice(1).join(' ') };
            });
        }
    }
    if (!authors.length) return '-';
    const joined = authors.map((a, index) => {
        const fn = (a.firstName || '').trim();
        const sn = (a.surname || '').trim();
        const full = [fn, sn].filter(Boolean).join(' ') || '-';
        return `${index + 1}) ${full}`;
    }).join('\n');
    return escapeHtmlForPdf(joined);
}

function buildConferenceManagementHtmlForPdf(user, payment, submission) {
    const headerTitle = `Conference Management - ${user.name || ''} (ID: ${user.id})`;
    const countryDisplay = resolveCountryDisplay(payment.country);
    const topicKey = submission && submission.topic !== null && submission.topic !== undefined
        ? Math.floor(Number(submission.topic))
        : null;
    const topicText = topicKey ? (TOPIC_LABELS[topicKey] || String(topicKey)) : '-';

    const abstractText = submission && submission.abstract ? escapeHtmlForPdf(submission.abstract) : '-';
    const keywordsText = submission && submission.keywords ? escapeHtmlForPdf(submission.keywords) : '-';
    const authorsText = submission ? formatAuthorsForPdf(submission.authors) : '-';

    const fileLabel = submission && submission.original_filename
        ? escapeHtmlForPdf(submission.original_filename)
        : (submission && submission.file_path ? escapeHtmlForPdf(submission.file_path) : '-');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtmlForPdf(headerTitle)}</title>
  <style>
    body {
      font-family: 'Noto Sans', 'Noto Sans CJK SC', 'Noto Sans CJK TC',
                   'Noto Sans CJK JP', 'Noto Sans CJK KR',
                   'WenQuanYi Zen Hei', 'Microsoft YaHei',
                   -apple-system, BlinkMacSystemFont, 'Segoe UI',
                   Roboto, sans-serif;
      font-size: 12px;
      color: #333;
      margin: 0;
      padding: 20px 15px;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 10px 0;
      color: #1a5490;
    }
    .section-title {
      font-size: 14px;
      margin: 18px 0 8px 0;
      color: #1a5490;
      border-bottom: 1px solid #d0d7e2;
      padding-bottom: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 6px 10px;
      margin-bottom: 8px;
    }
    .item {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 6px 8px;
      background: #f8f9fa;
    }
    .label {
      font-weight: 600;
      font-size: 11px;
      color: #555;
      margin-bottom: 2px;
    }
    .value {
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .address-wide {
      grid-column: span 2;
    }
    .small {
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>${escapeHtmlForPdf(headerTitle)}</h1>

  <div class="section-title">Fee Payments</div>
  <div class="grid">
    <div class="item"><div class="label">Paper Number</div><div class="value">${safeField(payment.paper_number)}</div></div>
    <div class="item"><div class="label">Receipt Number</div><div class="value">${safeField(user.receipt_number)}</div></div>
    <div class="item"><div class="label">Name</div><div class="value">${safeField(payment.name)}</div></div>
    <div class="item"><div class="label">Gender</div><div class="value">${safeField(payment.gender)}</div></div>
    <div class="item"><div class="label">Email</div><div class="value">${safeField(payment.email)}</div></div>
    <div class="item"><div class="label">Category</div><div class="value">${safeField(payment.participant_category)}</div></div>
    <div class="item"><div class="label">Institution</div><div class="value">${safeField(payment.institution)}</div></div>
    <div class="item"><div class="label">Country/Region</div><div class="value">${safeField(countryDisplay)}</div></div>
    <div class="item"><div class="label">State/Province</div><div class="value">${safeField(payment.state_province)}</div></div>
    <div class="item"><div class="label">City</div><div class="value">${safeField(payment.city)}</div></div>
    <div class="item address-wide"><div class="label">Address</div><div class="value">${safeField(payment.address)}</div></div>
    <div class="item"><div class="label">Zip Code</div><div class="value">${safeField(payment.zip_code)}</div></div>
    <div class="item"><div class="label">Affiliation</div><div class="value">${safeField(payment.affiliation)}</div></div>
    <div class="item"><div class="label">Mobile Phone</div><div class="value">${safeField(payment.mobile_phone)}</div></div>
    <div class="item full-width"><div class="label">Remarks</div><div class="value">${safeField(payment.remarks)}</div></div>
  </div>

  <div class="section-title">Abstract Submission</div>
  <div class="grid">
    <div class="item full-width"><div class="label">Title</div><div class="value">${safeField(submission.title)}</div></div>
    <div class="item full-width"><div class="label">Authors</div><div class="value">${authorsText}</div></div>
    <div class="item"><div class="label">Affiliation</div><div class="value">${safeField(submission.affiliation)}</div></div>
    <div class="item"><div class="label">Topic</div><div class="value">${escapeHtmlForPdf(topicText)}</div></div>
    <div class="item"><div class="label">Presentation type</div><div class="value">${safeField(submission.presentation_type)}</div></div>
    <div class="item full-width"><div class="label">Abstract</div><div class="value">${abstractText}</div></div>
    <div class="item full-width"><div class="label">Keywords</div><div class="value">${keywordsText}</div></div>
    <div class="item full-width"><div class="label">File</div><div class="value small">${fileLabel}</div></div>
  </div>
</body>
</html>`;
}

function buildConferenceManagementBatchHtmlForPdf(entries, options = {}) {
    const now = new Date();
    const title = options.title || 'Conference Management - Regular Users';
    const generatedAt = now.toISOString().replace('T', ' ').split('.')[0] + ' UTC';

    const sectionsHtml = entries.map(({ user, payment, submission }, index) => {
        const headerTitle = `${user.name || ''} (ID: ${user.id}, Username: ${user.username})`;
        const countryDisplay = resolveCountryDisplay(payment.country);
        const topicKey = submission && submission.topic !== null && submission.topic !== undefined
            ? Math.floor(Number(submission.topic))
            : null;
        const topicText = topicKey ? (TOPIC_LABELS[topicKey] || String(topicKey)) : '-';

        const abstractText = submission && submission.abstract ? escapeHtmlForPdf(submission.abstract) : '-';
        const keywordsText = submission && submission.keywords ? escapeHtmlForPdf(submission.keywords) : '-';
        const authorsText = submission ? formatAuthorsForPdf(submission.authors) : '-';

        const fileLabel = submission && submission.original_filename
            ? escapeHtmlForPdf(submission.original_filename)
            : (submission && submission.file_path ? escapeHtmlForPdf(submission.file_path) : '-');

        return `  <div class="user-section">
    <h2 class="user-title">${escapeHtmlForPdf(headerTitle)}</h2>

    <div class="section-title">Fee Payments</div>
    <div class="grid">
      <div class="item"><div class="label">Paper Number</div><div class="value">${safeField(payment.paper_number)}</div></div>
      <div class="item"><div class="label">Receipt Number</div><div class="value">${safeField(user.receipt_number)}</div></div>
      <div class="item"><div class="label">Name</div><div class="value">${safeField(payment.name)}</div></div>
      <div class="item"><div class="label">Gender</div><div class="value">${safeField(payment.gender)}</div></div>
      <div class="item"><div class="label">Email</div><div class="value">${safeField(payment.email)}</div></div>
      <div class="item"><div class="label">Category</div><div class="value">${safeField(payment.participant_category)}</div></div>
      <div class="item"><div class="label">Institution</div><div class="value">${safeField(payment.institution)}</div></div>
      <div class="item"><div class="label">Country/Region</div><div class="value">${safeField(countryDisplay)}</div></div>
      <div class="item"><div class="label">State/Province</div><div class="value">${safeField(payment.state_province)}</div></div>
      <div class="item"><div class="label">City</div><div class="value">${safeField(payment.city)}</div></div>
      <div class="item address-wide"><div class="label">Address</div><div class="value">${safeField(payment.address)}</div></div>
      <div class="item"><div class="label">Zip Code</div><div class="value">${safeField(payment.zip_code)}</div></div>
      <div class="item"><div class="label">Affiliation</div><div class="value">${safeField(payment.affiliation)}</div></div>
      <div class="item"><div class="label">Mobile Phone</div><div class="value">${safeField(payment.mobile_phone)}</div></div>
      <div class="item full-width"><div class="label">Remarks</div><div class="value">${safeField(payment.remarks)}</div></div>
    </div>

    <div class="section-title">Abstract Submission</div>
    <div class="grid">
      <div class="item full-width"><div class="label">Title</div><div class="value">${safeField(submission.title)}</div></div>
      <div class="item full-width"><div class="label">Authors</div><div class="value">${authorsText}</div></div>
      <div class="item"><div class="label">Affiliation</div><div class="value">${safeField(submission.affiliation)}</div></div>
      <div class="item"><div class="label">Topic</div><div class="value">${escapeHtmlForPdf(topicText)}</div></div>
      <div class="item"><div class="label">Presentation type</div><div class="value">${safeField(submission.presentation_type)}</div></div>
      <div class="item full-width"><div class="label">Abstract</div><div class="value">${abstractText}</div></div>
      <div class="item full-width"><div class="label">Keywords</div><div class="value">${keywordsText}</div></div>
      <div class="item full-width"><div class="label">File</div><div class="value small">${fileLabel}</div></div>
    </div>
  </div>`;
    }).join('\n\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtmlForPdf(title)}</title>
  <style>
    body {
      font-family: 'Noto Sans', 'Noto Sans CJK SC', 'Noto Sans CJK TC',
                   'Noto Sans CJK JP', 'Noto Sans CJK KR',
                   'WenQuanYi Zen Hei', 'Microsoft YaHei',
                   -apple-system, BlinkMacSystemFont, 'Segoe UI',
                   Roboto, sans-serif;
      font-size: 12px;
      color: #333;
      margin: 0;
      padding: 20px 15px;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 6px 0;
      color: #1a5490;
    }
    h2.user-title {
      font-size: 15px;
      margin: 0 0 6px 0;
      color: #333;
    }
    .meta {
      font-size: 11px;
      color: #666;
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 14px;
      margin: 12px 0 6px 0;
      color: #1a5490;
      border-bottom: 1px solid #d0d7e2;
      padding-bottom: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 6px 10px;
      margin-bottom: 8px;
    }
    .item {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 6px 8px;
      background: #f8f9fa;
    }
    .label {
      font-weight: 600;
      font-size: 11px;
      color: #555;
      margin-bottom: 2px;
    }
    .value {
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .address-wide {
      grid-column: span 2;
    }
    .small {
      font-size: 11px;
      color: #666;
    }
    .user-section {
      page-break-after: always;
      margin-bottom: 12mm;
    }
    .user-section:last-child {
      page-break-after: auto;
    }
  </style>
</head>
<body>
  <h1>${escapeHtmlForPdf(title)}</h1>
  <div class="meta">Generated at: ${escapeHtmlForPdf(generatedAt)} · Users: ${entries.length}</div>

${sectionsHtml}

</body>
</html>`;
}

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

// Export Conference Management data for all regular (non-admin) users as a single PDF
router.get('/users/cm-pdf-batch', requireAdmin, async (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, username, name, organization, receipt_number, is_admin
            FROM users
            WHERE is_admin = 0
            AND username != 'test'
            ORDER BY datetime(created_at) ASC
        `).all();

        if (!users || users.length === 0) {
            return res.status(400).json({ success: false, message: 'No regular users to export.' });
        }

        const entries = users.map(user => {
            const payment = db.prepare('SELECT * FROM fee_payments WHERE user_id = ?').get(user.id) || {};
            const submission = db.prepare('SELECT * FROM abstract_submissions WHERE user_id = ?').get(user.id) || {};
            if (submission && submission.topic !== null && submission.topic !== undefined) {
                submission.topic = Math.floor(Number(submission.topic));
            }
            return { user, payment, submission };
        });

        const html = buildConferenceManagementBatchHtmlForPdf(entries, { title: 'Conference Management' });

        let browser;
        try {
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfData = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
            });

            const pdfBuffer = Buffer.isBuffer(pdfData) ? pdfData : Buffer.from(pdfData);

            const fileName = 'Conference_All_Regular_Users.pdf';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', String(pdfBuffer.length));
            return res.end(pdfBuffer);
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (closeErr) {
                    console.error('Close Puppeteer browser error (batch):', closeErr);
                }
            }
        }
    } catch (error) {
        console.error('Admin export CM batch PDF error:', error);
        return res.status(500).json({ success: false, message: 'Failed to export batch PDF' });
    }
});

// Export a single user's Conference Management data as PDF
router.get('/users/:id/cm-pdf', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (Number.isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const user = db.prepare(`
            SELECT id, username, name, organization, receipt_number
            FROM users
            WHERE id = ?
        `).get(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const payment = db.prepare('SELECT * FROM fee_payments WHERE user_id = ?').get(userId) || {};
        const submission = db.prepare('SELECT * FROM abstract_submissions WHERE user_id = ?').get(userId) || {};
        if (submission && submission.topic !== null && submission.topic !== undefined) {
            submission.topic = Math.floor(Number(submission.topic));
        }

        const html = buildConferenceManagementHtmlForPdf(user, payment, submission);

        let browser;
        try {
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfData = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
            });

            // Puppeteer 在部分 Node 版本下可能返回 Uint8Array，这里统一转成 Buffer，避免被 Express 当作普通对象序列化为 JSON。
            const pdfBuffer = Buffer.isBuffer(pdfData) ? pdfData : Buffer.from(pdfData);

            const rawName = user.name || `User_${user.id}`;
            const safeName = String(rawName)
                .replace(/[^a-zA-Z0-9-_\s]/g, '')
                .replace(/\s+/g, '_') || `User_${user.id}`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Conference_${safeName}.pdf"`);
            res.setHeader('Content-Length', String(pdfBuffer.length));
            return res.end(pdfBuffer);
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (closeErr) {
                    console.error('Close Puppeteer browser error:', closeErr);
                }
            }
        }
    } catch (error) {
        console.error('Admin export CM PDF error:', error);
        return res.status(500).json({ success: false, message: 'Failed to export PDF' });
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

        const deleteUserWithRelations = db.transaction((uid) => {
            db.prepare('DELETE FROM fee_payments WHERE user_id = ?').run(uid);
            db.prepare('DELETE FROM abstract_submissions WHERE user_id = ?').run(uid);
            db.prepare('DELETE FROM admin_logs WHERE admin_id = ? OR target_user_id = ?').run(uid, uid);
            db.prepare('DELETE FROM users WHERE id = ?').run(uid);
        });
        
        deleteUserWithRelations(userId);
        
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
