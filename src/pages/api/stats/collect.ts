/**
 * 统计数据收集 API 端点
 * 接收和处理前端发送的用户行为统计数据
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { kvAdapter, KV_KEYS } from '../../../data/kv-adapter.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 统计事件接口
 */
interface StatsEvent {
  type: string;
  data: {
    timestamp: number;
    sessionId: string;
    [key: string]: any;
  };
}

/**
 * 统计数据批次接口
 */
interface StatsBatch {
  events: StatsEvent[];
}

/**
 * 验证统计事件数据
 * @param events - 事件数组
 * @returns 验证结果
 */
function validateStatsEvents(events: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(events)) {
    errors.push('事件数据必须是数组');
    return { isValid: false, errors };
  }
  
  if (events.length === 0) {
    errors.push('事件数组不能为空');
    return { isValid: false, errors };
  }
  
  if (events.length > 100) {
    errors.push('单次提交的事件数量不能超过100个');
  }
  
  events.forEach((event, index) => {
    if (!event.type || typeof event.type !== 'string') {
      errors.push(`事件 ${index + 1} 缺少有效的类型`);
    }
    
    if (!event.data || typeof event.data !== 'object') {
      errors.push(`事件 ${index + 1} 缺少有效的数据`);
    } else {
      if (!event.data.timestamp || typeof event.data.timestamp !== 'number') {
        errors.push(`事件 ${index + 1} 缺少有效的时间戳`);
      }
      
      if (!event.data.sessionId || typeof event.data.sessionId !== 'string') {
        errors.push(`事件 ${index + 1} 缺少有效的会话ID`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 创建标准化的 API 响应
 * @param data - 响应数据
 * @param status - HTTP 状态码
 * @param message - 响应消息
 * @returns Response 对象
 */
function createApiResponse(data: any = null, status: number = 200, message?: string) {
  const response = {
    success: status >= 200 && status < 300,
    data,
    message,
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}

/**
 * 获取日期字符串（YYYY-MM-DD 格式）
 * @param timestamp - 时间戳
 * @returns 日期字符串
 */
function getDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

/**
 * 处理点击事件
 * @param event - 点击事件
 */
async function processClickEvent(event: StatsEvent) {
  const { siteId, category, timestamp } = event.data;
  const dateString = getDateString(timestamp);
  
  // 更新点击统计
  let clickStats = await kvAdapter.get(KV_KEYS.STATS_CLICKS) || {
    sites: {},
    categories: {},
    daily: {},
    total: 0,
    lastUpdated: Date.now()
  };
  
  clickStats.sites[siteId] = (clickStats.sites[siteId] || 0) + 1;
  clickStats.categories[category] = (clickStats.categories[category] || 0) + 1;
  clickStats.daily[dateString] = (clickStats.daily[dateString] || 0) + 1;
  clickStats.total += 1;
  clickStats.lastUpdated = Date.now();
  
  await kvAdapter.set(KV_KEYS.STATS_CLICKS, clickStats);
}

/**
 * 处理搜索事件
 * @param event - 搜索事件
 */
async function processSearchEvent(event: StatsEvent) {
  const { query, resultCount, timestamp } = event.data;
  const dateString = getDateString(timestamp);
  
  // 更新搜索统计
  let searchStats = await kvAdapter.get(KV_KEYS.STATS_SEARCHES) || {
    keywords: {},
    daily: {},
    results: { noResults: 0, hasResults: 0 },
    total: 0,
    lastUpdated: Date.now()
  };
  
  searchStats.keywords[query] = (searchStats.keywords[query] || 0) + 1;
  searchStats.daily[dateString] = (searchStats.daily[dateString] || 0) + 1;
  
  if (resultCount > 0) {
    searchStats.results.hasResults += 1;
  } else {
    searchStats.results.noResults += 1;
  }
  
  searchStats.total += 1;
  searchStats.lastUpdated = Date.now();
  
  await kvAdapter.set(KV_KEYS.STATS_SEARCHES, searchStats);
}

/**
 * 处理页面访问事件
 * @param event - 页面访问事件
 */
async function processPageViewEvent(event: StatsEvent) {
  const { page, userAgent, timestamp } = event.data;
  const dateString = getDateString(timestamp);
  
  // 更新页面访问统计
  let pageStats = await kvAdapter.get(KV_KEYS.STATS_PAGES) || {
    pages: {},
    daily: {},
    browsers: {},
    os: {},
    total: 0,
    lastUpdated: Date.now()
  };
  
  pageStats.pages[page] = (pageStats.pages[page] || 0) + 1;
  pageStats.daily[dateString] = (pageStats.daily[dateString] || 0) + 1;
  
  if (userAgent) {
    pageStats.browsers[userAgent.browser] = (pageStats.browsers[userAgent.browser] || 0) + 1;
    pageStats.os[userAgent.os] = (pageStats.os[userAgent.os] || 0) + 1;
  }
  
  pageStats.total += 1;
  pageStats.lastUpdated = Date.now();
  
  await kvAdapter.set(KV_KEYS.STATS_PAGES, pageStats);
}

/**
 * 处理分类查看事件
 * @param event - 分类查看事件
 */
async function processCategoryViewEvent(event: StatsEvent) {
  const { categoryId, timestamp } = event.data;
  const dateString = getDateString(timestamp);
  
  // 更新分类查看统计
  let categoryStats = await kvAdapter.get(KV_KEYS.STATS_CATEGORIES) || {
    categories: {},
    daily: {},
    total: 0,
    lastUpdated: Date.now()
  };
  
  categoryStats.categories[categoryId] = (categoryStats.categories[categoryId] || 0) + 1;
  categoryStats.daily[dateString] = (categoryStats.daily[dateString] || 0) + 1;
  categoryStats.total += 1;
  categoryStats.lastUpdated = Date.now();
  
  await kvAdapter.set(KV_KEYS.STATS_CATEGORIES, categoryStats);
}

/**
 * 处理时间统计事件
 * @param event - 时间统计事件
 */
async function processTimeSpentEvent(event: StatsEvent) {
  const { duration, page, timestamp } = event.data;
  const dateString = getDateString(timestamp);
  
  // 更新时间统计
  let timeStats = await kvAdapter.get(KV_KEYS.STATS_TIME) || {
    pages: {},
    daily: {},
    totalTime: 0,
    sessions: 0,
    lastUpdated: Date.now()
  };
  
  timeStats.pages[page] = (timeStats.pages[page] || 0) + duration;
  timeStats.daily[dateString] = (timeStats.daily[dateString] || 0) + duration;
  timeStats.totalTime += duration;
  timeStats.sessions += 1;
  timeStats.lastUpdated = Date.now();
  
  await kvAdapter.set(KV_KEYS.STATS_TIME, timeStats);
}

/**
 * 处理书签添加事件
 * @param event - 书签添加事件
 */
async function processBookmarkAddEvent(event: StatsEvent) {
  const { category, source, timestamp } = event.data;
  const dateString = getDateString(timestamp);
  
  // 更新书签添加统计
  let addStats = await kvAdapter.get(KV_KEYS.STATS_BOOKMARKS) || {
    categories: {},
    sources: {},
    daily: {},
    total: 0,
    lastUpdated: Date.now()
  };
  
  addStats.categories[category] = (addStats.categories[category] || 0) + 1;
  addStats.sources[source] = (addStats.sources[source] || 0) + 1;
  addStats.daily[dateString] = (addStats.daily[dateString] || 0) + 1;
  addStats.total += 1;
  addStats.lastUpdated = Date.now();
  
  await kvAdapter.set(KV_KEYS.STATS_BOOKMARKS, addStats);
}

/**
 * 处理统计事件
 * @param event - 统计事件
 */
async function processStatsEvent(event: StatsEvent) {
  try {
    switch (event.type) {
      case 'click':
        await processClickEvent(event);
        break;
      case 'search':
        await processSearchEvent(event);
        break;
      case 'page_view':
        await processPageViewEvent(event);
        break;
      case 'category_view':
        await processCategoryViewEvent(event);
        break;
      case 'time_spent':
        await processTimeSpentEvent(event);
        break;
      case 'bookmark_add':
        await processBookmarkAddEvent(event);
        break;
      default:
        console.warn(`未知的统计事件类型: ${event.type}`);
    }
  } catch (error) {
    console.error(`处理统计事件失败 (${event.type}):`, error);
    throw error;
  }
}

/**
 * 处理 POST 请求 - 收集统计数据
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📊 API: 收集统计数据');
    
    // 检查 KV 是否可用
    if (!kvAdapter.isKVAvailable()) {
      return createApiResponse(
        { message: '统计功能需要 KV 存储支持' },
        503,
        '统计服务不可用'
      );
    }
    
    // 解析请求数据
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createApiResponse(null, 400, '请求内容类型必须是 application/json');
    }
    
    let statsBatch: StatsBatch;
    try {
      statsBatch = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    // 验证统计数据
    const validation = validateStatsEvents(statsBatch.events);
    if (!validation.isValid) {
      return createApiResponse(
        { errors: validation.errors },
        400,
        '统计数据验证失败'
      );
    }
    
    console.log(`处理统计事件: ${statsBatch.events.length} 个`);
    
    // 处理所有事件
    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };
    
    for (const event of statsBatch.events) {
      try {
        await processStatsEvent(event);
        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          event: event.type,
          error: error.message
        });
      }
    }
    
    console.log(`✅ 统计数据处理完成: ${results.processed} 成功, ${results.failed} 失败`);
    
    return createApiResponse(results, 200, '统计数据收集完成');
    
  } catch (error) {
    console.error('❌ 收集统计数据失败:', error);
    const appError = handleError.generic(error, { operation: 'collect_stats' });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 OPTIONS 请求 - CORS 预检
 */
export const OPTIONS: APIRoute = () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};
