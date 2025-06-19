/**
 * 单个分类 API 端点
 * 支持 GET（获取单个分类）、PUT（更新分类）和 DELETE（删除分类）操作
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { dataManager } from '../../../data/data-manager.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 验证分类更新数据
 * @param data - 更新数据
 * @returns 验证结果
 */
function validateCategoryUpdateData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 对于更新操作，字段是可选的，但如果提供了就要验证格式
  if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim())) {
    errors.push('分类名称必须是非空字符串');
  }
  
  if (data.icon !== undefined && (typeof data.icon !== 'string' || !data.icon.trim())) {
    errors.push('分类图标必须是非空字符串');
  }
  
  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push('分类描述必须是字符串');
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
 * 处理 GET 请求 - 获取单个分类
 */
export const GET: APIRoute = async ({ params, url }) => {
  try {
    const categoryId = params.id;
    console.log(`📂 API: 获取分类详情 - ${categoryId}`);
    
    if (!categoryId) {
      return createApiResponse(null, 400, '分类 ID 是必需的');
    }
    
    // 解析查询参数
    const searchParams = new URLSearchParams(url.search);
    const includeSites = searchParams.get('includeSites') === 'true';
    
    // 获取所有分类并查找指定 ID
    const categories = await dataManager.getCategories();
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!category) {
      return createApiResponse(null, 404, '分类不存在');
    }
    
    let responseData = category;
    
    if (includeSites) {
      // 如果需要包含书签，获取该分类下的所有书签
      const sites = await dataManager.getSitesByCategory(categoryId);
      responseData = {
        ...category,
        sites,
        siteCount: sites.length
      };
    }
    
    console.log(`✅ 找到分类: ${category.name}`);
    return createApiResponse(responseData, 200, '获取分类详情成功');
    
  } catch (error) {
    console.error('❌ 获取分类详情失败:', error);
    const appError = handleError.generic(error, { operation: 'get_category', id: params.id });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 PUT 请求 - 更新分类
 */
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const categoryId = params.id;
    console.log(`📝 API: 更新分类 - ${categoryId}`);
    
    // 检查权限
    if (!checkAdminPermission(request)) {
      return createApiResponse(null, 403, '管理功能未启用或权限不足');
    }
    
    if (!categoryId) {
      return createApiResponse(null, 400, '分类 ID 是必需的');
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
    const validation = validateCategoryUpdateData(updateData);
    if (!validation.isValid) {
      return createApiResponse(
        { errors: validation.errors },
        400,
        '分类数据验证失败'
      );
    }
    
    // 添加更新时间戳
    const finalUpdateData = {
      ...updateData,
      lastModified: Date.now()
    };
    
    // 更新分类
    await dataManager.updateCategory(categoryId, finalUpdateData);
    
    // 获取更新后的分类
    const categories = await dataManager.getCategories(false); // 不使用缓存
    const updatedCategory = categories.find(cat => cat.id === categoryId);
    
    console.log(`✅ 分类更新成功: ${categoryId}`);
    return createApiResponse(updatedCategory, 200, '分类更新成功');
    
  } catch (error) {
    console.error('❌ 更新分类失败:', error);
    
    if (error.type === ErrorType.VALIDATION) {
      return createApiResponse(null, 400, error.getUserMessage());
    }
    
    const appError = handleError.generic(error, { operation: 'update_category', id: params.id });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 DELETE 请求 - 删除分类
 */
export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const categoryId = params.id;
    console.log(`🗑️ API: 删除分类 - ${categoryId}`);
    
    // 检查权限
    if (!checkAdminPermission(request)) {
      return createApiResponse(null, 403, '管理功能未启用或权限不足');
    }
    
    if (!categoryId) {
      return createApiResponse(null, 400, '分类 ID 是必需的');
    }
    
    // 删除分类
    await dataManager.deleteCategory(categoryId);
    
    console.log(`✅ 分类删除成功: ${categoryId}`);
    return createApiResponse(null, 200, '分类删除成功');
    
  } catch (error) {
    console.error('❌ 删除分类失败:', error);
    
    if (error.type === ErrorType.VALIDATION) {
      return createApiResponse(null, 400, error.getUserMessage());
    }
    
    const appError = handleError.generic(error, { operation: 'delete_category', id: params.id });
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
