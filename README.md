# IWA SUWS 2025 Conference Management System

国际水协会（IWA）可持续城市水系统会议管理系统

## 功能特性

### 用户功能
- 用户注册与登录
- 会议费用支付管理
- 论文摘要提交
- 个人信息管理
- 密码修改与重置

### 管理员功能
- 用户管理（增删改查）
- 用户搜索
- 密码重置
- 用户统计
- 操作日志记录

## 快速开始

### 安装依赖
```powershell
cd server
npm install
```

### 初始化数据库
```powershell
npm run init-db
```

### 启动服务器
```powershell
npm start
```

### 访问系统
- 首页: http://localhost:3000
- 用户登录: http://localhost:3000/login.html
- 用户注册: http://localhost:3000/register.html
- 管理员登录: http://localhost:3000/admin/login.html

### 默认管理员账号
```
用户名: admin
密码: Admin@2025
```
首次登录后请立即修改密码！

## 文档

- [快速开始指南](QUICKSTART.md) - 详细的3步部署指南
- [会议功能说明](CONFERENCE_FEATURES.md) - 费用支付和摘要提交功能
- [后端API文档](server/README.md) - API文档和数据库设计

## 技术栈

### 前端
- HTML5, CSS3, JavaScript (原生)
- Font Awesome 6.0 图标库
- 响应式设计

### 后端
- Node.js + Express 4.18
- SQLite (better-sqlite3)
- bcrypt 密码加密
- express-session 会话管理
- multer 文件上传

### 数据库
- SQLite 3
- 用户表、费用支付表、摘要提交表
- 管理员操作日志

## 项目结构
```
IWA/
├── server/              # 后端服务
│   ├── server.js       # 主服务器
│   ├── database/       # 数据库相关
│   ├── routes/         # API路由
│   ├── middleware/     # 中间件
│   └── uploads/        # 文件上传目录
├── admin/              # 管理员页面
├── css/                # 样式文件
├── js/                 # JavaScript文件
├── images/             # 图片资源
└── *.html              # 前端页面
```

## 安全特性

- 密码加密存储（bcrypt）
- 用户名唯一性验证
- Session 会话管理
- 防止 SQL 注入（参数化查询）
- 管理员操作日志
- 密码强度验证（最少6字符）
- 文件上传类型和大小限制

## 许可证

MIT License

## 联系方式

会议官方邮箱: suws2025@tongji.edu.cn
