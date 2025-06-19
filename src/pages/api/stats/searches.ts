/**
 * 搜索统计 API 端点
 * 支持 GET（获取搜索统计）和 POST（记录搜索事件）操作
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { kvAdapter, KV_KEYS } from '../../../data/kv-adapter.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 搜索统计数据结构
 * @typedef {Object} SearchStats
 * @property {Object} keywords - 搜索关键词统计
 * @property {Object} daily - 每日搜索统计
 * @property {Object} results - 搜索结果数量统计
 * @property {number} total - 总搜索次数
 * @property {number} lastUpdated - 最后更新时间
 */

/**
 * 验证搜索事件数据
 * @param data - 搜索事件数据
 * @returns 验证结果
 */
function validateSearchEventData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.query || typeof data.query !== 'string') {
    errors.push('搜索关键词是必需的且必须是字符串');
  }
  
  if (data.resultCount !== undefined && (typeof data.resultCount !== 'number' || data.resultCount < 0)) {
    errors.push('搜索结果数量必须是非负数');
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
 * 初始化搜索统计数据
 * @returns 初始统计数据
 */
function initializeSearchStats() {
  return {
    keywords: {},
    daily: {},
    results: {
      noResults: 0,
      hasResults: 0
    },
    total: 0,
    lastUpdated: Date.now()
  };
}

/**
 * 标准化搜索关键词
 * @param query - 原始搜索关键词
 * @returns 标准化后的关键词
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

/**
 * 处理 GET 请求 - 获取搜索统计
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    console.log('🔍 API: 获取搜索统计');
    
    // 解析查询参数
    const searchParams = new URLSearchParams(url.search);
    const type = searchParams.get('type') || 'all'; // all, keywords, daily, results
    const limit = parseInt(searchParams.get('limit') || '20');
    const days = parseInt(searchParams.get('days') || '30');
    
    // 检查 KV 是否可用
    if (!kvAdapter.isKVAvailable()) {
      return createApiResponse(
        { message: '统计功能需要 KV 存储支持' },
        503,
        '统计服务不可用'
      );
    }
    
    // 获取搜索统计数据
    let searchStats = await kvAdapter.get(KV_KEYS.STATS_SEARCHES);
    if (!searchStats) {
      searchStats = initializeSearchStats();
    }
    
    let responseData;
    
    switch (type) {
      case 'keywords':
        // 返回热门搜索关键词
        const keywordEntries = Object.entries(searchStats.keywords || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, limit);
        responseData = {
          keywords: Object.fromEntries(keywordEntries),
          total: searchStats.total
        };
        break;
        
      case 'daily':
        // 返回最近几天的搜索统计
        const now = Date.now();
        const dailyStats = {};
        for (let i = 0; i < days; i++) {
          const date = getDateString(now - i * 24 * 60 * 60 * 1000);
          dailyStats[date] = searchStats.daily[date] || 0;
        }
        responseData = {
          daily: dailyStats,
          total: searchStats.total
        };
        break;
        
      case 'results':
        // 返回搜索结果统计
        responseData = {
          results: searchStats.results,
          total: searchStats.total,
          successRate: searchStats.total > 0 
            ? (searchStats.results.hasResults / searchStats.total * 100).toFixed(2) + '%'
            : '0%'
        };
        break;
        
      default:
        // 返回完整搜索统计数据
        responseData = {
          ...searchStats,
          topKeywords: Object.entries(searchStats.keywords || {})
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, limit),
          successRate: searchStats.total > 0 
            ? (searchStats.results.hasResults / searchStats.total * 100).toFixed(2) + '%'
            : '0%'
        };
    }
    
    console.log(`✅ 返回搜索统计数据，类型: ${type}`);
    return createApiResponse(responseData, 200, '获取搜索统计成功');
    
  } catch (error) {
    console.error('❌ 获取搜索统计失败:', error);
    const appError = handleError.generic(error, { operation: 'get_search_stats' });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 POST 请求 - 记录搜索事件
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📝 API: 记录搜索事件');
    
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
    
    let searchData;
    try {
      searchData = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    // 验证数据
    const validation = validateSearchEventData(searchData);
    if (!validation.isValid) {
      return createApiResponse(
        { errors: validation.errors },
        400,
        '搜索事件数据验证失败'
      );
    }
    
    const { query, resultCount = 0, timestamp = Date.now() } = searchData;
    const normalizedQuery = normalizeQuery(query);
    const dateString = getDateString(timestamp);
    
    // 获取现有统计数据
    let searchStats = await kvAdapter.get(KV_KEYS.STATS_SEARCHES);
    if (!searchStats) {
      searchStats = initializeSearchStats();
    }
    
    // 更新统计数据
    searchStats.keywords[normalizedQuery] = (searchStats.keywords[normalizedQuery] || 0) + 1;
    searchStats.daily[dateString] = (searchStats.daily[dateString] || 0) + 1;
    
    // 更新搜索结果统计
    if (resultCount > 0) {
      searchStats.results.hasResults += 1;
    } else {
      searchStats.results.noResults += 1;
    }
    
    searchStats.total += 1;
    searchStats.lastUpdated = Date.now();
    
    // 保存更新后的统计数据
    await kvAdapter.set(KV_KEYS.STATS_SEARCHES, searchStats);
    
    console.log(`✅ 搜索事件记录成功: "${normalizedQuery}" (${resultCount} 个结果)`);
    return createApiResponse(
      {
        query: normalizedQuery,
        resultCount,
        newCount: searchStats.keywords[normalizedQuery],
        totalSearches: searchStats.total
      },
      200,
      '搜索事件记录成功'
    );
    
  } catch (error) {
    console.error('❌ 记录搜索事件失败:', error);
    const appError = handleError.generic(error, { operation: 'record_search' });
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
