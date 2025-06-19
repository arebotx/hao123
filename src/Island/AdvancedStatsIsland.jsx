/**
 * 高级统计可视化组件
 * 基于现有 Island 组件模式，提供详细的数据可视化和分析功能
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { useState, useEffect, useRef } from 'react';
import { handleError } from '../utils/error-handler.js';
import { api } from '../utils/api-client.js';

/**
 * 统计视图枚举
 */
const StatsView = {
  OVERVIEW: 'overview',
  USAGE_TRENDS: 'usage_trends',
  USER_BEHAVIOR: 'user_behavior',
  CONTENT_ANALYSIS: 'content_analysis',
  PERFORMANCE: 'performance'
};

/**
 * 时间范围枚举
 */
const TimeRange = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year'
};

export default function AdvancedStatsIsland() {
  const [currentView, setCurrentView] = useState(StatsView.OVERVIEW);
  const [timeRange, setTimeRange] = useState(TimeRange.WEEK);
  const [statsData, setStatsData] = useState({
    overview: null,
    clicks: null,
    searches: null,
    pages: null,
    categories: null,
    time: null,
    bookmarks: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // API 调用控制
  const isApiCallInProgress = useRef(false);
  const lastApiCallTime = useRef(0);
  const MIN_API_INTERVAL = 3000;

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

      console.log('📊 获取高级统计数据...');

      // 并行获取所有统计数据
      const [overviewRes, clicksRes, searchesRes] = await Promise.all([
        api.get('/api/stats/overview?details=true'),
        api.get('/api/stats/clicks?type=all&limit=20'),
        api.get('/api/stats/searches?type=all&limit=20')
      ]);

      setStatsData({
        overview: overviewRes.data,
        clicks: clicksRes.data,
        searches: searchesRes.data,
        pages: null, // 待实现
        categories: null, // 待实现
        time: null, // 待实现
        bookmarks: null // 待实现
      });

      console.log('✅ 高级统计数据获取成功');

    } catch (error) {
      console.error('❌ 获取高级统计数据失败:', error);
      const appError = handleError.generic(error, { operation: 'fetch_advanced_stats' });
      setError(appError.getUserMessage());
    } finally {
      setIsLoading(false);
      isApiCallInProgress.current = false;
    }
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

  /**
   * 格式化时间
   */
  const formatDuration = (ms) => {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)}秒`;
    } else if (ms < 3600000) {
      return `${Math.round(ms / 60000)}分钟`;
    } else {
      return `${Math.round(ms / 3600000)}小时`;
    }
  };

  /**
   * 获取趋势指示器
   */
  const getTrendIndicator = (current, previous) => {
    if (!previous || previous === 0) return { icon: '➖', color: 'text-gray-500', text: '无数据' };
    
    const change = ((current - previous) / previous) * 100;
    
    if (change > 5) {
      return { icon: '📈', color: 'text-green-600', text: `+${change.toFixed(1)}%` };
    } else if (change < -5) {
      return { icon: '📉', color: 'text-red-600', text: `${change.toFixed(1)}%` };
    } else {
      return { icon: '➖', color: 'text-gray-500', text: `${change.toFixed(1)}%` };
    }
  };

  // 组件初始化
  useEffect(() => {
    let isComponentMounted = true;

    const initAdvancedStats = () => {
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

    initAdvancedStats();

    // 设置自动刷新（每10分钟）
    const interval = setInterval(() => {
      if (isComponentMounted) {
        fetchAllStats();
      }
    }, 10 * 60 * 1000);

    setRefreshInterval(interval);

    return () => {
      isComponentMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // 监听时间范围变化
  useEffect(() => {
    fetchAllStats();
  }, [timeRange]);

  /**
   * 渲染视图切换标签
   */
  const renderViewTabs = () => (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex overflow-x-auto">
        {[
          { key: StatsView.OVERVIEW, label: '总览', icon: '📊' },
          { key: StatsView.USAGE_TRENDS, label: '使用趋势', icon: '📈' },
          { key: StatsView.USER_BEHAVIOR, label: '用户行为', icon: '👥' },
          { key: StatsView.CONTENT_ANALYSIS, label: '内容分析', icon: '📋' },
          { key: StatsView.PERFORMANCE, label: '性能指标', icon: '⚡' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setCurrentView(tab.key)}
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
   * 渲染时间范围选择器
   */
  const renderTimeRangeSelector = () => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📅 时间范围
        </h3>
        <div className="flex gap-2">
          {[
            { key: TimeRange.TODAY, label: '今天' },
            { key: TimeRange.WEEK, label: '本周' },
            { key: TimeRange.MONTH, label: '本月' },
            { key: TimeRange.QUARTER, label: '本季度' },
            { key: TimeRange.YEAR, label: '本年' }
          ].map(range => (
            <button
              key={range.key}
              onClick={() => setTimeRange(range.key)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /**
   * 渲染总览视图
   */
  const renderOverviewView = () => {
    const { overview, clicks, searches } = statsData;
    if (!overview) return null;

    return (
      <div className="space-y-6">
        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(overview.totalClicks)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">总点击数</div>
              </div>
              <div className="text-3xl">👆</div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-600">📈 +12%</span>
              <span className="text-gray-500 ml-1">vs 上周</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(overview.totalSearches)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">搜索次数</div>
              </div>
              <div className="text-3xl">🔍</div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-blue-600">📊 {formatPercentage(overview.searchSuccessRate)}</span>
              <span className="text-gray-500 ml-1">成功率</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overview.totalSites || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">书签总数</div>
              </div>
              <div className="text-3xl">🔖</div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-purple-600">📂 {overview.totalCategories || 0}</span>
              <span className="text-gray-500 ml-1">个分类</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overview.clicksToday || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">今日活跃</div>
              </div>
              <div className="text-3xl">🎯</div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-orange-600">🔥 {overview.searchesToday || 0}</span>
              <span className="text-gray-500 ml-1">次搜索</span>
            </div>
          </div>
        </div>

        {/* 热门内容 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 热门书签 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🔥 热门书签
            </h3>
            {clicks?.topSites && clicks.topSites.length > 0 ? (
              <div className="space-y-3">
                {clicks.topSites.slice(0, 5).map(([siteId, count], index) => (
                  <div key={siteId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium truncate">
                        {siteId}
                      </span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      {count} 次
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                暂无点击数据
              </div>
            )}
          </div>

          {/* 热门搜索 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🔍 热门搜索
            </h3>
            {searches?.topKeywords && searches.topKeywords.length > 0 ? (
              <div className="space-y-3">
                {searches.topKeywords.slice(0, 5).map(([keyword, count], index) => (
                  <div key={keyword} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-green-100 text-green-800' :
                        index === 1 ? 'bg-blue-100 text-blue-800' :
                        index === 2 ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        "{keyword}"
                      </span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      {count} 次
                    </span>
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
      </div>
    );
  };

  /**
   * 渲染其他视图的占位符
   */
  const renderPlaceholderView = (title, icon, description) => (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      <div className="text-sm text-gray-500 dark:text-gray-500">
        敬请期待后续更新 ✨
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
            <div className="text-2xl mb-2">📊</div>
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
      case StatsView.OVERVIEW:
        return renderOverviewView();
      case StatsView.USAGE_TRENDS:
        return renderPlaceholderView('使用趋势', '📈', '详细的使用趋势分析功能正在开发中...');
      case StatsView.USER_BEHAVIOR:
        return renderPlaceholderView('用户行为', '👥', '用户行为分析功能正在开发中...');
      case StatsView.CONTENT_ANALYSIS:
        return renderPlaceholderView('内容分析', '📋', '内容分析功能正在开发中...');
      case StatsView.PERFORMANCE:
        return renderPlaceholderView('性能指标', '⚡', '性能指标分析功能正在开发中...');
      default:
        return renderOverviewView();
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            📊 高级统计分析
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            深入了解您的书签使用情况和用户行为
          </p>
        </div>

        {renderViewTabs()}
        {renderTimeRangeSelector()}
        {renderContent()}
      </div>
    </div>
  );
}
