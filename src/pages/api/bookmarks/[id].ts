/**
 * 单个书签 API 端点
 * 支持 GET（获取单个书签）、PUT（更新书签）和 DELETE（删除书签）操作
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { dataManager } from '../../../data/data-manager.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 验证书签更新数据
 * @param data - 更新数据
 * @returns 验证结果
 */
function validateBookmarkUpdateData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 对于更新操作，字段是可选的，但如果提供了就要验证格式
  if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim())) {
    errors.push('书签标题必须是非空字符串');
  }
  
  if (data.url !== undefined) {
    if (typeof data.url !== 'string' || !data.url.trim()) {
      errors.push('书签 URL 必须是非空字符串');
    } else {
      try {
        new URL(data.url);
      } catch {
        errors.push('书签 URL 格式无效');
      }
    }
  }
  
  if (data.category !== undefined && (typeof data.category !== 'string' || !data.category.trim())) {
    errors.push('书签分类必须是非空字符串');
  }
  
  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push('书签描述必须是字符串');
  }
  
  if (data.shortDesc !== undefined && typeof data.shortDesc !== 'string') {
    errors.push('书签简短描述必须是字符串');
  }
  
  if (data.icon !== undefined && typeof data.icon !== 'string') {
    errors.push('书签图标必须是字符串');
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
  const isAdminEnabled = import.meta.env.ENABLE_ADMIN === 'true';
  if (!isAdminEnabled) {
    return false;
  }
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
 * 处理 GET 请求 - 获取单个书签
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    const bookmarkId = params.id;
    console.log(`📖 API: 获取书签详情 - ${bookmarkId}`);
    
    if (!bookmarkId) {
      return createApiResponse(null, 400, '书签 ID 是必需的');
    }
    
    // 获取所有书签并查找指定 ID
    const sites = await dataManager.getSites();
    const bookmark = sites.find(site => site.id === bookmarkId);
    
    if (!bookmark) {
      return createApiResponse(null, 404, '书签不存在');
    }
    
    console.log(`✅ 找到书签: ${bookmark.title}`);
    return createApiResponse(bookmark, 200, '获取书签详情成功');
    
  } catch (error) {
    console.error('❌ 获取书签详情失败:', error);
    const appError = handleError.generic(error, { operation: 'get_bookmark', id: params.id });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 PUT 请求 - 更新书签
 */
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const bookmarkId = params.id;
    console.log(`📝 API: 更新书签 - ${bookmarkId}`);
    
    // 检查权限
    if (!checkAdminPermission(request)) {
      return createApiResponse(null, 403, '管理功能未启用或权限不足');
    }
    
    if (!bookmarkId) {
      return createApiResponse(null, 400, '书签 ID 是必需的');
    }
    
    // 解析请求数据
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createApiResponse(null, 400, '请求内容类型必须是 application/json');
    }
    
    let updateData;
    try {
      updateData = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    // 验证更新数据
    const validation = validateBookmarkUpdateData(updateData);
    if (!validation.isValid) {
      return createApiResponse(
        { errors: validation.errors },
        400,
        '书签数据验证失败'
      );
    }
    
    // 添加更新时间戳
    const finalUpdateData = {
      ...updateData,
      lastModified: Date.now()
    };
    
    // 更新书签
    await dataManager.updateSite(bookmarkId, finalUpdateData);
    
    // 获取更新后的书签
    const sites = await dataManager.getSites(false); // 不使用缓存
    const updatedBookmark = sites.find(site => site.id === bookmarkId);
    
    console.log(`✅ 书签更新成功: ${bookmarkId}`);
    return createApiResponse(updatedBookmark, 200, '书签更新成功');
    
  } catch (error) {
    console.error('❌ 更新书签失败:', error);
    
    if (error.type === ErrorType.VALIDATION) {
      return createApiResponse(null, 400, error.getUserMessage());
    }
    
    const appError = handleError.generic(error, { operation: 'update_bookmark', id: params.id });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 DELETE 请求 - 删除书签
 */
export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const bookmarkId = params.id;
    console.log(`🗑️ API: 删除书签 - ${bookmarkId}`);
    
    // 检查权限
    if (!checkAdminPermission(request)) {
      return createApiResponse(null, 403, '管理功能未启用或权限不足');
    }
    
    if (!bookmarkId) {
      return createApiResponse(null, 400, '书签 ID 是必需的');
    }
    
    // 删除书签
    await dataManager.deleteSite(bookmarkId);
    
    console.log(`✅ 书签删除成功: ${bookmarkId}`);
    return createApiResponse(null, 200, '书签删除成功');
    
  } catch (error) {
    console.error('❌ 删除书签失败:', error);
    
    if (error.type === ErrorType.VALIDATION) {
      return createApiResponse(null, 400, error.getUserMessage());
    }
    
    const appError = handleError.generic(error, { operation: 'delete_bookmark', id: params.id });
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
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};
