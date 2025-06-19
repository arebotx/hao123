/**
 * 统计数据收集工具
 * 提供用户行为数据的收集、存储和隐私保护功能
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { api } from './api-client.js';
import { handleError } from './error-handler.js';

/**
 * 统计事件类型枚举
 */
export const StatsEventType = {
  CLICK: 'click',
  SEARCH: 'search',
  PAGE_VIEW: 'page_view',
  CATEGORY_VIEW: 'category_view',
  TIME_SPENT: 'time_spent',
  BOOKMARK_ADD: 'bookmark_add'
};

/**
 * 统计数据收集器类
 */
export class StatsCollector {
  constructor() {
    this.isEnabled = true;
    this.batchSize = 10;
    this.flushInterval = 30000; // 30秒
    this.eventQueue = [];
    this.sessionId = this.generateSessionId();
    this.pageLoadTime = Date.now();
    this.lastActivityTime = Date.now();
    this.isVisible = true;
    this.flushTimer = null;
    
    this.init();
  }

  /**
   * 初始化统计收集器
   */
  init() {
    try {
      // 检查用户隐私设置
      this.checkPrivacySettings();
      
      // 设置页面可见性监听
      this.setupVisibilityListener();
      
      // 设置定时刷新
      this.setupFlushTimer();
      
      // 设置页面卸载监听
      this.setupUnloadListener();
      
      console.log('📊 统计收集器初始化成功');
    } catch (error) {
      console.warn('统计收集器初始化失败:', error);
      this.isEnabled = false;
    }
  }

  /**
   * 检查隐私设置
   */
  checkPrivacySettings() {
    // 检查 localStorage 中的隐私设置
    const privacySettings = localStorage.getItem('cloudnav_privacy_settings');
    if (privacySettings) {
      const settings = JSON.parse(privacySettings);
      this.isEnabled = settings.enableStats !== false;
    }
    
    // 检查 Do Not Track 设置
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
      this.isEnabled = false;
      console.log('🔒 检测到 Do Not Track，已禁用统计收集');
    }
  }

  /**
   * 生成会话ID
   * @returns {string}
   */
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 设置页面可见性监听
   */
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      if (this.isVisible) {
        this.lastActivityTime = Date.now();
      } else {
        // 页面隐藏时记录时间统计
        this.recordTimeSpent();
      }
    });
  }

  /**
   * 设置定时刷新
   */
  setupFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * 设置页面卸载监听
   */
  setupUnloadListener() {
    window.addEventListener('beforeunload', () => {
      this.recordTimeSpent();
      this.flush(true); // 强制同步刷新
    });
  }

  /**
   * 记录点击事件
   * @param {string} siteId - 网站ID
   * @param {string} category - 分类
   * @param {string} url - URL
   * @param {string} title - 标题
   */
  recordClick(siteId, category, url, title) {
    if (!this.isEnabled) return;

    const event = {
      type: StatsEventType.CLICK,
      data: {
        siteId,
        category,
        url: this.anonymizeUrl(url),
        title,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userAgent: this.getUserAgentInfo(),
        referrer: this.anonymizeUrl(document.referrer)
      }
    };

    this.addEvent(event);
    console.log('📊 记录点击事件:', siteId);
  }

  /**
   * 记录搜索事件
   * @param {string} query - 搜索关键词
   * @param {number} resultCount - 结果数量
   */
  recordSearch(query, resultCount) {
    if (!this.isEnabled) return;

    const event = {
      type: StatsEventType.SEARCH,
      data: {
        query: this.anonymizeQuery(query),
        resultCount,
        timestamp: Date.now(),
        sessionId: this.sessionId
      }
    };

    this.addEvent(event);
    console.log('📊 记录搜索事件:', query);
  }

  /**
   * 记录页面访问
   * @param {string} page - 页面路径
   */
  recordPageView(page) {
    if (!this.isEnabled) return;

    const event = {
      type: StatsEventType.PAGE_VIEW,
      data: {
        page: this.anonymizePage(page),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userAgent: this.getUserAgentInfo(),
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    this.addEvent(event);
    console.log('📊 记录页面访问:', page);
  }

  /**
   * 记录分类查看
   * @param {string} categoryId - 分类ID
   * @param {string} categoryName - 分类名称
   */
  recordCategoryView(categoryId, categoryName) {
    if (!this.isEnabled) return;

    const event = {
      type: StatsEventType.CATEGORY_VIEW,
      data: {
        categoryId,
        categoryName,
        timestamp: Date.now(),
        sessionId: this.sessionId
      }
    };

    this.addEvent(event);
    console.log('📊 记录分类查看:', categoryName);
  }

  /**
   * 记录时间统计
   */
  recordTimeSpent() {
    if (!this.isEnabled || !this.isVisible) return;

    const timeSpent = Date.now() - this.lastActivityTime;
    
    // 只记录合理的时间范围（1秒到30分钟）
    if (timeSpent < 1000 || timeSpent > 30 * 60 * 1000) return;

    const event = {
      type: StatsEventType.TIME_SPENT,
      data: {
        duration: timeSpent,
        page: this.anonymizePage(window.location.pathname),
        timestamp: Date.now(),
        sessionId: this.sessionId
      }
    };

    this.addEvent(event);
    this.lastActivityTime = Date.now();
  }

  /**
   * 记录书签添加
   * @param {string} category - 分类
   * @param {string} source - 来源（manual, import, ai）
   */
  recordBookmarkAdd(category, source = 'manual') {
    if (!this.isEnabled) return;

    const event = {
      type: StatsEventType.BOOKMARK_ADD,
      data: {
        category,
        source,
        timestamp: Date.now(),
        sessionId: this.sessionId
      }
    };

    this.addEvent(event);
    console.log('📊 记录书签添加:', category);
  }

  /**
   * 添加事件到队列
   * @param {Object} event - 事件对象
   */
  addEvent(event) {
    this.eventQueue.push(event);
    
    // 如果队列满了，立即刷新
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * 刷新事件队列
   * @param {boolean} sync - 是否同步刷新
   */
  async flush(sync = false) {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (sync) {
        // 同步发送（页面卸载时使用）
        navigator.sendBeacon('/api/stats/collect', JSON.stringify({ events }));
      } else {
        // 异步发送
        await api.post('/api/stats/collect', { events });
      }
      
      console.log(`📊 统计数据已发送: ${events.length} 个事件`);
    } catch (error) {
      console.warn('发送统计数据失败:', error);
      // 发送失败时重新加入队列（但限制重试次数）
      if (!sync && events.length < 50) {
        this.eventQueue.unshift(...events);
      }
    }
  }

  /**
   * 匿名化URL
   * @param {string} url - 原始URL
   * @returns {string}
   */
  anonymizeUrl(url) {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      // 只保留域名和路径，移除查询参数和片段
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url.split('?')[0].split('#')[0];
    }
  }

  /**
   * 匿名化搜索查询
   * @param {string} query - 原始查询
   * @returns {string}
   */
  anonymizeQuery(query) {
    if (!query) return '';
    
    // 移除可能的敏感信息，只保留前20个字符
    return query.toLowerCase().substring(0, 20);
  }

  /**
   * 匿名化页面路径
   * @param {string} page - 页面路径
   * @returns {string}
   */
  anonymizePage(page) {
    if (!page) return '/';
    
    // 移除查询参数和片段
    return page.split('?')[0].split('#')[0];
  }

  /**
   * 获取用户代理信息
   * @returns {Object}
   */
  getUserAgentInfo() {
    const ua = navigator.userAgent;
    
    return {
      browser: this.getBrowserName(ua),
      os: this.getOSName(ua),
      mobile: /Mobile|Android|iPhone|iPad/.test(ua),
      language: navigator.language || 'unknown'
    };
  }

  /**
   * 获取浏览器名称
   * @param {string} ua - User Agent
   * @returns {string}
   */
  getBrowserName(ua) {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }

  /**
   * 获取操作系统名称
   * @param {string} ua - User Agent
   * @returns {string}
   */
  getOSName(ua) {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Other';
  }

  /**
   * 启用统计收集
   */
  enable() {
    this.isEnabled = true;
    localStorage.setItem('cloudnav_privacy_settings', JSON.stringify({ enableStats: true }));
    console.log('📊 统计收集已启用');
  }

  /**
   * 禁用统计收集
   */
  disable() {
    this.isEnabled = false;
    this.eventQueue = [];
    localStorage.setItem('cloudnav_privacy_settings', JSON.stringify({ enableStats: false }));
    console.log('🔒 统计收集已禁用');
  }

  /**
   * 获取收集器状态
   * @returns {Object}
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      queueLength: this.eventQueue.length,
      sessionId: this.sessionId,
      pageLoadTime: this.pageLoadTime,
      lastActivityTime: this.lastActivityTime
    };
  }

  /**
   * 销毁收集器
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(true);
    this.isEnabled = false;
  }
}

// 默认统计收集器实例
export const statsCollector = new StatsCollector();

/**
 * 便捷的统计收集函数
 */
export const stats = {
  click: (siteId, category, url, title) => statsCollector.recordClick(siteId, category, url, title),
  search: (query, resultCount) => statsCollector.recordSearch(query, resultCount),
  pageView: (page) => statsCollector.recordPageView(page),
  categoryView: (categoryId, categoryName) => statsCollector.recordCategoryView(categoryId, categoryName),
  timeSpent: () => statsCollector.recordTimeSpent(),
  bookmarkAdd: (category, source) => statsCollector.recordBookmarkAdd(category, source),
  enable: () => statsCollector.enable(),
  disable: () => statsCollector.disable(),
  getStatus: () => statsCollector.getStatus()
};
