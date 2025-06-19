# Cloudnav API 文档

本文档描述了 Cloudnav 导航站的所有 API 接口，包括书签管理、分类管理、AI 功能和统计分析等。

## 📋 目录

- [认证](#认证)
- [书签管理 API](#书签管理-api)
- [分类管理 API](#分类管理-api)
- [导入导出 API](#导入导出-api)
- [AI 功能 API](#ai-功能-api)
- [统计分析 API](#统计分析-api)
- [错误处理](#错误处理)
- [示例代码](#示例代码)

## 🔐 认证

所有管理 API 都需要认证。认证通过会话管理实现，无需在每个请求中传递认证信息。

### 认证流程

1. 用户在管理页面输入密码
2. 系统验证密码哈希
3. 创建会话并存储在 localStorage
4. 后续请求自动包含会话信息

## 📚 书签管理 API

### 获取所有书签

```http
GET /api/bookmarks
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "id": "github",
        "title": "GitHub",
        "description": "全球最大的开源代码托管平台",
        "shortDesc": "代码托管平台",
        "url": "https://github.com",
        "category": "development",
        "icon": "/icons/github.svg"
      }
    ],
    "total": 1,
    "lastUpdated": "2025-06-19T12:00:00.000Z"
  }
}
```

### 添加书签

```http
POST /api/bookmarks
Content-Type: application/json

{
  "title": "新网站",
  "description": "网站描述",
  "shortDesc": "简短描述",
  "url": "https://example.com",
  "category": "tools"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "id": "new-site-id",
    "message": "书签添加成功"
  }
}
```

### 更新书签

```http
PUT /api/bookmarks/{id}
Content-Type: application/json

{
  "title": "更新的标题",
  "description": "更新的描述"
}
```

### 删除书签

```http
DELETE /api/bookmarks/{id}
```

## 🏷️ 分类管理 API

### 获取所有分类

```http
GET /api/categories
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "development",
        "name": "开发工具",
        "icon": "/icons/category/development.svg",
        "siteCount": 15
      }
    ],
    "total": 1
  }
}
```

### 添加分类

```http
POST /api/categories
Content-Type: application/json

{
  "name": "新分类",
  "icon": "/icons/category/new.svg"
}
```

### 更新分类

```http
PUT /api/categories/{id}
Content-Type: application/json

{
  "name": "更新的分类名"
}
```

### 删除分类

```http
DELETE /api/categories/{id}
```

## 📥 导入导出 API

### 导出数据

```http
GET /api/export?format=json
```

**查询参数:**
- `format`: 导出格式 (`json`, `chrome`, `firefox`)
- `categories`: 要导出的分类 ID（可选）

### 导入数据

```http
POST /api/import
Content-Type: multipart/form-data

file: [书签文件]
format: "chrome"
options: {
  "mergeMode": "append",
  "categoryMapping": {}
}
```

**支持的格式:**
- Chrome 书签 HTML
- Firefox 书签 JSON
- Cloudnav JSON 格式

## 🤖 AI 功能 API

### 检查 AI 服务状态

```http
GET /api/ai/status
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "model": "gemini-pro",
    "features": ["categorization", "generation"]
  }
}
```

### AI 智能分类

```http
POST /api/ai/organize
Content-Type: application/json

{
  "bookmarks": ["bookmark-id-1", "bookmark-id-2"],
  "mode": "categorize",
  "options": {
    "confidenceThreshold": 0.7,
    "autoApply": false
  }
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "bookmarkId": "bookmark-id-1",
        "suggestedCategory": "development",
        "confidence": 0.85,
        "reason": "基于网站内容和功能分析"
      }
    ],
    "applied": 0,
    "total": 1
  }
}
```

### 生成新分类

```http
POST /api/ai/generate-categories
Content-Type: application/json

{
  "bookmarks": ["bookmark-id-1", "bookmark-id-2"],
  "maxCategories": 5
}
```

## 📊 统计分析 API

### 获取统计概览

```http
GET /api/stats/overview
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "totalClicks": 1250,
    "totalSearches": 340,
    "totalSites": 85,
    "totalCategories": 12,
    "clicksToday": 45,
    "searchesToday": 12,
    "searchSuccessRate": "78%",
    "lastUpdated": "2025-06-19T12:00:00.000Z"
  }
}
```

### 获取点击统计

```http
GET /api/stats/clicks?type=sites&limit=10
```

**查询参数:**
- `type`: 统计类型 (`sites`, `categories`, `daily`)
- `limit`: 返回数量限制
- `timeRange`: 时间范围 (`today`, `week`, `month`)

### 获取搜索统计

```http
GET /api/stats/searches?type=keywords&limit=10
```

### 收集统计数据

```http
POST /api/stats/collect
Content-Type: application/json

{
  "events": [
    {
      "type": "click",
      "data": {
        "siteId": "github",
        "category": "development",
        "timestamp": 1687123200000,
        "sessionId": "session-123"
      }
    }
  ]
}
```

## ❌ 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求数据验证失败",
    "details": {
      "field": "title",
      "reason": "标题不能为空"
    }
  },
  "timestamp": "2025-06-19T12:00:00.000Z"
}
```

### 常见错误码

| 错误码 | HTTP 状态 | 描述 |
|--------|-----------|------|
| `VALIDATION_ERROR` | 400 | 请求数据验证失败 |
| `UNAUTHORIZED` | 401 | 未认证或认证失败 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突（如重复 ID） |
| `RATE_LIMIT` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用（如 KV 存储） |

## 💻 示例代码

### JavaScript 客户端

```javascript
class CloudnavAPI {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error.message);
    }
    
    return data.data;
  }

  // 书签管理
  async getBookmarks() {
    return this.request('/bookmarks');
  }

  async addBookmark(bookmark) {
    return this.request('/bookmarks', {
      method: 'POST',
      body: JSON.stringify(bookmark)
    });
  }

  async updateBookmark(id, updates) {
    return this.request(`/bookmarks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteBookmark(id) {
    return this.request(`/bookmarks/${id}`, {
      method: 'DELETE'
    });
  }

  // 分类管理
  async getCategories() {
    return this.request('/categories');
  }

  async addCategory(category) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(category)
    });
  }

  // AI 功能
  async organizeBookmarks(bookmarks, options = {}) {
    return this.request('/ai/organize', {
      method: 'POST',
      body: JSON.stringify({ bookmarks, ...options })
    });
  }

  // 统计分析
  async getStats() {
    return this.request('/stats/overview');
  }
}

// 使用示例
const api = new CloudnavAPI();

// 获取所有书签
const bookmarks = await api.getBookmarks();

// 添加新书签
const newBookmark = await api.addBookmark({
  title: 'Example Site',
  url: 'https://example.com',
  category: 'tools'
});

// AI 智能分类
const suggestions = await api.organizeBookmarks(['bookmark-1', 'bookmark-2']);
```

### Python 客户端

```python
import requests
import json

class CloudnavAPI:
    def __init__(self, base_url=''):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def request(self, endpoint, method='GET', data=None):
        url = f"{self.base_url}/api{endpoint}"
        response = self.session.request(method, url, json=data)
        
        result = response.json()
        if not result.get('success'):
            raise Exception(result.get('error', {}).get('message', 'API Error'))
        
        return result.get('data')

    def get_bookmarks(self):
        return self.request('/bookmarks')

    def add_bookmark(self, bookmark):
        return self.request('/bookmarks', 'POST', bookmark)

    def get_stats(self):
        return self.request('/stats/overview')

# 使用示例
api = CloudnavAPI()
bookmarks = api.get_bookmarks()
print(f"总共有 {bookmarks['total']} 个书签")
```

## 🔄 版本控制

API 版本通过 URL 路径控制：

- `/api/v1/bookmarks` - 版本 1
- `/api/v2/bookmarks` - 版本 2

当前默认版本为 v1，可以通过 `Accept-Version` 头指定版本：

```http
Accept-Version: v2
```

## 📝 更新日志

### v1.0.0 (2025-06-19)
- 初始 API 版本
- 书签和分类管理
- AI 智能分类功能
- 统计分析功能
- 导入导出功能

---

**需要帮助？** 请查看 [部署指南](./DEPLOYMENT.md) 或提交 [Issue](https://github.com/arebotx/CloudNav/issues)。
