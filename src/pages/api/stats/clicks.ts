/**
 * 点击统计 API 端点
 * 支持 GET（获取点击统计）和 POST（记录点击事件）操作
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { kvAdapter, KV_KEYS } from '../../../data/kv-adapter.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 点击统计数据结构
 * @typedef {Object} ClickStats
 * @property {Object} sites - 网站点击统计
 * @property {Object} categories - 分类点击统计
 * @property {Object} daily - 每日点击统计
 * @property {number} total - 总点击数
 * @property {number} lastUpdated - 最后更新时间
 */

/**
 * 验证点击事件数据
 * @param data - 点击事件数据
 * @returns 验证结果
 */
function validateClickEventData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.siteId || typeof data.siteId !== 'string') {
    errors.push('网站 ID 是必需的且必须是字符串');
  }
  
  if (!data.category || typeof data.category !== 'string') {
    errors.push('分类是必需的且必须是字符串');
  }
  
  if (data.timestamp && (typeof data.timestamp !== 'number' || data.timestamp <= 0)) {
    errors.push('时间戳必须是正数');
  }
  
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
 * 初始化点击统计数据
 * @returns 初始统计数据
 */
function initializeClickStats() {
  return {
    sites: {},
    categories: {},
    daily: {},
    total: 0,
    lastUpdated: Date.now()
  };
}

/**
 * 处理 GET 请求 - 获取点击统计
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    console.log('📊 API: 获取点击统计');
    
    // 解析查询参数
    const searchParams = new URLSearchParams(url.search);
    const type = searchParams.get('type') || 'all'; // all, sites, categories, daily
    const limit = parseInt(searchParams.get('limit') || '10');
    const days = parseInt(searchParams.get('days') || '30');
    
    // 检查 KV 是否可用
    if (!kvAdapter.isKVAvailable()) {
      return createApiResponse(
        { message: '统计功能需要 KV 存储支持' },
        503,
        '统计服务不可用'
      );
    }
    
    // 获取点击统计数据
    let clickStats = await kvAdapter.get(KV_KEYS.STATS_CLICKS);
    if (!clickStats) {
      clickStats = initializeClickStats();
    }
    
    let responseData;
    
    switch (type) {
      case 'sites':
        // 返回网站点击排行
        const siteEntries = Object.entries(clickStats.sites || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, limit);
        responseData = {
          sites: Object.fromEntries(siteEntries),
          total: clickStats.total
        };
        break;
        
      case 'categories':
        // 返回分类点击排行
        const categoryEntries = Object.entries(clickStats.categories || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, limit);
        responseData = {
          categories: Object.fromEntries(categoryEntries),
          total: clickStats.total
        };
        break;
        
      case 'daily':
        // 返回最近几天的点击统计
        const now = Date.now();
        const dailyStats = {};
        for (let i = 0; i < days; i++) {
          const date = getDateString(now - i * 24 * 60 * 60 * 1000);
          dailyStats[date] = clickStats.daily[date] || 0;
        }
        responseData = {
          daily: dailyStats,
          total: clickStats.total
        };
        break;
        
      default:
        // 返回完整统计数据
        responseData = {
          ...clickStats,
          topSites: Object.entries(clickStats.sites || {})
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, limit),
          topCategories: Object.entries(clickStats.categories || {})
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, limit)
        };
    }
    
    console.log(`✅ 返回点击统计数据，类型: ${type}`);
    return createApiResponse(responseData, 200, '获取点击统计成功');
    
  } catch (error) {
    console.error('❌ 获取点击统计失败:', error);
    const appError = handleError.generic(error, { operation: 'get_click_stats' });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 POST 请求 - 记录点击事件
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📝 API: 记录点击事件');
    
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
    
    let clickData;
    try {
      clickData = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    // 验证数据
    const validation = validateClickEventData(clickData);
    if (!validation.isValid) {
      return createApiResponse(
        { errors: validation.errors },
        400,
        '点击事件数据验证失败'
      );
    }
    
    const { siteId, category, timestamp = Date.now() } = clickData;
    const dateString = getDateString(timestamp);
    
    // 获取现有统计数据
    let clickStats = await kvAdapter.get(KV_KEYS.STATS_CLICKS);
    if (!clickStats) {
      clickStats = initializeClickStats();
    }
    
    // 更新统计数据
    clickStats.sites[siteId] = (clickStats.sites[siteId] || 0) + 1;
    clickStats.categories[category] = (clickStats.categories[category] || 0) + 1;
    clickStats.daily[dateString] = (clickStats.daily[dateString] || 0) + 1;
    clickStats.total += 1;
    clickStats.lastUpdated = Date.now();
    
    // 保存更新后的统计数据
    await kvAdapter.set(KV_KEYS.STATS_CLICKS, clickStats);
    
    console.log(`✅ 点击事件记录成功: ${siteId} (${category})`);
    return createApiResponse(
      {
        siteId,
        category,
        newCount: clickStats.sites[siteId],
        totalClicks: clickStats.total
      },
      200,
      '点击事件记录成功'
    );
    
  } catch (error) {
    console.error('❌ 记录点击事件失败:', error);
    const appError = handleError.generic(error, { operation: 'record_click' });
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};
