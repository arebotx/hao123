/**
 * 分类列表 API 端点
 * 支持 GET（获取分类列表）和 POST（创建新分类）操作
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { dataManager } from '../../../data/data-manager.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 验证分类数据
 * @param data - 分类数据
 * @returns 验证结果
 */
function validateCategoryData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.id || typeof data.id !== 'string') {
    errors.push('分类 ID 是必需的且必须是字符串');
  }
  
  if (!data.name || typeof data.name !== 'string') {
    errors.push('分类名称是必需的且必须是字符串');
  }
  
  if (!data.icon || typeof data.icon !== 'string') {
    errors.push('分类图标是必需的且必须是字符串');
  }
  
  // 验证 ID 格式（只允许字母、数字、下划线、连字符）
  if (data.id && !/^[a-zA-Z0-9_-]+$/.test(data.id)) {
    errors.push('分类 ID 只能包含字母、数字、下划线和连字符');
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
 * 处理 GET 请求 - 获取分类列表
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    console.log('📂 API: 获取分类列表');
    
    // 解析查询参数
    const searchParams = new URLSearchParams(url.search);
    const includeStats = searchParams.get('includeStats') === 'true';
    
    // 获取分类列表
    const categories = await dataManager.getCategories();
    
    let responseData;
    
    if (includeStats) {
      // 如果需要统计信息，获取每个分类的书签数量
      const sites = await dataManager.getSites();
      
      responseData = categories.map(category => {
        const siteCount = sites.filter(site => site.category === category.id).length;
        return {
          ...category,
          siteCount
        };
      });
    } else {
      responseData = categories;
    }
    
    console.log(`✅ 返回 ${categories.length} 个分类`);
    return createApiResponse(responseData, 200, '获取分类列表成功');
    
  } catch (error) {
    console.error('❌ 获取分类列表失败:', error);
    const appError = handleError.generic(error, { operation: 'get_categories' });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 POST 请求 - 创建新分类
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📝 API: 创建新分类');
    
    // 检查权限
    if (!checkAdminPermission(request)) {
      return createApiResponse(null, 403, '管理功能未启用或权限不足');
    }
    
    // 解析请求数据
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createApiResponse(null, 400, '请求内容类型必须是 application/json');
    }
    
    let categoryData;
    try {
      categoryData = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    // 验证数据
    const validation = validateCategoryData(categoryData);
    if (!validation.isValid) {
      return createApiResponse(
        { errors: validation.errors },
        400,
        '分类数据验证失败'
      );
    }
    
    // 添加时间戳和默认值
    const newCategory = {
      ...categoryData,
      addDate: Date.now(),
      description: categoryData.description || categoryData.name
    };
    
    // 保存分类
    await dataManager.addCategory(newCategory);
    
    console.log(`✅ 新分类创建成功: ${newCategory.name}`);
    return createApiResponse(newCategory, 201, '分类创建成功');
    
  } catch (error) {
    console.error('❌ 创建分类失败:', error);
    
    // 处理特定错误类型
    if (error.type === ErrorType.VALIDATION) {
      return createApiResponse(null, 400, error.getUserMessage());
    }
    
    const appError = handleError.generic(error, { operation: 'create_category' });
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
