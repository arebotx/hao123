## 🚀 智能化个人导航站 - 支持在线管理、AI 分类、数据统计的现代化书签管理系统

基于 Astro 构建的新一代导航站，不仅支持传统的静态部署，更提供了完整的后台管理功能、AI 智能分类和详细的数据统计分析。

## 📖 项目简介

- Astro-xwnav:不仅仅是简单的链接集合，更是智能化的导航平台，让您只需专注内容管理而非技术细节,**只需编辑一个数据文件，所有功能都会自动更新，极大简化维护工作**,是低配甚至无服务器,个人用户或新手搭建导航站的首选

### 🧭演示站点：[https://dh.zywe.de](https://dh.zywe.de)
![835f57b512df219adae8a13c97e69cd4.png](https://i.miji.bid/2025/06/12/835f57b512df219adae8a13c97e69cd4.png)

## 🌈 核心特性

### 🎯 基础功能
- 🚀 **Astro 高性能架构**：超轻量，加载速度极快
- 🏷 **智能分类导航**：双导航栏设计，分类清晰直观
- 🔍 **全文搜索功能**：快速查找，支持标题、描述、分类搜索
- 📃 **卡片式展示**：美观的网站卡片，悬停效果丰富
- 🌓 **智能主题切换**：自动适配系统主题，支持手动切换
- 📱 **完全响应式**：完美适配桌面、平板、手机等所有设备
- 🌤️ **实时天气显示**：集成天气 API，显示当地天气信息

### 🔧 管理功能（新增）
- 🛠️ **在线后台管理**：无需修改代码，在线管理所有内容
- 📚 **书签管理系统**：添加、编辑、删除、批量操作书签
- 🏷️ **分类管理系统**：创建、修改、删除分类，拖拽排序
- 📥 **导入导出功能**：支持 Chrome、Firefox 书签导入导出
- 🔐 **安全认证机制**：密码保护的管理界面，会话管理

### 🤖 AI 智能功能（新增）
- 🧠 **AI 智能分类**：基于 Gemini AI 的书签自动分类
- 🎯 **智能推荐**：AI 分析书签内容，推荐最佳分类
- 📊 **置信度评估**：AI 提供分类建议的可信度评分
- 🔄 **批量处理**：一键对多个书签进行 AI 分析和分类

### 📊 数据统计（新增）
- 📈 **使用统计分析**：点击统计、搜索分析、使用趋势
- 🔥 **热门内容排行**：最受欢迎的书签和搜索关键词
- 📅 **时间维度分析**：按日、周、月查看使用数据
- 🎯 **用户行为洞察**：深入了解用户使用习惯和偏好

### ⚡ 性能优化
- 💾 **Island 岛屿架构**：按需加载，极致性能优化
- 🚀 **静态首屏生成**：首屏纯静态，并行加载交互组件
- ⏱️ **延迟水合技术**：减少首屏阻塞，提升用户体验
- 🗄️ **智能缓存策略**：多层缓存机制，访问速度更快

## 🌟 独特优势

- 🤖 自动化功能，让您只需专注于内容管理而非技术细节,只需修改一个数据文件`src/data/navLinks.js`，所有功能都会自动更新，极大简化了维护工作

### 自动化功能

- **🖼️ 自动图标获取**：添加新网站和新分类时无需手动下载图标，脚本自动获取并优化图标引用图标一条龙
- **📑 自动分类导航**：侧边栏分类导航会根据数据文件自动更新，无需手动修改HTML
- **🔎 自动搜索索引**：搜索功能会自动检测新增网站和分类，无需额外配置
- **🃏 自动卡片生成**：网站卡片布局会自动适应新增内容，保持一致的视觉效果
- **🎨 自动主题切换**：根据用户系统配置自动切换暗色/亮色主题
- **🧹 自动清理图标**：图标管理脚本会自动清理未使用的图标文件，保持项目整洁
- **📱 自动响应式适配**：无需编写额外代码，完美适配各种设备屏幕
- **🗺️ 自动生成站点地图**：每次构建项目自动生成robots.txt和sitemap.xml
- **📝 自动SEO元数据**：每次构建项目自动生成和管理SEO相关的元标签等等代码

## 🟢自动化生成的灯塔情况[PageSpeed Insights](https://pagespeed.web.dev/)
![4ceed547f12b6e7753b8f776090abed3.png](https://i.miji.bid/2025/06/11/4ceed547f12b6e7753b8f776090abed3.png)

## 🚀 快速开始

### 🎯 一键部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/arebotx/CloudNav.git
cd CloudNav

# 2. 安装依赖
npm install

# 3. 运行配置向导
npm run setup

# 4. 一键部署到 Cloudflare
npm run deploy
```

### 📋 部署方式选择

| 部署方式 | 适用场景 | 管理功能 | AI 功能 | 统计功能 |
|----------|----------|----------|---------|----------|
| **Cloudflare Workers** | 完整功能 | ✅ | ✅ | ✅ |
| **Cloudflare Pages** | 静态 + 部分功能 | ✅ | ✅ | ✅ |
| **Vercel** | 静态部署 | ❌ | ❌ | ❌ |
| **传统服务器** | 静态文件 | ❌ | ❌ | ❌ |

## 🎶 详细部署指南

### ✅ git 拉取
- `git clone https://github.com/zywe03/astro-xwnav.git`(或者下载压缩包源码解压)

### ✅ windowns安装Node.js 环境
- 安装 **Node.js 18.0+** (推荐LTS版本)[官网](https://nodejs.org/zh-cn)
- Windows用户：直接从官网下载安装包

### ✅ 包管理器选择
- **启用 pnpm**（轻量、高效）
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```
### ✅ 开始开发
```
# 安装依赖
pnpm i
# 浏览器实时看效果
pnpm dev
# 自动下载图标
npx tsx .\icon-system\0icon.ts
# 打包构建生成/dist目录
pnpm build
```
### ✅ 上传/dist目录到服务器,nginx反代,完结撒花🥳

### 🟢 Vercel自动部署
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/arebotx/CloudNav)
### 🟢 Cloudflare Workers自动部署
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/deploy-to-workers&repository=https://github.com/arebotx/CloudNav)

### 🛜 第一次导入大量网址链接,借助AI快速生成网站导航内容(强烈建议)

**列出想要生成的网站所属分类,名称或网站**,短和长描述让AI生成，节省工作量

AI提示词:
```
统一分类opensource
网站：
github
baidu.com
谷歌
具体按照以下样式生成，使用“JavaScript风格格式+单引号”，不要添加"icon字段"和"[]""      
      {
      id: 'github',
      title: 'GitHub', 
      description: '全球最大的开源代码托管平台，支持 Git 版本控制，适用于协作开发、项目管理和自动化工作流，是开发者共享与协作的核心工具。'
      shortDesc: '代码托管平台。',
      url: 'https://github.com/',
      category: 'opensource',
      },

描述根据网站实际内容,专业,准确,介绍背景独特优势等等,不要太刻板,臃肿,重复
```
插入数据文件`navLinks.js`后
执行`npx tsx .\icon-system\0icon.ts`自动下载图标,即可完成大量导航网站的导入工作

## 🔧 新功能使用指南

### 📊 后台管理系统

1. **访问管理后台**：`https://your-domain.com/admin`
2. **首次设置**：运行 `npm run setup` 配置管理员密码
3. **功能模块**：
   - 📚 书签管理：在线添加、编辑、删除书签
   - 🏷️ 分类管理：创建和管理分类
   - 📥 导入导出：批量导入 Chrome/Firefox 书签
   - 🤖 AI 整理：智能分类和整理书签
   - 📊 数据统计：查看使用统计和分析报告

### 🤖 AI 智能分类

1. **配置 AI 功能**：
   ```bash
   # 在 .env 文件中添加
   ENABLE_AI="true"
   GEMINI_API_KEY="your_api_key"
   ```

2. **获取 API 密钥**：访问 [Google AI Studio](https://aistudio.google.com/app/apikey)

3. **使用 AI 分类**：
   - 在管理后台选择 "AI 整理"
   - 选择要分类的书签
   - 设置置信度阈值
   - 查看 AI 建议并应用

### 📊 数据统计功能

- **实时统计**：自动收集用户行为数据
- **隐私保护**：支持 Do Not Track，数据匿名化
- **多维分析**：点击、搜索、时间、分类等多维度统计
- **可视化报表**：图表展示，趋势分析

### 🔐 环境变量配置

```bash
# 基本配置
SITE_NAME="我的导航站"
SITE_DESCRIPTION="智能化的个人导航站"

# 管理功能
ENABLE_ADMIN="true"
ADMIN_PASSWORD_HASH="your_password_hash"

# AI 功能
ENABLE_AI="true"
GEMINI_API_KEY="your_gemini_api_key"

# 数据存储
DATA_SOURCE="kv"  # 或 "static"
```

## 🟢如何优雅上传服务器

1. ➡️使用Cloudflare Pages或Vercel作为服务器

 vscode更新数据文件，执行图标下载脚本，同步更新到仓库即可

2. ➡️使用vps作为服务器

 2.1:使用`rsync`，配置一键脚本上传

 2.2:更新文件，执行脚本，构建，设置好nginx，压缩dist目录，上传后解压，每次更新删除服务器的dist，再传新的压缩包

## 🎥 项目核心结构

```
dh_web/
├── icon-system/       # 图标管理系统
├── public/            # 静态资源目录
│   ├── icons/         # 导航网站和分类图标目录
│   └── images/        # 网站图标
├── src/               # 源代码目录
│   ├── components/    # 组件目录
│   │   ├── Card.astro     # 网站卡片组件
│   │   ├── Footer.astro   # 页脚组件
│   │   ├── Header.astro   # 页眉组件
│   │   ├── LogoName.astro  # Logo和网站名称组件
│   │   └── Sidebar.astro   # 侧边栏组件
│   ├── Island/        # React岛屿组件目录
│   │   ├── ThemeIsland.jsx # 主题切换岛屿
│   │   ├── WeatherIsland.jsx # 天气显示岛屿
│   │   ├── quicklyup.jsx   # 快速回到顶部岛屿
│   │   └── searchlsland.jsx # 搜索功能岛屿
│   ├── data/          # 数据目录
│   │   └── navLinks.js    # 导航网站核心数据
│   ├── layouts/       # 布局目录
│   │   └── MainLayout.astro # 主布局
│   └── pages/         # 页面目录
│       ├── index.astro   # 首页
│       └── robots.txt.ts # 生成robots.txt文件
├── astro.config.mjs   # Astro配置文件
└── package.json       # 项目依赖配置
```

### 💬 日常使用关键文件和目录说明

#### 核心数据文件
- **src/data/navLinks.js**: 存储所有网站数据和分类信息，是最常修改的文件，包含网站信息和分类定义

#### 图标存储
- **public/icons/**: 存储所有网站图标
- **public/icons/category/**: 存储分类图标
- **public/icons/downloaded_sites/**: 临时下载目录（自动清理）
- **public/icons/downloaded_categories/**: 临时下载目录（自动清理）

## 🔧 关键文件修改指南

### 📝 增删网站和分类

修改 `src/data/navLinks.js` 文件即可管理所有网站和分类

- ✅建议统一用一种格式**JavaScript风格格式+单引号**,避免脚本错误识别

### 添加新分类

在 `categories` 数组中添加新分类：

⚠️ 注意：不要手动添加icon字段，不要icon""字段留空,会导致无法自动下载添加icon字段,**手动自定义图标除外**

   最好直接不写icon省心,简单

```javascript
export const categories = [
  {
    id: new,  //分类ID
    name: '新分类名称',icon: '/icons/category/new-category.svg'
    // 分类图标也支持自动生成,基于模糊搜索分类名字和ID,找到合适的图标
  }
];
```

#### 添加新网站

在 `sites` 数组中添加新网站：

```javascript
export const sites = [
      {
      id: 'github',                           // 网站ID
      title: 'GitHub',                       // 网站名称
      description: '全球最大代码托管平台。', // 长描述
      shortDesc: '代码托管平台。',      // 短描述
      url: 'https://github.com/',     // 网站链接（包含完整协议（`http://`或`https://`））
      category: 'opensource',        // 所属分类 ID（必须对应分类中的id）
        // 注意：不需要添加icon字段，脚本会自动处理
      },
    ];
```

#### 网站和分类排序
- ➡️一句话就是调顺序即可排序
- **分类排序**: 调整 `categories` 数组中分类的顺序即可改变分类的显示顺序
- **网站排序**: 调整 `sites` 数组中网站的顺序即可改变网站的显示顺序

### 生成后插入navLinks.js即可

---
## 🖼️ 图标下载脚本使用指南

✅ `navLinks.js`使用“JavaScript风格格式+单引号”，不要添加"icon字段"

  由于是静态网站，建议全部图标在构建时下载图标引用

### 使用步骤：

1. 首先在 `src/data/navLinks.js` 中添加好新网站或分类
2. 一键执行：
```bash
# 终端复制粘贴回车
npx tsx .\icon-system\0icon.ts
```

## 🔗 修改友情链接和按钮

## ✅使用vscode搜索文本`记得修改`可快速找到全部需要自定义的内容(强烈建议已经全部标注好)

### 修改友情链接和页脚声明

位于页脚组件中，修改 `src/components/Footer.astro` 文件：
- 点开文件一目了然
## 修改网站大标题(名称)和logo

修改`src\components\LogoName.astro`
- 独立出来方便修改,点开文件一目了然

### 修改全部图标

- `default.svg`导航网站三级回退机制保底图标
- `logo.png`网站社交媒体分享图片
- `logo.svg`网站主图标
1. 准备您的图标文件(修改图片,但使用固定命名)
2. 替换图标文件放入 `public\images` 目录即可

### 提交站点地图
只需要向搜索引擎提交 `https://xxx.com/sitemap-index.xml` 这一个文件

---
## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=arebotx/CloudNav&type=Date)](https://www.star-history.com/#arebotx/CloudNav&Date)

```
感谢项目使用的全部API
Feather,Simple,Iconify,DuckDuckGo,Unavatar,myip.la,openweathermap.org,Clearbit,Logo
```
🌟 **Zywe导航站** - 让您的网络世界更有序、更高效！
意见与反馈可使用📧 联系我：[电子邮箱](mailto:zywe03@qq.com)