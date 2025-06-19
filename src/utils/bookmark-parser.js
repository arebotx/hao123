/**
 * Chrome 书签解析器
 * 用于解析 Chrome 导出的 HTML 格式书签文件，并转换为项目数据格式
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { handleError, ErrorType } from './error-handler.js';

/**
 * 书签数据结构
 * @typedef {Object} BookmarkItem
 * @property {string} title - 书签标题
 * @property {string} url - 书签链接
 * @property {string} description - 书签描述（可选）
 * @property {string} icon - 图标 URL（可选）
 * @property {number} addDate - 添加时间戳
 * @property {string[]} tags - 标签数组（可选）
 */

/**
 * 分类数据结构
 * @typedef {Object} CategoryItem
 * @property {string} name - 分类名称
 * @property {string} icon - 分类图标
 * @property {BookmarkItem[]} sites - 书签列表
 * @property {number} addDate - 创建时间戳
 */

/**
 * Chrome 书签解析器类
 */
export class BookmarkParser {
  constructor() {
    this.defaultCategory = '未分类';
    this.iconPlaceholder = '🔗';
  }

  /**
   * 解析 Chrome 书签 HTML 文件
   * @param {string} htmlContent - HTML 文件内容
   * @returns {Promise<{categories: CategoryItem[], sites: BookmarkItem[]}>}
   */
  async parseChrome(htmlContent) {
    try {
      console.log('开始解析 Chrome 书签文件...');
      
      if (!htmlContent || typeof htmlContent !== 'string') {
        throw new Error('无效的书签文件内容');
      }

      // 创建 DOM 解析器
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      if (!doc) {
        throw new Error('无法解析 HTML 内容');
      }

      // 查找书签根节点
      const bookmarkBar = this.findBookmarkBar(doc);
      if (!bookmarkBar) {
        throw new Error('未找到有效的书签数据');
      }

      // 解析书签结构
      const parseResult = this.parseBookmarkStructure(bookmarkBar);
      
      console.log(`解析完成: ${parseResult.categories.length} 个分类, ${parseResult.sites.length} 个书签`);
      return parseResult;
      
    } catch (error) {
      console.error('解析 Chrome 书签失败:', error);
      throw handleError.validation(`解析书签文件失败: ${error.message}`);
    }
  }

  /**
   * 查找书签栏根节点
   * @param {Document} doc - DOM 文档对象
   * @returns {Element|null}
   */
  findBookmarkBar(doc) {
    // Chrome 书签文件的典型结构
    const selectors = [
      'dl > dt > h3', // 标准书签栏结构
      'dl dt h3',     // 备用选择器
      'h3'            // 最宽泛的选择器
    ];

    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent.trim();
        if (text.includes('书签栏') || text.includes('Bookmarks bar') || 
            text.includes('收藏夹栏') || text.includes('Favorites')) {
          return element.parentElement;
        }
      }
    }

    // 如果没找到书签栏，尝试查找第一个 DL 元素
    const firstDl = doc.querySelector('dl');
    return firstDl;
  }

  /**
   * 解析书签结构
   * @param {Element} rootElement - 根元素
   * @returns {{categories: CategoryItem[], sites: BookmarkItem[]}}
   */
  parseBookmarkStructure(rootElement) {
    const categories = [];
    const allSites = [];
    
    // 递归解析书签节点
    this.parseBookmarkNode(rootElement, categories, allSites, this.defaultCategory);
    
    // 确保有默认分类
    if (categories.length === 0) {
      categories.push({
        name: this.defaultCategory,
        icon: '📁',
        sites: allSites,
        addDate: Date.now()
      });
    }

    return { categories, sites: allSites };
  }

  /**
   * 递归解析书签节点
   * @param {Element} element - 当前元素
   * @param {CategoryItem[]} categories - 分类数组
   * @param {BookmarkItem[]} allSites - 所有书签数组
   * @param {string} currentCategory - 当前分类名称
   */
  parseBookmarkNode(element, categories, allSites, currentCategory) {
    const children = element.children;
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      
      if (child.tagName === 'DT') {
        const h3 = child.querySelector('h3');
        const a = child.querySelector('a');
        
        if (h3) {
          // 这是一个文件夹（分类）
          const categoryName = h3.textContent.trim() || '未命名分类';
          const addDate = this.parseAddDate(h3.getAttribute('add_date'));
          
          const category = {
            name: categoryName,
            icon: this.getCategoryIcon(categoryName),
            sites: [],
            addDate
          };
          
          categories.push(category);
          
          // 查找该分类下的书签列表
          const nextSibling = child.nextElementSibling;
          if (nextSibling && nextSibling.tagName === 'DD') {
            const dl = nextSibling.querySelector('dl');
            if (dl) {
              this.parseBookmarkNode(dl, categories, allSites, categoryName);
            }
          }
          
        } else if (a) {
          // 这是一个书签
          const bookmark = this.parseBookmarkLink(a, currentCategory);
          if (bookmark) {
            allSites.push(bookmark);
            
            // 将书签添加到对应分类
            const category = categories.find(cat => cat.name === currentCategory);
            if (category) {
              category.sites.push(bookmark);
            }
          }
        }
      } else if (child.tagName === 'DL') {
        // 递归处理嵌套的 DL 元素
        this.parseBookmarkNode(child, categories, allSites, currentCategory);
      }
    }
  }

  /**
   * 解析书签链接
   * @param {Element} linkElement - 链接元素
   * @param {string} category - 所属分类
   * @returns {BookmarkItem|null}
   */
  parseBookmarkLink(linkElement, category) {
    try {
      const url = linkElement.getAttribute('href');
      const title = linkElement.textContent.trim();
      const addDate = this.parseAddDate(linkElement.getAttribute('add_date'));
      const icon = linkElement.getAttribute('icon') || this.iconPlaceholder;
      
      if (!url || !title) {
        console.warn('跳过无效书签:', { url, title });
        return null;
      }

      // 过滤掉 javascript: 协议的书签
      if (url.startsWith('javascript:')) {
        console.warn('跳过 JavaScript 书签:', title);
        return null;
      }

      return {
        title: this.sanitizeText(title),
        url: url.trim(),
        description: this.generateDescription(title, url),
        icon: this.processIcon(icon),
        addDate,
        category,
        tags: this.extractTags(title)
      };
      
    } catch (error) {
      console.warn('解析书签链接失败:', error);
      return null;
    }
  }

  /**
   * 解析添加时间
   * @param {string} addDateStr - 时间戳字符串
   * @returns {number}
   */
  parseAddDate(addDateStr) {
    if (!addDateStr) return Date.now();
    
    const timestamp = parseInt(addDateStr, 10);
    if (isNaN(timestamp)) return Date.now();
    
    // Chrome 使用的是 WebKit 时间戳（从 1601 年开始的微秒数）
    // 转换为 JavaScript 时间戳（从 1970 年开始的毫秒数）
    if (timestamp > 10000000000000) {
      // 这是 WebKit 时间戳
      return Math.floor((timestamp - 11644473600000000) / 1000);
    } else if (timestamp > 1000000000) {
      // 这是 Unix 时间戳（秒）
      return timestamp * 1000;
    } else {
      // 无效时间戳，使用当前时间
      return Date.now();
    }
  }

  /**
   * 获取分类图标
   * @param {string} categoryName - 分类名称
   * @returns {string}
   */
  getCategoryIcon(categoryName) {
    const iconMap = {
      '工作': '💼',
      '学习': '📚',
      '娱乐': '🎮',
      '购物': '🛒',
      '新闻': '📰',
      '社交': '👥',
      '工具': '🔧',
      '开发': '💻',
      '设计': '🎨',
      '音乐': '🎵',
      '视频': '📺',
      '游戏': '🎮',
      '体育': '⚽',
      '旅游': '✈️',
      '美食': '🍽️',
      '健康': '🏥',
      '财经': '💰',
      '科技': '🔬'
    };

    // 检查分类名称中是否包含关键词
    for (const [keyword, icon] of Object.entries(iconMap)) {
      if (categoryName.includes(keyword)) {
        return icon;
      }
    }

    return '📁'; // 默认文件夹图标
  }

  /**
   * 处理图标
   * @param {string} iconData - 图标数据
   * @returns {string}
   */
  processIcon(iconData) {
    if (!iconData || iconData === this.iconPlaceholder) {
      return this.iconPlaceholder;
    }

    // 如果是 data URL，保持原样
    if (iconData.startsWith('data:')) {
      return iconData;
    }

    // 如果是 HTTP URL，保持原样
    if (iconData.startsWith('http')) {
      return iconData;
    }

    return this.iconPlaceholder;
  }

  /**
   * 清理文本内容
   * @param {string} text - 原始文本
   * @returns {string}
   */
  sanitizeText(text) {
    return text
      .replace(/[\r\n\t]/g, ' ')  // 替换换行符和制表符
      .replace(/\s+/g, ' ')       // 合并多个空格
      .trim();                    // 去除首尾空格
  }

  /**
   * 生成书签描述
   * @param {string} title - 书签标题
   * @param {string} url - 书签链接
   * @returns {string}
   */
  generateDescription(title, url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      return `${title} - ${domain}`;
    } catch {
      return title;
    }
  }

  /**
   * 从标题中提取标签
   * @param {string} title - 书签标题
   * @returns {string[]}
   */
  extractTags(title) {
    const tags = [];
    
    // 提取括号中的内容作为标签
    const bracketMatches = title.match(/\[([^\]]+)\]/g);
    if (bracketMatches) {
      bracketMatches.forEach(match => {
        const tag = match.slice(1, -1).trim();
        if (tag) tags.push(tag);
      });
    }

    // 提取圆括号中的内容作为标签
    const parenMatches = title.match(/\(([^)]+)\)/g);
    if (parenMatches) {
      parenMatches.forEach(match => {
        const tag = match.slice(1, -1).trim();
        if (tag && !tags.includes(tag)) tags.push(tag);
      });
    }

    return tags;
  }

  /**
   * 导出为 Chrome 书签格式
   * @param {CategoryItem[]} categories - 分类数组
   * @returns {string}
   */
  exportToChrome(categories) {
    try {
      console.log('开始导出 Chrome 书签格式...');
      
      const html = this.generateChromeBookmarkHTML(categories);
      
      console.log(`导出完成: ${categories.length} 个分类`);
      return html;
      
    } catch (error) {
      console.error('导出 Chrome 书签失败:', error);
      throw handleError.generic(`导出书签失败: ${error.message}`);
    }
  }

  /**
   * 生成 Chrome 书签 HTML
   * @param {CategoryItem[]} categories - 分类数组
   * @returns {string}
   */
  generateChromeBookmarkHTML(categories) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">书签栏</H3>
    <DD><DL><p>
`;

    categories.forEach(category => {
      html += `        <DT><H3 ADD_DATE="${Math.floor(category.addDate / 1000)}" LAST_MODIFIED="${Math.floor(category.addDate / 1000)}">${this.escapeHtml(category.name)}</H3>\n`;
      html += `        <DD><DL><p>\n`;
      
      category.sites.forEach(site => {
        const addDate = Math.floor(site.addDate / 1000);
        html += `            <DT><A HREF="${this.escapeHtml(site.url)}" ADD_DATE="${addDate}"`;
        if (site.icon && site.icon !== this.iconPlaceholder) {
          html += ` ICON="${this.escapeHtml(site.icon)}"`;
        }
        html += `>${this.escapeHtml(site.title)}</A>\n`;
      });
      
      html += `        </DL><p>\n`;
    });

    html += `    </DL><p>
</DL><p>`;

    return html;
  }

  /**
   * HTML 转义
   * @param {string} text - 原始文本
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 默认书签解析器实例
export const bookmarkParser = new BookmarkParser();

/**
 * 便捷的书签解析函数
 */
export const parseBookmarks = {
  /**
   * 解析 Chrome 书签文件
   * @param {File|string} input - 文件对象或 HTML 字符串
   * @returns {Promise<{categories: CategoryItem[], sites: BookmarkItem[]}>}
   */
  chrome: async (input) => {
    let htmlContent;
    
    if (input instanceof File) {
      htmlContent = await input.text();
    } else if (typeof input === 'string') {
      htmlContent = input;
    } else {
      throw new Error('无效的输入类型，请提供 File 对象或 HTML 字符串');
    }
    
    return bookmarkParser.parseChrome(htmlContent);
  },

  /**
   * 导出为 Chrome 书签格式
   * @param {CategoryItem[]} categories - 分类数组
   * @returns {string}
   */
  exportChrome: (categories) => bookmarkParser.exportToChrome(categories)
};
