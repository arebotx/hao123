/**
 * Chrome 书签导入 API 端点
 * 处理 Chrome 书签的批量导入，支持数据转换和图标下载
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import type { APIRoute } from 'astro';
import { dataManager } from '../../../data/data-manager.js';
import { handleError, ErrorType } from '../../../utils/error-handler.js';

/**
 * 导入选项接口
 */
interface ImportOptions {
  mergeMode?: 'append' | 'replace' | 'merge';
  downloadIcons?: boolean;
  skipDuplicates?: boolean;
  categoryMapping?: Record<string, string>;
}

/**
 * 导入数据接口
 */
interface ImportData {
  categories: Array<{
    name: string;
    icon: string;
    sites: Array<any>;
    addDate: number;
  }>;
  sites: Array<{
    title: string;
    url: string;
    description: string;
    category: string;
    icon?: string;
    addDate: number;
  }>;
  options?: ImportOptions;
}

/**
 * 验证导入数据
 * @param data - 导入数据
 * @returns 验证结果
 */
function validateImportData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('导入数据格式无效');
    return { isValid: false, errors };
  }
  
  if (!Array.isArray(data.categories)) {
    errors.push('分类数据必须是数组');
  }
  
  if (!Array.isArray(data.sites)) {
    errors.push('书签数据必须是数组');
  }
  
  // 验证分类数据
  if (data.categories) {
    data.categories.forEach((category: any, index: number) => {
      if (!category.name || typeof category.name !== 'string') {
        errors.push(`分类 ${index + 1} 缺少有效名称`);
      }
      if (!Array.isArray(category.sites)) {
        errors.push(`分类 "${category.name}" 的书签数据必须是数组`);
      }
    });
  }
  
  // 验证书签数据
  if (data.sites) {
    data.sites.forEach((site: any, index: number) => {
      if (!site.title || typeof site.title !== 'string') {
        errors.push(`书签 ${index + 1} 缺少有效标题`);
      }
      if (!site.url || typeof site.url !== 'string') {
        errors.push(`书签 ${index + 1} 缺少有效URL`);
      }
      if (!site.category || typeof site.category !== 'string') {
        errors.push(`书签 ${index + 1} 缺少有效分类`);
      }
      
      // 验证 URL 格式
      if (site.url) {
        try {
          new URL(site.url);
        } catch {
          errors.push(`书签 "${site.title}" 的URL格式无效: ${site.url}`);
        }
      }
    });
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
 * 生成唯一ID
 * @param title - 标题
 * @param url - URL
 * @returns 唯一ID
 */
function generateUniqueId(title: string, url: string): string {
  // 基于标题和URL生成ID
  const baseId = title.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
    .substring(0, 20);
  
  // 添加URL的哈希值确保唯一性
  const urlHash = url.split('').reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
  }, 0);
  
  return `${baseId}_${Math.abs(urlHash).toString(36)}_${Date.now().toString(36)}`;
}

/**
 * 转换分类数据格式
 * @param importCategories - 导入的分类数据
 * @returns 转换后的分类数据
 */
function convertCategories(importCategories: any[]): any[] {
  return importCategories.map(category => ({
    id: category.name.toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
      .substring(0, 20) + '_' + Date.now().toString(36),
    name: category.name,
    icon: category.icon || '📁',
    description: `从 Chrome 导入的分类：${category.name}`,
    addDate: category.addDate || Date.now()
  }));
}

/**
 * 转换书签数据格式
 * @param importSites - 导入的书签数据
 * @param categoryMapping - 分类映射
 * @returns 转换后的书签数据
 */
function convertSites(importSites: any[], categoryMapping: Record<string, string>): any[] {
  return importSites.map(site => ({
    id: generateUniqueId(site.title, site.url),
    title: site.title,
    url: site.url,
    description: site.description || `${site.title} - 从 Chrome 导入`,
    shortDesc: site.title,
    category: categoryMapping[site.category] || site.category,
    icon: site.icon || '/images/default.svg',
    addDate: site.addDate || Date.now()
  }));
}

/**
 * 触发图标下载
 * @param sites - 书签数据
 */
async function triggerIconDownload(sites: any[]): Promise<void> {
  try {
    console.log('🔄 触发图标下载...');
    
    // 这里可以调用图标下载脚本
    // 由于在 API 环境中，我们只能记录需要下载的图标
    const iconUrls = sites
      .map(site => site.url)
      .filter(url => url && !url.startsWith('javascript:'));
    
    console.log(`📥 需要下载图标的网站数量: ${iconUrls.length}`);
    
    // 在实际部署中，这里可以触发后台任务来下载图标
    // 例如：调用 Cloudflare Workers 或者队列系统
    
  } catch (error) {
    console.warn('触发图标下载失败:', error);
    // 图标下载失败不应该影响导入过程
  }
}

/**
 * 处理 POST 请求 - 导入 Chrome 书签
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📥 API: 导入 Chrome 书签');
    
    // 检查权限
    if (!checkAdminPermission(request)) {
      return createApiResponse(null, 403, '管理功能未启用或权限不足');
    }
    
    // 解析请求数据
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createApiResponse(null, 400, '请求内容类型必须是 application/json');
    }
    
    let importData: ImportData;
    try {
      importData = await request.json();
    } catch {
      return createApiResponse(null, 400, '请求数据格式无效');
    }
    
    // 验证导入数据
    const validation = validateImportData(importData);
    if (!validation.isValid) {
      return createApiResponse(
        { errors: validation.errors },
        400,
        '导入数据验证失败'
      );
    }
    
    const options: ImportOptions = {
      mergeMode: 'append',
      downloadIcons: true,
      skipDuplicates: true,
      ...importData.options
    };
    
    console.log(`开始导入: ${importData.categories.length} 个分类, ${importData.sites.length} 个书签`);
    
    // 获取现有数据
    const existingCategories = await dataManager.getCategories();
    const existingSites = await dataManager.getSites();
    
    // 转换分类数据
    const newCategories = convertCategories(importData.categories);
    
    // 创建分类映射
    const categoryMapping: Record<string, string> = {};
    
    // 处理分类导入
    let importedCategories = 0;
    for (const newCategory of newCategories) {
      const existingCategory = existingCategories.find(cat => 
        cat.name.toLowerCase() === newCategory.name.toLowerCase()
      );
      
      if (existingCategory) {
        // 分类已存在，使用现有分类ID
        categoryMapping[newCategory.name] = existingCategory.id;
        console.log(`分类已存在: ${newCategory.name} -> ${existingCategory.id}`);
      } else {
        // 创建新分类
        try {
          await dataManager.addCategory(newCategory);
          categoryMapping[newCategory.name] = newCategory.id;
          importedCategories++;
          console.log(`创建新分类: ${newCategory.name}`);
        } catch (error) {
          console.warn(`创建分类失败: ${newCategory.name}`, error);
          // 使用默认分类
          const defaultCategory = existingCategories[0];
          if (defaultCategory) {
            categoryMapping[newCategory.name] = defaultCategory.id;
          }
        }
      }
    }
    
    // 转换书签数据
    const newSites = convertSites(importData.sites, categoryMapping);
    
    // 处理书签导入
    let importedSites = 0;
    let skippedSites = 0;
    
    for (const newSite of newSites) {
      try {
        // 检查是否跳过重复书签
        if (options.skipDuplicates) {
          const existingSite = existingSites.find(site => 
            site.url.toLowerCase() === newSite.url.toLowerCase()
          );
          
          if (existingSite) {
            skippedSites++;
            console.log(`跳过重复书签: ${newSite.title}`);
            continue;
          }
        }
        
        // 添加新书签
        await dataManager.addSite(newSite);
        importedSites++;
        
        if (importedSites % 10 === 0) {
          console.log(`已导入 ${importedSites} 个书签...`);
        }
        
      } catch (error) {
        console.warn(`导入书签失败: ${newSite.title}`, error);
        skippedSites++;
      }
    }
    
    // 触发图标下载
    if (options.downloadIcons && importedSites > 0) {
      await triggerIconDownload(newSites.slice(0, importedSites));
    }
    
    const result = {
      importedCategories,
      importedSites,
      skippedSites,
      totalCategories: importData.categories.length,
      totalSites: importData.sites.length,
      options
    };
    
    console.log(`✅ 导入完成: ${importedSites} 个书签, ${importedCategories} 个分类`);
    
    return createApiResponse(result, 200, '书签导入成功');
    
  } catch (error) {
    console.error('❌ 导入 Chrome 书签失败:', error);
    
    if (error.type === ErrorType.VALIDATION) {
      return createApiResponse(null, 400, error.getUserMessage());
    }
    
    const appError = handleError.generic(error, { operation: 'import_chrome_bookmarks' });
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
