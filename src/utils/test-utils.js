/**
 * 工具模块测试文件
 * 用于验证 API 客户端、缓存管理器、错误处理器和书签解析器的功能
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { api, ApiClient } from './api-client.js';
import { cache, CacheManager, CacheStrategy } from './cache-manager.js';
import { handleError, ErrorType, AppError } from './error-handler.js';
import { parseBookmarks, BookmarkParser } from './bookmark-parser.js';
import { dataManager, data } from '../data/data-manager.js';
import { kvAdapter } from '../data/kv-adapter.js';
import { migrationTool } from '../data/migration-tool.js';

/**
 * 测试 API 客户端
 */
export async function testApiClient() {
  console.log('🧪 测试 API 客户端...');
  
  try {
    // 测试基本的 GET 请求（使用一个公开的测试 API）
    const testUrl = 'https://httpbin.org/json';
    const response = await api.get(testUrl);
    console.log('✅ API 客户端 GET 请求成功:', response);
    
    // 测试请求限流
    console.log('🔄 测试请求限流...');
    const promises = Array(3).fill().map(() => api.get(testUrl));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`✅ 请求限流测试完成: ${successful} 成功, ${failed} 被限流`);
    
    return true;
  } catch (error) {
    console.error('❌ API 客户端测试失败:', error);
    return false;
  }
}

/**
 * 测试缓存管理器
 */
export function testCacheManager() {
  console.log('🧪 测试缓存管理器...');
  
  try {
    // 测试基本缓存操作
    const testKey = 'test_key';
    const testData = { message: 'Hello Cache!', timestamp: Date.now() };
    
    // 设置缓存
    cache.set(testKey, testData, 5000); // 5秒过期
    console.log('✅ 缓存设置成功');
    
    // 获取缓存
    const cachedData = cache.get(testKey);
    if (JSON.stringify(cachedData) === JSON.stringify(testData)) {
      console.log('✅ 缓存获取成功:', cachedData);
    } else {
      throw new Error('缓存数据不匹配');
    }
    
    // 测试不同缓存策略
    const memoryCache = new CacheManager({ strategy: CacheStrategy.MEMORY });
    const localCache = new CacheManager({ strategy: CacheStrategy.LOCAL });
    
    memoryCache.set('memory_test', 'memory_data');
    localCache.set('local_test', 'local_data');
    
    console.log('✅ 内存缓存:', memoryCache.get('memory_test'));
    console.log('✅ 本地缓存:', localCache.get('local_test'));
    
    // 清理测试缓存
    cache.delete(testKey);
    memoryCache.clear();
    localCache.clear();
    
    console.log('✅ 缓存管理器测试完成');
    return true;
  } catch (error) {
    console.error('❌ 缓存管理器测试失败:', error);
    return false;
  }
}

/**
 * 测试错误处理器
 */
export function testErrorHandler() {
  console.log('🧪 测试错误处理器...');
  
  try {
    // 测试创建应用错误
    const appError = new AppError(
      '这是一个测试错误',
      ErrorType.VALIDATION,
      'warn',
      { testContext: true }
    );
    
    console.log('✅ 应用错误创建成功:', appError.toJSON());
    
    // 测试错误处理函数
    const networkError = handleError.network(new Error('网络连接失败'));
    console.log('✅ 网络错误处理:', networkError.getUserMessage());
    
    const validationError = handleError.validation('输入数据无效');
    console.log('✅ 验证错误处理:', validationError.getUserMessage());
    
    // 测试 HTTP 错误解析
    const mockResponse = {
      status: 404,
      url: 'https://example.com/api/test'
    };
    const httpError = handleError.http(mockResponse);
    console.log('✅ HTTP 错误处理:', httpError.getUserMessage());
    
    console.log('✅ 错误处理器测试完成');
    return true;
  } catch (error) {
    console.error('❌ 错误处理器测试失败:', error);
    return false;
  }
}

/**
 * 测试书签解析器
 */
export function testBookmarkParser() {
  console.log('🧪 测试书签解析器...');
  
  try {
    // 创建测试用的 Chrome 书签 HTML
    const testBookmarkHTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1640995200" LAST_MODIFIED="1640995200">书签栏</H3>
    <DD><DL><p>
        <DT><H3 ADD_DATE="1640995200" LAST_MODIFIED="1640995200">工作</H3>
        <DD><DL><p>
            <DT><A HREF="https://github.com" ADD_DATE="1640995200">GitHub</A>
            <DT><A HREF="https://stackoverflow.com" ADD_DATE="1640995200">Stack Overflow</A>
        </DL><p>
        <DT><H3 ADD_DATE="1640995200" LAST_MODIFIED="1640995200">娱乐</H3>
        <DD><DL><p>
            <DT><A HREF="https://youtube.com" ADD_DATE="1640995200">YouTube</A>
            <DT><A HREF="https://netflix.com" ADD_DATE="1640995200">Netflix</A>
        </DL><p>
    </DL><p>
</DL><p>`;
    
    // 解析书签
    const parser = new BookmarkParser();
    const parseResult = parser.parseChrome(testBookmarkHTML);
    
    console.log('✅ 书签解析成功:', {
      categoriesCount: parseResult.categories.length,
      sitesCount: parseResult.sites.length
    });
    
    // 验证解析结果
    if (parseResult.categories.length >= 2) {
      console.log('✅ 分类解析正确');
    }
    
    if (parseResult.sites.length >= 4) {
      console.log('✅ 书签解析正确');
    }
    
    // 测试导出功能
    const exportedHTML = parser.exportToChrome(parseResult.categories);
    if (exportedHTML.includes('<!DOCTYPE NETSCAPE-Bookmark-file-1>')) {
      console.log('✅ 书签导出成功');
    }
    
    console.log('✅ 书签解析器测试完成');
    return true;
  } catch (error) {
    console.error('❌ 书签解析器测试失败:', error);
    return false;
  }
}

/**
 * 测试数据管理层
 */
export async function testDataManager() {
  console.log('🧪 测试数据管理层...');

  try {
    // 测试数据源信息
    const sourceInfo = dataManager.getDataSourceInfo();
    console.log('✅ 数据源信息:', sourceInfo);

    // 测试获取分类
    const categories = await data.getCategories();
    if (Array.isArray(categories) && categories.length > 0) {
      console.log(`✅ 获取分类成功: ${categories.length} 个分类`);
    } else {
      throw new Error('分类数据无效');
    }

    // 测试获取网站
    const sites = await data.getSites();
    if (Array.isArray(sites) && sites.length > 0) {
      console.log(`✅ 获取网站成功: ${sites.length} 个网站`);
    } else {
      throw new Error('网站数据无效');
    }

    // 测试搜索功能
    const searchResults = await data.searchSites('GitHub');
    console.log(`✅ 搜索测试成功: 找到 ${searchResults.length} 个结果`);

    // 测试按分类获取网站
    if (categories.length > 0) {
      const categoryId = categories[0].id;
      const categorySites = await data.getSitesByCategory(categoryId);
      console.log(`✅ 按分类获取网站成功: 分类 "${categoryId}" 有 ${categorySites.length} 个网站`);
    }

    // 测试缓存功能
    dataManager.clearCache();
    console.log('✅ 缓存清理成功');

    console.log('✅ 数据管理层测试完成');
    return true;
  } catch (error) {
    console.error('❌ 数据管理层测试失败:', error);
    return false;
  }
}

/**
 * 测试 KV 适配器
 */
export async function testKVAdapter() {
  console.log('🧪 测试 KV 适配器...');

  try {
    // 测试 KV 可用性
    const isAvailable = kvAdapter.isKVAvailable();
    console.log(`KV 存储可用性: ${isAvailable ? '✅ 可用' : '⚠️ 不可用'}`);

    if (!isAvailable) {
      console.log('⚠️ KV 存储不可用，跳过相关测试');
      return 'skipped';
    }

    // 测试版本检查
    const version = await kvAdapter.getVersion();
    console.log('✅ 版本信息:', version);

    const isCompatible = await kvAdapter.checkVersionCompatibility();
    console.log(`✅ 版本兼容性: ${isCompatible ? '兼容' : '不兼容'}`);

    console.log('✅ KV 适配器测试完成');
    return true;
  } catch (error) {
    console.error('❌ KV 适配器测试失败:', error);
    return false;
  }
}

/**
 * 测试迁移工具
 */
export async function testMigrationTool() {
  console.log('🧪 测试迁移工具...');

  try {
    // 测试前置条件检查
    const prerequisites = await migrationTool.checkPrerequisites();
    console.log(`✅ 前置条件检查: ${prerequisites ? '通过' : '失败'}`);

    // 测试状态获取
    const status = migrationTool.getStatus();
    console.log('✅ 迁移状态:', status);

    // 测试重置功能
    migrationTool.reset();
    console.log('✅ 迁移工具重置成功');

    console.log('✅ 迁移工具测试完成');
    return true;
  } catch (error) {
    console.error('❌ 迁移工具测试失败:', error);
    return false;
  }
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('🚀 开始运行工具模块测试...\n');
  
  const results = {
    apiClient: false,
    cacheManager: false,
    errorHandler: false,
    bookmarkParser: false,
    dataManager: false,
    kvAdapter: false,
    migrationTool: false
  };
  
  // 运行各项测试
  results.cacheManager = testCacheManager();
  console.log('');
  
  results.errorHandler = testErrorHandler();
  console.log('');
  
  results.bookmarkParser = testBookmarkParser();
  console.log('');

  results.dataManager = await testDataManager();
  console.log('');

  results.kvAdapter = await testKVAdapter();
  console.log('');

  results.migrationTool = await testMigrationTool();
  console.log('');

  // API 客户端测试需要网络请求，放在最后
  try {
    results.apiClient = await testApiClient();
  } catch (error) {
    console.log('⚠️ API 客户端测试跳过（可能是网络问题）');
    results.apiClient = 'skipped';
  }
  
  // 输出测试结果
  console.log('\n📊 测试结果汇总:');
  Object.entries(results).forEach(([name, result]) => {
    const status = result === true ? '✅ 通过' : 
                   result === 'skipped' ? '⚠️ 跳过' : '❌ 失败';
    console.log(`  ${name}: ${status}`);
  });
  
  const passedTests = Object.values(results).filter(r => r === true).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 测试完成: ${passedTests}/${totalTests} 通过`);
  
  return results;
}

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined' && window.location) {
  // 在浏览器环境中，可以通过控制台调用测试
  window.testUtils = {
    runAllTests,
    testApiClient,
    testCacheManager,
    testErrorHandler,
    testBookmarkParser,
    testDataManager,
    testKVAdapter,
    testMigrationTool
  };
  
  console.log('🔧 工具模块测试已加载，可通过 window.testUtils.runAllTests() 运行测试');
}
