/**
 * 统计概览 API 端点
 * 提供系统整体统计数据的概览信息
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { kvAdapter, KV_KEYS } from '../../../data/kv-adapter.js';
import { dataManager } from '../../../data/data-manager.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 统计概览数据结构
 * @typedef {Object} StatsOverview
 * @property {Object} content - 内容统计
 * @property {Object} usage - 使用统计
 * @property {Object} trends - 趋势统计
 * @property {Object} system - 系统信息
 * @property {number} lastUpdated - 最后更新时间
 */

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
      'Cache-Control': 'max-age=300' // 5分钟缓存
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
 * 计算趋势百分比
 * @param current - 当前值
 * @param previous - 之前值
 * @returns 趋势百分比
 */
function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * 获取内容统计
 * @returns 内容统计数据
 */
async function getContentStats() {
  try {
    const categories = await dataManager.getCategories();
    const sites = await dataManager.getSites();
    
    // 按分类统计网站数量
    const sitesByCategory = {};
    sites.forEach(site => {
      sitesByCategory[site.category] = (sitesByCategory[site.category] || 0) + 1;
    });
    
    return {
      totalCategories: categories.length,
      totalSites: sites.length,
      averageSitesPerCategory: Math.round(sites.length / categories.length),
      sitesByCategory,
      mostPopularCategory: Object.entries(sitesByCategory)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || null
    };
  } catch (error) {
    console.warn('获取内容统计失败:', error);
    return {
      totalCategories: 0,
      totalSites: 0,
      averageSitesPerCategory: 0,
      sitesByCategory: {},
      mostPopularCategory: null
    };
  }
}

/**
 * 获取使用统计
 * @returns 使用统计数据
 */
async function getUsageStats() {
  try {
    if (!kvAdapter.isKVAvailable()) {
      return {
        totalClicks: 0,
        totalSearches: 0,
        clicksToday: 0,
        searchesToday: 0,
        topSite: null,
        topKeyword: null
      };
    }
    
    const clickStats = await kvAdapter.get(KV_KEYS.STATS_CLICKS) || {};
    const searchStats = await kvAdapter.get(KV_KEYS.STATS_SEARCHES) || {};
    
    const today = getDateString(Date.now());
    
    // 获取今日统计
    const clicksToday = clickStats.daily?.[today] || 0;
    const searchesToday = searchStats.daily?.[today] || 0;
    
    // 获取热门网站和关键词
    const topSiteEntry = Object.entries(clickStats.sites || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];
    const topKeywordEntry = Object.entries(searchStats.keywords || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];
    
    return {
      totalClicks: clickStats.total || 0,
      totalSearches: searchStats.total || 0,
      clicksToday,
      searchesToday,
      topSite: topSiteEntry ? { id: topSiteEntry[0], clicks: topSiteEntry[1] } : null,
      topKeyword: topKeywordEntry ? { keyword: topKeywordEntry[0], count: topKeywordEntry[1] } : null,
      searchSuccessRate: searchStats.total > 0 
        ? Math.round((searchStats.results?.hasResults || 0) / searchStats.total * 100)
        : 0
    };
  } catch (error) {
    console.warn('获取使用统计失败:', error);
    return {
      totalClicks: 0,
      totalSearches: 0,
      clicksToday: 0,
      searchesToday: 0,
      topSite: null,
      topKeyword: null,
      searchSuccessRate: 0
    };
  }
}

/**
 * 获取趋势统计
 * @returns 趋势统计数据
 */
async function getTrendStats() {
  try {
    if (!kvAdapter.isKVAvailable()) {
      return {
        clickTrend: 0,
        searchTrend: 0,
        weeklyClicks: [],
        weeklySearches: []
      };
    }
    
    const clickStats = await kvAdapter.get(KV_KEYS.STATS_CLICKS) || {};
    const searchStats = await kvAdapter.get(KV_KEYS.STATS_SEARCHES) || {};
    
    const now = Date.now();
    const today = getDateString(now);
    const yesterday = getDateString(now - 24 * 60 * 60 * 1000);
    
    // 计算趋势
    const clicksToday = clickStats.daily?.[today] || 0;
    const clicksYesterday = clickStats.daily?.[yesterday] || 0;
    const searchesToday = searchStats.daily?.[today] || 0;
    const searchesYesterday = searchStats.daily?.[yesterday] || 0;
    
    const clickTrend = calculateTrend(clicksToday, clicksYesterday);
    const searchTrend = calculateTrend(searchesToday, searchesYesterday);
    
    // 获取最近7天的数据
    const weeklyClicks = [];
    const weeklySearches = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = getDateString(now - i * 24 * 60 * 60 * 1000);
      weeklyClicks.push({
        date,
        count: clickStats.daily?.[date] || 0
      });
      weeklySearches.push({
        date,
        count: searchStats.daily?.[date] || 0
      });
    }
    
    return {
      clickTrend,
      searchTrend,
      weeklyClicks,
      weeklySearches
    };
  } catch (error) {
    console.warn('获取趋势统计失败:', error);
    return {
      clickTrend: 0,
      searchTrend: 0,
      weeklyClicks: [],
      weeklySearches: []
    };
  }
}

/**
 * 获取系统信息
 * @returns 系统信息
 */
async function getSystemInfo() {
  try {
    const dataSourceInfo = dataManager.getDataSourceInfo();
    const metadata = await dataManager.getMetadata();
    
    return {
      dataSource: dataSourceInfo.source,
      kvAvailable: dataSourceInfo.isKVAvailable,
      lastDataUpdate: metadata.categories?.lastUpdated || metadata.sites?.lastUpdated || null,
      version: '1.0.0',
      environment: import.meta.env.MODE || 'production'
    };
  } catch (error) {
    console.warn('获取系统信息失败:', error);
    return {
      dataSource: 'static',
      kvAvailable: false,
      lastDataUpdate: null,
      version: '1.0.0',
      environment: 'unknown'
    };
  }
}

/**
 * 处理 GET 请求 - 获取统计概览
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    console.log('📊 API: 获取统计概览');
    
    // 解析查询参数
    const searchParams = new URLSearchParams(url.search);
    const includeDetails = searchParams.get('details') === 'true';
    
    // 并行获取各种统计数据
    const [contentStats, usageStats, trendStats, systemInfo] = await Promise.all([
      getContentStats(),
      getUsageStats(),
      getTrendStats(),
      getSystemInfo()
    ]);
    
    const overview = {
      content: contentStats,
      usage: usageStats,
      trends: trendStats,
      system: systemInfo,
      lastUpdated: Date.now()
    };
    
    // 如果不需要详细信息，返回简化版本
    if (!includeDetails) {
      const summary = {
        totalCategories: contentStats.totalCategories,
        totalSites: contentStats.totalSites,
        totalClicks: usageStats.totalClicks,
        totalSearches: usageStats.totalSearches,
        clicksToday: usageStats.clicksToday,
        searchesToday: usageStats.searchesToday,
        dataSource: systemInfo.dataSource,
        lastUpdated: overview.lastUpdated
      };
      
      console.log('✅ 返回统计概览（简化版）');
      return createApiResponse(summary, 200, '获取统计概览成功');
    }
    
    console.log('✅ 返回完整统计概览');
    return createApiResponse(overview, 200, '获取统计概览成功');
    
  } catch (error) {
    console.error('❌ 获取统计概览失败:', error);
    const appError = handleError.generic(error, { operation: 'get_stats_overview' });
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};
