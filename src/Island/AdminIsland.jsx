/**
 * 主管理界面组件
 * 基于现有 Island 组件模式，提供后台管理的主界面和导航
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { useState, useEffect, useRef } from 'react';
import { handleError } from '../utils/error-handler.js';
import { api } from '../utils/api-client.js';

/**
 * 管理页面枚举
 */
const AdminPages = {
  DASHBOARD: 'dashboard',
  BOOKMARKS: 'bookmarks',
  CATEGORIES: 'categories',
  IMPORT_EXPORT: 'import_export',
  AI_ORGANIZE: 'ai_organize',
  STATS: 'stats',
  SETTINGS: 'settings'
};

/**
 * 页面配置
 */
const PAGE_CONFIG = {
  [AdminPages.DASHBOARD]: {
    title: '概览',
    icon: '📊',
    description: '系统概览和统计信息'
  },
  [AdminPages.BOOKMARKS]: {
    title: '书签管理',
    icon: '🔖',
    description: '管理所有书签'
  },
  [AdminPages.CATEGORIES]: {
    title: '分类管理',
    icon: '📂',
    description: '管理书签分类'
  },
  [AdminPages.IMPORT_EXPORT]: {
    title: '导入导出',
    icon: '🔄',
    description: 'Chrome 书签导入导出'
  },
  [AdminPages.AI_ORGANIZE]: {
    title: 'AI 整理',
    icon: '🤖',
    description: 'Gemini AI 智能分类'
  },
  [AdminPages.STATS]: {
    title: '统计分析',
    icon: '📈',
    description: '查看详细统计数据'
  },
  [AdminPages.SETTINGS]: {
    title: '系统设置',
    icon: '⚙️',
    description: '系统配置和设置'
  }
};

export default function AdminIsland() {
  const [currentPage, setCurrentPage] = useState(AdminPages.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 使用 ref 来避免重复的 API 调用
  const isApiCallInProgress = useRef(false);
  const lastApiCallTime = useRef(0);
  const MIN_API_INTERVAL = 1000; // 1秒最小间隔

  /**
   * 获取系统信息
   */
  const fetchSystemInfo = async () => {
    if (isApiCallInProgress.current) {
      console.log('系统信息 API 调用正在进行中，跳过重复请求');
      return;
    }

    const now = Date.now();
    if (now - lastApiCallTime.current < MIN_API_INTERVAL) {
      console.log('系统信息 API 调用过于频繁，跳过请求');
      return;
    }

    isApiCallInProgress.current = true;
    lastApiCallTime.current = now;

    try {
      console.log('📊 获取系统概览信息...');
      const response = await api.get('/api/stats/overview');
      setSystemInfo(response.data);
      setError(null);
      console.log('✅ 系统信息获取成功');
    } catch (error) {
      console.error('❌ 获取系统信息失败:', error);
      const appError = handleError.generic(error, { operation: 'fetch_system_info' });
      setError(appError.getUserMessage());
    } finally {
      setIsLoading(false);
      isApiCallInProgress.current = false;
    }
  };

  /**
   * 切换页面
   * @param {string} page - 页面标识
   */
  const handlePageChange = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
    console.log(`切换到页面: ${page}`);

    // 动态显示对应的组件
    showAdminComponent(page);
  };

  /**
   * 显示对应的管理组件
   * @param {string} page - 页面标识
   */
  const showAdminComponent = (page) => {
    // 隐藏所有组件
    const components = [
      'bookmark-manager',
      'category-manager',
      'import-export',
      'ai-organize',
      'stats',
      'advanced-stats'
    ];

    components.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });

    // 显示对应的组件
    let targetId = null;
    switch (page) {
      case AdminPages.BOOKMARKS:
        targetId = 'bookmark-manager';
        break;
      case AdminPages.CATEGORIES:
        targetId = 'category-manager';
        break;
      case AdminPages.IMPORT_EXPORT:
        targetId = 'import-export';
        break;
      case AdminPages.AI_ORGANIZE:
        targetId = 'ai-organize';
        break;
      case AdminPages.STATS:
        targetId = 'stats';
        break;
      default:
        // 默认显示概览
        break;
    }

    if (targetId) {
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.style.display = 'block';
        // 隐藏主管理界面
        const mainContent = document.querySelector('#admin-content > div > div');
        if (mainContent) {
          mainContent.style.display = 'none';
        }
      }
    } else {
      // 显示主管理界面
      const mainContent = document.querySelector('#admin-content > div > div');
      if (mainContent) {
        mainContent.style.display = 'block';
      }
    }
  };

  /**
   * 切换菜单显示状态
   */
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 组件初始化
  useEffect(() => {
    let isComponentMounted = true;

    const initAdmin = () => {
      if (!isComponentMounted) return;
      
      // 使用 requestIdleCallback 优化性能
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          if (isComponentMounted) {
            fetchSystemInfo();
          }
        });
      } else {
        setTimeout(() => {
          if (isComponentMounted) {
            fetchSystemInfo();
          }
        }, 100);
      }
    };

    initAdmin();

    return () => {
      isComponentMounted = false;
    };
  }, []);

  /**
   * 渲染导航菜单
   */
  const renderNavigation = () => (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              📋 后台管理
            </h1>
          </div>
          
          {/* 桌面端导航 */}
          <div className="hidden md:flex items-center space-x-4">
            {Object.entries(PAGE_CONFIG).map(([pageKey, config]) => (
              <button
                key={pageKey}
                onClick={() => handlePageChange(pageKey)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === pageKey
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={config.description}
              >
                <span className="mr-1">{config.icon}</span>
                {config.title}
              </button>
            ))}
          </div>

          {/* 移动端菜单按钮 */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2"
            >
              <span className="text-xl">{isMenuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-2">
            {Object.entries(PAGE_CONFIG).map(([pageKey, config]) => (
              <button
                key={pageKey}
                onClick={() => handlePageChange(pageKey)}
                className={`block w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                  currentPage === pageKey
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{config.icon}</span>
                {config.title}
                <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                  {config.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );

  /**
   * 渲染页面内容
   */
  const renderPageContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-2xl mb-2">⏳</div>
            <div className="text-gray-600 dark:text-gray-300 flex items-end">
              加载中
              <span className="inline-block ml-px font-bold animate-wave">.</span>
              <span className="inline-block ml-px font-bold animate-wave [animation-delay:0.1s]">.</span>
              <span className="inline-block ml-px font-bold animate-wave [animation-delay:0.2s]">.</span>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-2xl mb-2">❌</div>
            <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
            <button
              onClick={fetchSystemInfo}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    // 根据当前页面渲染不同内容
    switch (currentPage) {
      case AdminPages.DASHBOARD:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              系统概览
            </h2>
            {systemInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-3xl mb-2">📂</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {systemInfo.totalCategories || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">分类总数</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-3xl mb-2">🔖</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {systemInfo.totalSites || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">书签总数</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-3xl mb-2">👆</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {systemInfo.totalClicks || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">总点击数</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {systemInfo.totalSearches || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">搜索次数</div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-6">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">{PAGE_CONFIG[currentPage]?.icon || '🚧'}</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {PAGE_CONFIG[currentPage]?.title || '页面'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {PAGE_CONFIG[currentPage]?.description || '此功能正在开发中...'}
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                敬请期待后续更新 ✨
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {renderNavigation()}
      <main className="max-w-7xl mx-auto">
        {renderPageContent()}
      </main>
    </div>
  );
}
