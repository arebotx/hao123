/**
 * Chrome 书签导出 API 端点
 * 将系统中的书签数据导出为 Chrome 兼容的 HTML 格式
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { dataManager } from '../../../data/data-manager.js';
import { parseBookmarks } from '../../../utils/bookmark-parser.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 导出选项接口
 */
interface ExportOptions {
  includeIcons?: boolean;
  format?: 'chrome' | 'firefox' | 'safari';
  categories?: string[];
  dateRange?: {
    start?: number;
    end?: number;
  };
}

/**
 * 创建标准化的 API 响应
 * @param data - 响应数据
 * @param status - HTTP 状态码
 * @param message - 响应消息
 * @param contentType - 内容类型
 * @returns Response 对象
 */
function createApiResponse(data: any = null, status: number = 200, message?: string, contentType: string = 'application/json') {
  if (contentType === 'text/html') {
    return new Response(data, {
      status,
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Content-Disposition': 'attachment; filename="bookmarks.html"',
        'Cache-Control': 'no-cache'
      }
    });
  }

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
 * 转换为 Chrome 书签格式
 * @param categories - 分类数据
 * @param sites - 书签数据
 * @param options - 导出选项
 * @returns Chrome 格式的分类数据
 */
function convertToChromeFormat(categories: any[], sites: any[], options: ExportOptions) {
  const chromeCategories = [];
  
  for (const category of categories) {
    // 过滤分类（如果指定了特定分类）
    if (options.categories && options.categories.length > 0) {
      if (!options.categories.includes(category.id)) {
        continue;
      }
    }
    
    // 获取该分类下的书签
    const categorySites = sites.filter(site => site.category === category.id);
    
    // 过滤日期范围（如果指定了）
    let filteredSites = categorySites;
    if (options.dateRange) {
      filteredSites = categorySites.filter(site => {
        const siteDate = site.addDate || 0;
        const start = options.dateRange?.start || 0;
        const end = options.dateRange?.end || Date.now();
        return siteDate >= start && siteDate <= end;
      });
    }
    
    if (filteredSites.length === 0) {
      continue; // 跳过空分类
    }
    
    // 转换书签格式
    const chromeSites = filteredSites.map(site => ({
      title: site.title,
      url: site.url,
      description: site.description || site.shortDesc || site.title,
      icon: options.includeIcons ? (site.icon || '') : '',
      addDate: site.addDate || Date.now(),
      category: category.name
    }));
    
    chromeCategories.push({
      name: category.name,
      icon: category.icon || '📁',
      sites: chromeSites,
      addDate: category.addDate || Date.now()
    });
  }
  
  return chromeCategories;
}

/**
 * 生成导出统计信息
 * @param categories - 分类数据
 * @returns 统计信息
 */
function generateExportStats(categories: any[]) {
  const totalCategories = categories.length;
  const totalSites = categories.reduce((sum, cat) => sum + cat.sites.length, 0);
  const categoriesWithSites = categories.filter(cat => cat.sites.length > 0).length;
  
  return {
    totalCategories,
    totalSites,
    categoriesWithSites,
    exportDate: new Date().toISOString(),
    format: 'chrome_html'
  };
}

/**
 * 处理 GET 请求 - 导出 Chrome 书签
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    console.log('📤 API: 导出 Chrome 书签');
    
    // 解析查询参数
    const searchParams = new URLSearchParams(url.search);
    const format = searchParams.get('format') || 'html';
    const includeIcons = searchParams.get('includeIcons') !== 'false';
    const categoriesParam = searchParams.get('categories');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const options: ExportOptions = {
      includeIcons,
      format: 'chrome',
      categories: categoriesParam ? categoriesParam.split(',') : undefined,
      dateRange: {
        start: startDate ? parseInt(startDate) : undefined,
        end: endDate ? parseInt(endDate) : undefined
      }
    };
    
    console.log('导出选项:', options);
    
    // 获取数据
    const [categories, sites] = await Promise.all([
      dataManager.getCategories(),
      dataManager.getSites()
    ]);
    
    if (categories.length === 0) {
      return createApiResponse(null, 404, '没有找到可导出的分类数据');
    }
    
    if (sites.length === 0) {
      return createApiResponse(null, 404, '没有找到可导出的书签数据');
    }
    
    // 转换为 Chrome 格式
    const chromeCategories = convertToChromeFormat(categories, sites, options);
    
    if (chromeCategories.length === 0) {
      return createApiResponse(null, 404, '根据筛选条件没有找到可导出的数据');
    }
    
    // 生成统计信息
    const stats = generateExportStats(chromeCategories);
    console.log('导出统计:', stats);
    
    if (format === 'json') {
      // 返回 JSON 格式（用于调试或其他用途）
      return createApiResponse({
        categories: chromeCategories,
        stats,
        options
      }, 200, '书签数据导出成功（JSON格式）');
    }
    
    // 生成 Chrome HTML 格式
    const htmlContent = parseBookmarks.exportChrome(chromeCategories);
    
    console.log(`✅ 导出完成: ${stats.totalSites} 个书签, ${stats.totalCategories} 个分类`);
    
    // 返回 HTML 文件
    return createApiResponse(htmlContent, 200, undefined, 'text/html');
    
  } catch (error) {
    console.error('❌ 导出 Chrome 书签失败:', error);
    const appError = handleError.generic(error, { operation: 'export_chrome_bookmarks' });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 POST 请求 - 自定义导出选项
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📤 API: 自定义导出 Chrome 书签');
    
    // 解析请求数据
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createApiResponse(null, 400, '请求内容类型必须是 application/json');
    }
    
    let exportOptions: ExportOptions;
    try {
      exportOptions = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    // 设置默认选项
    const options: ExportOptions = {
      includeIcons: true,
      format: 'chrome',
      ...exportOptions
    };
    
    console.log('自定义导出选项:', options);
    
    // 获取数据
    const [categories, sites] = await Promise.all([
      dataManager.getCategories(),
      dataManager.getSites()
    ]);
    
    if (categories.length === 0 || sites.length === 0) {
      return createApiResponse(null, 404, '没有找到可导出的数据');
    }
    
    // 转换为 Chrome 格式
    const chromeCategories = convertToChromeFormat(categories, sites, options);
    
    if (chromeCategories.length === 0) {
      return createApiResponse(null, 404, '根据筛选条件没有找到可导出的数据');
    }
    
    // 生成统计信息
    const stats = generateExportStats(chromeCategories);
    
    // 生成 Chrome HTML 格式
    const htmlContent = parseBookmarks.exportChrome(chromeCategories);
    
    console.log(`✅ 自定义导出完成: ${stats.totalSites} 个书签, ${stats.totalCategories} 个分类`);
    
    // 返回导出结果
    return createApiResponse({
      htmlContent,
      stats,
      options
    }, 200, '自定义书签导出成功');
    
  } catch (error) {
    console.error('❌ 自定义导出 Chrome 书签失败:', error);
    const appError = handleError.generic(error, { operation: 'custom_export_chrome_bookmarks' });
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
