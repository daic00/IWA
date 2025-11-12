# IWA SUWS 2025 Conference - Backend Server

完整的用户认证和管理系统后端服务。

## 功能特性

### 用户功能
- ✅ 用户注册（邮箱唯一性校验）
- ✅ 用户登录
- ✅ 个人中心
- ✅ 修改密码（需要旧密码验证）
- ✅ 退出登录

### 管理员功能
- ✅ 管理员登录
- ✅ 用户列表查看
- ✅ 搜索用户
- ✅ 添加用户
- ✅ 编辑用户信息
- ✅ 删除用户
- ✅ 重置用户密码
- ✅ 用户统计
- ✅ 操作日志记录

## 技术栈

- **Node.js** - JavaScript运行环境
- **Express** - Web框架
- **SQLite** - 轻量级数据库（better-sqlite3）
- **bcrypt** - 密码加密
- **express-session** - 会话管理

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，修改以下配置（可选）：

```env
PORT=3000
SESSION_SECRET=your-random-secret-key
ADMIN_EMAIL=admin@iwaconf.org
ADMIN_PASSWORD=Admin@2025
```

### 3. 初始化数据库

```bash
npm run init-db
```

这将：
- 创建 SQLite 数据库文件
- 创建用户表和日志表
- 创建默认管理员账号

### 4. 启动服务器

**开发模式（自动重启）：**
```bash
npm run dev
```

**生产模式：**
```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 默认管理员账号

```
邮箱：admin@iwaconf.org
密码：Admin@2025
```

⚠️ **请在首次登录后立即修改密码！**

## 项目结构

```
server/
├── database/
│   ├── init.js              # 数据库初始化
│   └── conference.db        # SQLite数据库文件（自动生成）
├── middleware/
│   └── auth.js              # 认证中间件
├── routes/
│   ├── auth.js              # 用户认证路由
│   └── admin.js             # 管理员路由
├── .env.example             # 环境变量示例
├── package.json             # 项目配置
├── server.js                # 主服务器文件
└── README.md                # 本文件
```

## API 文档

### 用户认证 API

#### 注册
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "张三",
  "organization": "同济大学"
}
```

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 获取当前用户信息
```
GET /api/auth/me
```

#### 修改密码
```
POST /api/auth/change-password
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

#### 退出登录
```
POST /api/auth/logout
```

### 管理员 API

#### 管理员登录
```
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@iwaconf.org",
  "password": "Admin@2025"
}
```

#### 获取所有用户
```
GET /api/admin/users
```

#### 创建用户
```
POST /api/admin/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "李四",
  "organization": "清华大学",
  "is_admin": 0
}
```

#### 更新用户
```
PUT /api/admin/users/:id
Content-Type: application/json

{
  "email": "updated@example.com",
  "name": "王五",
  "organization": "北京大学",
  "is_admin": 0
}
```

#### 删除用户
```
DELETE /api/admin/users/:id
```

#### 重置用户密码
```
POST /api/admin/reset-password
Content-Type: application/json

{
  "userId": 123,
  "newPassword": "newpassword123"
}
```

## 数据库结构

### users 表
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    organization TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### admin_logs 表
```sql
CREATE TABLE admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    target_user_id INTEGER,
    target_user_email TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 安全特性

- ✅ 密码使用 bcrypt 加密（10轮盐值）
- ✅ Session 持久化（24小时有效期）
- ✅ 邮箱唯一性验证
- ✅ 密码强度验证（最少6个字符）
- ✅ 参数化查询（防止SQL注入）
- ✅ 管理员操作日志记录
- ✅ 防止删除自己的账号
- ✅ HTTP Only Cookie

## 常见问题

### Q: 如何重置管理员密码？

A: 停止服务器，删除 `database/conference.db` 文件，然后运行 `npm run init-db` 重新初始化数据库。

### Q: 如何备份数据库？

A: 直接复制 `database/conference.db` 文件即可。

### Q: 如何查看数据库内容？

A: 使用 SQLite 客户端工具，如 DB Browser for SQLite，打开 `database/conference.db` 文件。

### Q: 端口被占用怎么办？

A: 修改 `.env` 文件中的 `PORT` 值，或者在命令行中指定：
```bash
PORT=8080 npm start
```

## 开发建议

### 推荐的开发工具
- **VS Code** - 代码编辑器
- **Postman** - API测试
- **DB Browser for SQLite** - 数据库管理

### 代码规范
- 使用 ES6+ 语法
- 异步操作使用 async/await
- 错误处理使用 try-catch
- API响应统一格式：`{ success: boolean, message: string, data?: any }`

## 部署建议

### 生产环境检查清单
- [ ] 修改 `SESSION_SECRET` 为随机字符串
- [ ] 修改默认管理员密码
- [ ] 设置 `NODE_ENV=production`
- [ ] 配置 HTTPS
- [ ] 定期备份数据库
- [ ] 设置日志轮转
- [ ] 配置防火墙规则

## 许可证

MIT License

## 支持

如有问题，请联系：admin@iwaconf.org
