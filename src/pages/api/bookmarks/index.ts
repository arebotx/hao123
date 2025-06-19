/**
 * 书签列表 API 端点
 * 支持 GET（获取书签列表）和 POST（创建新书签）操作
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { dataManager } from '../../../data/data-manager.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 验证书签数据
 * @param data - 书签数据
 * @returns 验证结果
 */
function validateBookmarkData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.id || typeof data.id !== 'string') {
    errors.push('书签 ID 是必需的且必须是字符串');
  }
  
  if (!data.title || typeof data.title !== 'string') {
    errors.push('书签标题是必需的且必须是字符串');
  }
  
  if (!data.url || typeof data.url !== 'string') {
    errors.push('书签 URL 是必需的且必须是字符串');
  }
  
  if (!data.category || typeof data.category !== 'string') {
    errors.push('书签分类是必需的且必须是字符串');
  }
  
  // 验证 URL 格式
  if (data.url) {
    try {
      new URL(data.url);
    } catch {
      errors.push('书签 URL 格式无效');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 检查管理权限
 * @param request - 请求对象
 * @returns 是否有权限
 */
function checkAdminPermission(request: Request): boolean {
  // 检查环境变量是否启用管理功能
  const isAdminEnabled = import.meta.env.ENABLE_ADMIN === 'true';
  if (!isAdminEnabled) {
    return false;
  }
  
  // 这里可以添加更复杂的权限验证逻辑
  // 例如检查 Authorization header、session 等
  
  return true;
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
 * 处理 GET 请求 - 获取书签列表
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    console.log('📖 API: 获取书签列表');
    
    // 解析查询参数
    const searchParams = new URLSearchParams(url.search);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '0');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let sites;
    
    if (search) {
      // 搜索书签
      sites = await dataManager.searchSites(search);
    } else if (category) {
      // 按分类获取书签
      sites = await dataManager.getSitesByCategory(category);
    } else {
      // 获取所有书签
      sites = await dataManager.getSites();
    }
    
    // 分页处理
    let paginatedSites = sites;
    if (limit > 0) {
      const start = offset;
      const end = start + limit;
      paginatedSites = sites.slice(start, end);
    }
    
    const responseData = {
      sites: paginatedSites,
      total: sites.length,
      limit,
      offset,
      hasMore: limit > 0 && (offset + limit) < sites.length
    };
    
    console.log(`✅ 返回 ${paginatedSites.length} 个书签`);
    return createApiResponse(responseData, 200, '获取书签列表成功');
    
  } catch (error) {
    console.error('❌ 获取书签列表失败:', error);
    const appError = handleError.generic(error, { operation: 'get_bookmarks' });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 POST 请求 - 创建新书签
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📝 API: 创建新书签');
    
    // 检查权限
    if (!checkAdminPermission(request)) {
      return createApiResponse(null, 403, '管理功能未启用或权限不足');
    }
    
    // 解析请求数据
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createApiResponse(null, 400, '请求内容类型必须是 application/json');
    }
    
    let bookmarkData;
    try {
      bookmarkData = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    // 验证数据
    const validation = validateBookmarkData(bookmarkData);
    if (!validation.isValid) {
      return createApiResponse(
        { errors: validation.errors },
        400,
        '书签数据验证失败'
      );
    }
    
    // 添加时间戳和默认值
    const newBookmark = {
      ...bookmarkData,
      icon: bookmarkData.icon || '/images/default.svg',
      description: bookmarkData.description || bookmarkData.title,
      shortDesc: bookmarkData.shortDesc || bookmarkData.title,
      addDate: Date.now()
    };
    
    // 保存书签
    await dataManager.addSite(newBookmark);
    
    console.log(`✅ 新书签创建成功: ${newBookmark.title}`);
    return createApiResponse(newBookmark, 201, '书签创建成功');
    
  } catch (error) {
    console.error('❌ 创建书签失败:', error);
    
    // 处理特定错误类型
    if (error.type === ErrorType.VALIDATION) {
      return createApiResponse(null, 400, error.getUserMessage());
    }
    
    const appError = handleError.generic(error, { operation: 'create_bookmark' });
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
