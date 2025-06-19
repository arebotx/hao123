/**
 * AI 智能整理 API 端点
 * 提供基于 Gemini AI 的书签智能分类和整理功能
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { dataManager } from '../../../data/data-manager.js';
import { aiService } from '../../../utils/ai-client.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 整理选项接口
 */
interface OrganizeOptions {
  mode?: 'categorize' | 'generate_categories' | 'smart_merge';
  categories?: string[];
  confidence?: number;
  autoApply?: boolean;
  createNewCategories?: boolean;
}

/**
 * 整理请求接口
 */
interface OrganizeRequest {
  bookmarkIds?: string[];
  options?: OrganizeOptions;
}

/**
 * 验证整理请求数据
 * @param data - 请求数据
 * @returns 验证结果
 */
function validateOrganizeRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('请求数据格式无效');
    return { isValid: false, errors };
  }
  
  if (data.bookmarkIds && !Array.isArray(data.bookmarkIds)) {
    errors.push('书签ID列表必须是数组');
  }
  
  if (data.options) {
    const { mode, confidence, autoApply, createNewCategories } = data.options;
    
    if (mode && !['categorize', 'generate_categories', 'smart_merge'].includes(mode)) {
      errors.push('无效的整理模式');
    }
    
    if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) {
      errors.push('置信度必须是 0-1 之间的数字');
    }
    
    if (autoApply !== undefined && typeof autoApply !== 'boolean') {
      errors.push('自动应用选项必须是布尔值');
    }
    
    if (createNewCategories !== undefined && typeof createNewCategories !== 'boolean') {
      errors.push('创建新分类选项必须是布尔值');
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
 * 过滤书签数据
 * @param sites - 所有书签
 * @param bookmarkIds - 指定的书签ID
 * @returns 过滤后的书签
 */
function filterBookmarks(sites: any[], bookmarkIds?: string[]): any[] {
  if (!bookmarkIds || bookmarkIds.length === 0) {
    return sites;
  }
  
  return sites.filter(site => bookmarkIds.includes(site.id));
}

/**
 * 应用分类建议
 * @param suggestions - 分类建议
 * @param minConfidence - 最小置信度
 * @returns 应用结果
 */
async function applyCategorySuggestions(suggestions: any[], minConfidence: number = 0.7) {
  const results = {
    applied: 0,
    skipped: 0,
    errors: 0,
    details: []
  };
  
  for (const suggestion of suggestions) {
    try {
      if (suggestion.confidence < minConfidence) {
        results.skipped++;
        results.details.push({
          siteId: suggestion.siteId,
          status: 'skipped',
          reason: `置信度过低 (${suggestion.confidence})`
        });
        continue;
      }
      
      // 更新书签分类
      await dataManager.updateSite(suggestion.siteId, {
        category: suggestion.suggestedCategory
      });
      
      results.applied++;
      results.details.push({
        siteId: suggestion.siteId,
        status: 'applied',
        from: suggestion.currentCategory,
        to: suggestion.suggestedCategory
      });
      
    } catch (error) {
      results.errors++;
      results.details.push({
        siteId: suggestion.siteId,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * 处理 GET 请求 - 获取 AI 服务状态
 */
export const GET: APIRoute = async () => {
  try {
    console.log('🤖 API: 获取 AI 服务状态');
    
    const status = aiService.getStatus();
    
    return createApiResponse(status, 200, 'AI 服务状态获取成功');
    
  } catch (error) {
    console.error('❌ 获取 AI 服务状态失败:', error);
    const appError = handleError.generic(error, { operation: 'get_ai_status' });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 POST 请求 - 执行 AI 智能整理
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('🤖 API: 执行 AI 智能整理');
    
    // 检查权限
    if (!checkAdminPermission(request)) {
      return createApiResponse(null, 403, '管理功能未启用或权限不足');
    }
    
    // 检查 AI 服务是否可用
    if (!aiService.isAvailable()) {
      return createApiResponse(
        { 
          available: false,
          reason: 'Gemini AI 服务不可用，请检查 API Key 配置'
        },
        503,
        'AI 服务不可用'
      );
    }
    
    // 解析请求数据
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createApiResponse(null, 400, '请求内容类型必须是 application/json');
    }
    
    let organizeRequest: OrganizeRequest;
    try {
      organizeRequest = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    // 验证请求数据
    const validation = validateOrganizeRequest(organizeRequest);
    if (!validation.isValid) {
      return createApiResponse(
        { errors: validation.errors },
        400,
        'AI 整理请求数据验证失败'
      );
    }
    
    const options: OrganizeOptions = {
      mode: 'categorize',
      confidence: 0.7,
      autoApply: false,
      createNewCategories: false,
      ...organizeRequest.options
    };
    
    console.log('AI 整理选项:', options);
    
    // 获取数据
    const [categories, allSites] = await Promise.all([
      dataManager.getCategories(),
      dataManager.getSites()
    ]);
    
    // 过滤要处理的书签
    const targetBookmarks = filterBookmarks(allSites, organizeRequest.bookmarkIds);
    
    if (targetBookmarks.length === 0) {
      return createApiResponse(null, 400, '没有找到要整理的书签');
    }
    
    console.log(`开始 AI 整理: ${targetBookmarks.length} 个书签`);
    
    let result;
    
    switch (options.mode) {
      case 'categorize':
        // 生成分类建议
        const suggestions = await aiService.categorize(targetBookmarks, categories);
        
        if (options.autoApply) {
          // 自动应用建议
          const applyResult = await applyCategorySuggestions(suggestions, options.confidence);
          result = {
            mode: 'categorize',
            suggestions,
            applied: applyResult,
            totalBookmarks: targetBookmarks.length
          };
        } else {
          // 仅返回建议
          result = {
            mode: 'categorize',
            suggestions,
            totalBookmarks: targetBookmarks.length,
            note: '建议已生成，请手动确认后应用'
          };
        }
        break;
        
      case 'generate_categories':
        // 生成新分类建议
        const newCategories = await aiService.generateCategories(targetBookmarks);
        result = {
          mode: 'generate_categories',
          newCategories,
          totalBookmarks: targetBookmarks.length
        };
        break;
        
      case 'smart_merge':
        // 智能合并（暂未实现）
        result = {
          mode: 'smart_merge',
          message: '智能合并功能正在开发中',
          totalBookmarks: targetBookmarks.length
        };
        break;
        
      default:
        return createApiResponse(null, 400, '不支持的整理模式');
    }
    
    console.log(`✅ AI 整理完成: 模式 ${options.mode}`);
    
    return createApiResponse(result, 200, 'AI 智能整理完成');
    
  } catch (error) {
    console.error('❌ AI 智能整理失败:', error);
    
    if (error.message?.includes('API Key')) {
      return createApiResponse(null, 401, 'Gemini API Key 无效或未配置');
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      return createApiResponse(null, 429, 'AI 服务配额已用完，请稍后重试');
    }
    
    const appError = handleError.generic(error, { operation: 'ai_organize' });
    return createApiResponse(null, 500, appError.getUserMessage());
  }
};

/**
 * 处理 PUT 请求 - 应用分类建议
 */
export const PUT: APIRoute = async ({ request }) => {
  try {
    console.log('🤖 API: 应用分类建议');
    
    // 检查权限
    if (!checkAdminPermission(request)) {
      return createApiResponse(null, 403, '管理功能未启用或权限不足');
    }
    
    // 解析请求数据
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createApiResponse(null, 400, '请求内容类型必须是 application/json');
    }
    
    let applyRequest: { suggestions: any[]; minConfidence?: number };
    try {
      applyRequest = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    if (!Array.isArray(applyRequest.suggestions)) {
      return createApiResponse(null, 400, '分类建议必须是数组');
    }
    
    const minConfidence = applyRequest.minConfidence || 0.7;
    
    // 应用分类建议
    const result = await applyCategorySuggestions(applyRequest.suggestions, minConfidence);
    
    console.log(`✅ 分类建议应用完成: ${result.applied} 个成功, ${result.errors} 个失败`);
    
    return createApiResponse(result, 200, '分类建议应用完成');
    
  } catch (error) {
    console.error('❌ 应用分类建议失败:', error);
    const appError = handleError.generic(error, { operation: 'apply_suggestions' });
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};
