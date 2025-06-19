# Cloudnav 部署指南

本指南将帮助您将 Cloudnav 导航站部署到 Cloudflare Workers 和 Pages。

## 📋 目录

- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [配置说明](#配置说明)
- [部署方式](#部署方式)
- [环境变量](#环境变量)
- [故障排除](#故障排除)
- [性能优化](#性能优化)

## 🚀 快速开始

### 一键部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/arebotx/CloudNav.git
cd CloudNav

# 2. 安装依赖
npm install

# 3. 运行配置向导
npm run setup

# 4. 一键部署
npm run deploy
```

### 手动部署

如果您需要更多控制，可以按照以下步骤手动部署：

1. [配置环境](#环境要求)
2. [设置 Cloudflare](#cloudflare-设置)
3. [配置项目](#配置说明)
4. [构建和部署](#构建和部署)

## 🔧 环境要求

### 必需软件

- **Node.js**: 18.0+ (推荐 LTS 版本)
- **npm**: 8.0+ 或 **pnpm**: 7.0+
- **Git**: 用于版本控制

### Cloudflare 账户

- 免费的 Cloudflare 账户
- Workers 订阅（免费额度足够个人使用）
- 可选：自定义域名

### 安装 Wrangler CLI

```bash
npm install -g wrangler
```

## ⚙️ 配置说明

### 1. Cloudflare 设置

#### 登录 Cloudflare

```bash
wrangler login
```

#### 创建 KV 命名空间

```bash
# 创建书签数据存储
wrangler kv:namespace create "cloudnav-bookmarks"

# 创建会话存储
wrangler kv:namespace create "cloudnav-session"

# 创建预览环境（可选）
wrangler kv:namespace create "cloudnav-bookmarks" --preview
wrangler kv:namespace create "cloudnav-session" --preview
```

#### 更新 wrangler.toml

将创建的 KV 命名空间 ID 更新到 `wrangler.toml` 文件中：

```toml
[[kv_namespaces]]
binding = "BOOKMARKS_KV"
id = "your_bookmarks_kv_namespace_id"  # 替换为实际 ID
preview_id = "your_bookmarks_kv_preview_id"  # 可选

[[kv_namespaces]]
binding = "SESSION"
id = "your_session_kv_namespace_id"  # 替换为实际 ID
preview_id = "your_session_kv_preview_id"  # 可选
```

### 2. 环境变量配置

创建 `.env` 文件：

```bash
# 基本配置
SITE_NAME="我的导航站"
SITE_DESCRIPTION="智能化的个人导航站"
SITE_DOMAIN="nav.example.com"  # 可选

# 管理功能
ENABLE_ADMIN="true"
ADMIN_PASSWORD_HASH="your_password_hash"

# AI 功能（可选）
ENABLE_AI="true"
GEMINI_API_KEY="your_gemini_api_key"

# 数据存储
DATA_SOURCE="kv"  # 或 "static"

# 部署环境
ENVIRONMENT="production"
```

### 3. 生成管理员密码哈希

```bash
# 使用配置向导生成
npm run setup

# 或手动生成
node -e "
const crypto = require('crypto');
const password = 'your_password';
const hash = crypto.createHash('sha256').update(password + 'cloudnav_salt').digest('hex');
console.log('Password hash:', hash);
"
```

## 🚀 部署方式

### 方式一：自动化部署

```bash
# 运行一键部署脚本
npm run deploy
```

脚本将自动：
- 检查环境和依赖
- 创建 KV 命名空间
- 更新配置文件
- 构建项目
- 部署到 Cloudflare Workers

### 方式二：手动部署

```bash
# 1. 构建项目
npm run build

# 2. 部署到生产环境
wrangler deploy --env production

# 或部署到开发环境
wrangler deploy --env development
```

### 方式三：Cloudflare Pages

1. 在 Cloudflare Dashboard 中创建新的 Pages 项目
2. 连接您的 Git 仓库
3. 设置构建配置：
   - 构建命令: `npm run build`
   - 输出目录: `dist`
4. 配置环境变量
5. 部署

## 🔐 环境变量详解

### 基本配置

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `SITE_NAME` | 网站名称 | "Cloudnav 导航站" | 否 |
| `SITE_DESCRIPTION` | 网站描述 | - | 否 |
| `SITE_DOMAIN` | 自定义域名 | - | 否 |

### 管理功能

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `ENABLE_ADMIN` | 启用管理功能 | "false" | 否 |
| `ADMIN_PASSWORD_HASH` | 管理员密码哈希 | - | 启用管理时必需 |

### AI 功能

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `ENABLE_AI` | 启用 AI 功能 | "false" | 否 |
| `GEMINI_API_KEY` | Gemini API 密钥 | - | 启用 AI 时必需 |

### 数据存储

| 变量名 | 描述 | 可选值 | 默认值 |
|--------|------|--------|--------|
| `DATA_SOURCE` | 数据存储方式 | "static", "kv" | "kv" |

## 🔧 故障排除

### 常见问题

#### 1. KV 命名空间错误

**错误**: `Invalid binding "BOOKMARKS_KV"`

**解决方案**:
- 确保已创建 KV 命名空间
- 检查 `wrangler.toml` 中的 ID 是否正确
- 运行 `wrangler kv:namespace list` 查看现有命名空间

#### 2. 认证失败

**错误**: `Authentication error`

**解决方案**:
```bash
# 重新登录
wrangler logout
wrangler login
```

#### 3. 构建失败

**错误**: `Build failed`

**解决方案**:
```bash
# 清理缓存
rm -rf node_modules dist .astro
npm install
npm run build
```

#### 4. 管理页面无法访问

**错误**: 管理页面显示认证错误

**解决方案**:
- 检查 `ENABLE_ADMIN` 环境变量
- 确认密码哈希正确
- 检查浏览器控制台错误

### 调试技巧

#### 查看 Worker 日志

```bash
wrangler tail
```

#### 本地调试

```bash
# 启动本地开发服务器
npm run dev

# 使用 Wrangler 本地模式
wrangler dev
```

#### 检查环境变量

```bash
# 查看当前配置
wrangler secret list
```

## ⚡ 性能优化

### 1. 缓存策略

在 `wrangler.toml` 中配置缓存：

```toml
[env.production]
[env.production.vars]
CACHE_TTL = "3600"  # 1小时缓存
```

### 2. 代码分割

项目已配置自动代码分割，无需额外配置。

### 3. 图片优化

```bash
# 优化图标
npm run optimize-icons
```

### 4. 监控和分析

- 使用 Cloudflare Analytics 监控性能
- 配置 Web Vitals 监控
- 设置错误报告

## 🔄 更新部署

### 自动更新

```bash
# 拉取最新代码
git pull origin main

# 重新部署
npm run deploy
```

### 手动更新

```bash
# 更新依赖
npm update

# 重新构建
npm run build

# 重新部署
wrangler deploy
```

## 🌐 自定义域名

### 1. 在 Cloudflare 中添加域名

1. 登录 Cloudflare Dashboard
2. 添加您的域名
3. 更新 DNS 设置

### 2. 配置 Workers 路由

```bash
# 添加路由
wrangler route add "nav.example.com/*" your-worker-name
```

### 3. 更新配置

在 `wrangler.toml` 中添加：

```toml
[[routes]]
pattern = "nav.example.com/*"
zone_name = "example.com"
```

## 📚 相关文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Astro 部署指南](https://docs.astro.build/en/guides/deploy/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## 🆘 获取帮助

如果您遇到问题：

1. 查看 [故障排除](#故障排除) 部分
2. 检查 [GitHub Issues](https://github.com/arebotx/CloudNav/issues)
3. 提交新的 Issue
4. 联系支持: support@example.com

---

**祝您部署顺利！** 🎉

---

## 📖 更多文档

- [API 文档](./API.md) - 详细的 API 接口说明
- [用户指南](./USER_GUIDE.md) - 使用说明和最佳实践
- [开发指南](./DEVELOPMENT.md) - 开发环境搭建和贡献指南
