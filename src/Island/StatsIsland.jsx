/**
 * 统计展示组件
 * 基于现有 Island 组件模式，提供统计数据的可视化展示
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { useState, useEffect, useRef } from 'react';
import { handleError } from '../utils/error-handler.js';
import { api } from '../utils/api-client.js';

/**
 * 统计类型枚举
 */
const StatsType = {
  OVERVIEW: 'overview',
  CLICKS: 'clicks',
  SEARCHES: 'searches',
  TRENDS: 'trends',
  ADVANCED: 'advanced'
};

export default function StatsIsland() {
  const [currentView, setCurrentView] = useState(StatsType.OVERVIEW);
  const [statsData, setStatsData] = useState({
    overview: null,
    clicks: null,
    searches: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // API 调用控制
  const isApiCallInProgress = useRef(false);
  const lastApiCallTime = useRef(0);
  const MIN_API_INTERVAL = 2000; // 2秒最小间隔

  /**
   * 获取统计概览
   */
  const fetchOverview = async () => {
    try {
      console.log('📊 获取统计概览...');
      const response = await api.get('/api/stats/overview?details=true');
      setStatsData(prev => ({
        ...prev,
        overview: response.data
      }));
      console.log('✅ 统计概览获取成功');
    } catch (error) {
      console.error('❌ 获取统计概览失败:', error);
      throw error;
    }
  };

  /**
   * 获取点击统计
   */
  const fetchClickStats = async () => {
    try {
      console.log('👆 获取点击统计...');
      const response = await api.get('/api/stats/clicks?type=all&limit=10');
      setStatsData(prev => ({
        ...prev,
        clicks: response.data
      }));
      console.log('✅ 点击统计获取成功');
    } catch (error) {
      console.error('❌ 获取点击统计失败:', error);
      throw error;
    }
  };

  /**
   * 获取搜索统计
   */
  const fetchSearchStats = async () => {
    try {
      console.log('🔍 获取搜索统计...');
      const response = await api.get('/api/stats/searches?type=all&limit=10');
      setStatsData(prev => ({
        ...prev,
        searches: response.data
      }));
      console.log('✅ 搜索统计获取成功');
    } catch (error) {
      console.error('❌ 获取搜索统计失败:', error);
      throw error;
    }
  };

  /**
   * 获取所有统计数据
   */
  const fetchAllStats = async () => {
    if (isApiCallInProgress.current) {
      console.log('统计 API 调用正在进行中，跳过重复请求');
      return;
    }

    const now = Date.now();
    if (now - lastApiCallTime.current < MIN_API_INTERVAL) {
      console.log('统计 API 调用过于频繁，跳过请求');
      return;
    }

    isApiCallInProgress.current = true;
    lastApiCallTime.current = now;

    try {
      setIsLoading(true);
      setError(null);
      
      // 并行获取所有统计数据
      await Promise.all([
        fetchOverview(),
        fetchClickStats(),
        fetchSearchStats()
      ]);
      
    } catch (error) {
      console.error('❌ 获取统计数据失败:', error);
      const appError = handleError.generic(error, { operation: 'fetch_stats' });
      setError(appError.getUserMessage());
    } finally {
      setIsLoading(false);
      isApiCallInProgress.current = false;
    }
  };

  /**
   * 切换视图
   */
  const handleViewChange = (view) => {
    setCurrentView(view);
    console.log(`切换到统计视图: ${view}`);
  };

  /**
   * 格式化数字
   */
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  /**
   * 格式化百分比
   */
  const formatPercentage = (value) => {
    if (typeof value === 'string' && value.includes('%')) {
      return value;
    }
    return `${value || 0}%`;
  };

  // 组件初始化
  useEffect(() => {
    let isComponentMounted = true;

    const initStats = () => {
      if (!isComponentMounted) return;
      
      // 使用 requestIdleCallback 优化性能
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          if (isComponentMounted) {
            fetchAllStats();
          }
        });
      } else {
        setTimeout(() => {
          if (isComponentMounted) {
            fetchAllStats();
          }
        }, 100);
      }
    };

    initStats();

    // 设置自动刷新（每5分钟）
    const interval = setInterval(() => {
      if (isComponentMounted) {
        fetchAllStats();
      }
    }, 5 * 60 * 1000);

    setRefreshInterval(interval);

    return () => {
      isComponentMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  /**
   * 渲染导航标签
   */
  const renderTabs = () => (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex overflow-x-auto">
        {[
          { key: StatsType.OVERVIEW, label: '概览', icon: '📊' },
          { key: StatsType.CLICKS, label: '点击统计', icon: '👆' },
          { key: StatsType.SEARCHES, label: '搜索统计', icon: '🔍' },
          { key: StatsType.TRENDS, label: '趋势分析', icon: '📈' },
          { key: StatsType.ADVANCED, label: '高级分析', icon: '🔬' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleViewChange(tab.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              currentView === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  /**
   * 渲染概览视图
   */
  const renderOverview = () => {
    const overview = statsData.overview;
    if (!overview) return null;

    return (
      <div className="p-6 space-y-6">
        {/* 核心指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-1">📂</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {overview.totalCategories || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">分类总数</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-1">🔖</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {overview.totalSites || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">书签总数</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-1">👆</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(overview.totalClicks)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">总点击数</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-1">🔍</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(overview.totalSearches)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">搜索次数</div>
          </div>
        </div>

        {/* 今日数据 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">今日数据</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {overview.clicksToday || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">今日点击</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {overview.searchesToday || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">今日搜索</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatPercentage(overview.searchSuccessRate)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">搜索成功率</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {overview.dataSource === 'kv' ? 'KV' : '静态'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">数据源</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染点击统计视图
   */
  const renderClickStats = () => {
    const clicks = statsData.clicks;
    if (!clicks) return null;

    return (
      <div className="p-6 space-y-6">
        {/* 热门书签 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">热门书签</h3>
          {clicks.topSites && clicks.topSites.length > 0 ? (
            <div className="space-y-3">
              {clicks.topSites.map(([siteId, count], index) => (
                <div key={siteId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">{siteId}</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">{count} 次</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无点击数据
            </div>
          )}
        </div>

        {/* 热门分类 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">热门分类</h3>
          {clicks.topCategories && clicks.topCategories.length > 0 ? (
            <div className="space-y-3">
              {clicks.topCategories.map(([categoryId, count], index) => (
                <div key={categoryId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">{categoryId}</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">{count} 次</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无分类点击数据
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * 渲染搜索统计视图
   */
  const renderSearchStats = () => {
    const searches = statsData.searches;
    if (!searches) return null;

    return (
      <div className="p-6 space-y-6">
        {/* 搜索概况 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">搜索概况</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(searches.total)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">总搜索次数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatPercentage(searches.successRate)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">搜索成功率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {searches.topKeywords?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">热门关键词数</div>
            </div>
          </div>
        </div>

        {/* 热门搜索关键词 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">热门搜索关键词</h3>
          {searches.topKeywords && searches.topKeywords.length > 0 ? (
            <div className="space-y-3">
              {searches.topKeywords.map(([keyword, count], index) => (
                <div key={keyword} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">"{keyword}"</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">{count} 次</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无搜索数据
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * 渲染趋势分析视图
   */
  const renderTrends = () => (
    <div className="p-6">
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📈</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          趋势分析
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          详细的趋势分析功能正在开发中...
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-500">
          敬请期待后续更新 ✨
        </div>
      </div>
    </div>
  );

  /**
   * 渲染内容
   */
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-2xl mb-2">⏳</div>
            <div className="text-gray-600 dark:text-gray-300 flex items-end">
              加载统计数据
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
              onClick={fetchAllStats}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case StatsType.OVERVIEW:
        return renderOverview();
      case StatsType.CLICKS:
        return renderClickStats();
      case StatsType.SEARCHES:
        return renderSearchStats();
      case StatsType.TRENDS:
        return renderTrends();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {renderTabs()}
      {renderContent()}
    </div>
  );
}
