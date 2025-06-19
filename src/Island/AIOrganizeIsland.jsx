/**
 * AI 智能整理界面组件
 * 基于现有 Island 组件模式，提供 Gemini AI 驱动的书签智能分类功能
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { useState, useEffect, useRef } from 'react';
import { handleError } from '../utils/error-handler.js';
import { api } from '../utils/api-client.js';

/**
 * 整理模式枚举
 */
const OrganizeMode = {
  CATEGORIZE: 'categorize',
  GENERATE_CATEGORIES: 'generate_categories',
  SMART_MERGE: 'smart_merge'
};

/**
 * 处理状态枚举
 */
const ProcessStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  ANALYZING: 'analyzing',
  COMPLETED: 'completed',
  ERROR: 'error'
};

export default function AIOrganizeIsland() {
  const [aiStatus, setAiStatus] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedBookmarks, setSelectedBookmarks] = useState([]);
  const [organizeMode, setOrganizeMode] = useState(OrganizeMode.CATEGORIZE);
  const [processStatus, setProcessStatus] = useState(ProcessStatus.IDLE);
  const [suggestions, setSuggestions] = useState([]);
  const [newCategories, setNewCategories] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // 配置选项
  const [confidence, setConfidence] = useState(0.7);
  const [autoApply, setAutoApply] = useState(false);
  
  // API 调用控制
  const isApiCallInProgress = useRef(false);
  const lastApiCallTime = useRef(0);
  const MIN_API_INTERVAL = 2000;

  /**
   * 获取 AI 服务状态
   */
  const fetchAIStatus = async () => {
    try {
      console.log('🤖 获取 AI 服务状态...');
      const response = await api.get('/api/ai/organize');
      setAiStatus(response.data);
      console.log('✅ AI 服务状态获取成功');
    } catch (error) {
      console.error('❌ 获取 AI 服务状态失败:', error);
      setAiStatus({ isAvailable: false, error: error.message });
    }
  };

  /**
   * 获取书签和分类数据
   */
  const fetchData = async () => {
    try {
      console.log('📖 获取书签和分类数据...');
      const [bookmarksResponse, categoriesResponse] = await Promise.all([
        api.get('/api/bookmarks'),
        api.get('/api/categories')
      ]);
      
      setBookmarks(bookmarksResponse.data.sites || []);
      setCategories(categoriesResponse.data || []);
      console.log(`✅ 数据获取成功: ${bookmarksResponse.data.sites?.length || 0} 个书签, ${categoriesResponse.data?.length || 0} 个分类`);
    } catch (error) {
      console.error('❌ 获取数据失败:', error);
      const appError = handleError.generic(error, { operation: 'fetch_data' });
      setError(appError.getUserMessage());
    }
  };

  /**
   * 执行 AI 整理
   */
  const executeAIOrganize = async () => {
    if (isApiCallInProgress.current) {
      console.log('AI 整理正在进行中，跳过重复请求');
      return;
    }

    const now = Date.now();
    if (now - lastApiCallTime.current < MIN_API_INTERVAL) {
      console.log('AI 整理调用过于频繁，跳过请求');
      return;
    }

    isApiCallInProgress.current = true;
    lastApiCallTime.current = now;

    try {
      setProcessStatus(ProcessStatus.ANALYZING);
      setError(null);
      setSuccessMessage('');
      setSuggestions([]);
      setNewCategories([]);

      console.log(`🤖 开始 AI 整理: 模式 ${organizeMode}`);

      const requestData = {
        bookmarkIds: selectedBookmarks.length > 0 ? selectedBookmarks : undefined,
        options: {
          mode: organizeMode,
          confidence,
          autoApply,
          createNewCategories: organizeMode === OrganizeMode.GENERATE_CATEGORIES
        }
      };

      const response = await api.post('/api/ai/organize', requestData);
      const result = response.data;

      if (result.suggestions) {
        setSuggestions(result.suggestions);
      }

      if (result.newCategories) {
        setNewCategories(result.newCategories);
      }

      if (result.applied) {
        setSuccessMessage(`AI 整理完成！已应用 ${result.applied.applied} 个建议，跳过 ${result.applied.skipped} 个，失败 ${result.applied.errors} 个`);
        // 刷新数据
        await fetchData();
      } else {
        setSuccessMessage(`AI 分析完成！生成了 ${result.suggestions?.length || result.newCategories?.length || 0} 个建议`);
      }

      setProcessStatus(ProcessStatus.COMPLETED);
      console.log('✅ AI 整理完成');

    } catch (error) {
      console.error('❌ AI 整理失败:', error);
      const appError = handleError.generic(error, { operation: 'ai_organize' });
      setError(appError.getUserMessage());
      setProcessStatus(ProcessStatus.ERROR);
    } finally {
      isApiCallInProgress.current = false;
    }
  };

  /**
   * 应用分类建议
   */
  const applySuggestions = async (selectedSuggestions = null) => {
    try {
      setProcessStatus(ProcessStatus.LOADING);
      setError(null);

      const suggestionsToApply = selectedSuggestions || suggestions;
      
      console.log(`📝 应用分类建议: ${suggestionsToApply.length} 个`);

      const response = await api.put('/api/ai/organize', {
        suggestions: suggestionsToApply,
        minConfidence: confidence
      });

      const result = response.data;
      setSuccessMessage(`分类建议应用完成！已应用 ${result.applied} 个建议，跳过 ${result.skipped} 个，失败 ${result.errors} 个`);
      
      // 刷新数据
      await fetchData();
      setSuggestions([]);
      setProcessStatus(ProcessStatus.COMPLETED);

    } catch (error) {
      console.error('❌ 应用分类建议失败:', error);
      const appError = handleError.generic(error, { operation: 'apply_suggestions' });
      setError(appError.getUserMessage());
      setProcessStatus(ProcessStatus.ERROR);
    }
  };

  /**
   * 切换书签选择
   */
  const toggleBookmarkSelection = (bookmarkId) => {
    setSelectedBookmarks(prev => {
      if (prev.includes(bookmarkId)) {
        return prev.filter(id => id !== bookmarkId);
      } else {
        return [...prev, bookmarkId];
      }
    });
  };

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (selectedBookmarks.length === bookmarks.length) {
      setSelectedBookmarks([]);
    } else {
      setSelectedBookmarks(bookmarks.map(b => b.id));
    }
  };

  // 组件初始化
  useEffect(() => {
    let isComponentMounted = true;

    const initAIOrganize = async () => {
      if (!isComponentMounted) return;
      
      try {
        setProcessStatus(ProcessStatus.LOADING);
        await Promise.all([fetchAIStatus(), fetchData()]);
        setProcessStatus(ProcessStatus.IDLE);
      } catch (error) {
        console.error('初始化 AI 整理失败:', error);
        setProcessStatus(ProcessStatus.ERROR);
      }
    };

    // 使用 requestIdleCallback 优化性能
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        if (isComponentMounted) {
          initAIOrganize();
        }
      });
    } else {
      setTimeout(() => {
        if (isComponentMounted) {
          initAIOrganize();
        }
      }, 100);
    }

    return () => {
      isComponentMounted = false;
    };
  }, []);

  /**
   * 渲染 AI 状态
   */
  const renderAIStatus = () => {
    if (!aiStatus) return null;

    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          🤖 AI 服务状态
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${aiStatus.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
              {aiStatus.isAvailable ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {aiStatus.isAvailable ? '可用' : '不可用'}
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${aiStatus.hasApiKey ? 'text-green-600' : 'text-red-600'}`}>
              {aiStatus.hasApiKey ? '🔑' : '🚫'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {aiStatus.hasApiKey ? 'API Key 已配置' : 'API Key 未配置'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {aiStatus.modelName || 'N/A'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">AI 模型</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {aiStatus.maxRetries || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">最大重试次数</div>
          </div>
        </div>
        
        {!aiStatus.isAvailable && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-yellow-700 dark:text-yellow-400 text-sm">
              💡 要使用 AI 功能，请在环境变量中配置 GEMINI_API_KEY
            </p>
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染控制面板
   */
  const renderControlPanel = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        ⚙️ 整理设置
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 整理模式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            整理模式
          </label>
          <select
            value={organizeMode}
            onChange={(e) => setOrganizeMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={OrganizeMode.CATEGORIZE}>智能分类</option>
            <option value={OrganizeMode.GENERATE_CATEGORIES}>生成新分类</option>
            <option value={OrganizeMode.SMART_MERGE}>智能合并（开发中）</option>
          </select>
        </div>

        {/* 置信度设置 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            置信度阈值: {confidence}
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>宽松 (0.1)</span>
            <span>严格 (1.0)</span>
          </div>
        </div>
      </div>

      {/* 选项 */}
      <div className="mt-4 space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={autoApply}
            onChange={(e) => setAutoApply(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            自动应用建议（置信度高于阈值的建议将自动应用）
          </span>
        </label>
      </div>

      {/* 书签选择 */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            选择要整理的书签 ({selectedBookmarks.length}/{bookmarks.length})
          </label>
          <button
            onClick={toggleSelectAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {selectedBookmarks.length === bookmarks.length ? '取消全选' : '全选'}
          </button>
        </div>
        
        <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-2">
          {bookmarks.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              暂无书签数据
            </div>
          ) : (
            <div className="space-y-1">
              {bookmarks.slice(0, 20).map(bookmark => (
                <label key={bookmark.id} className="flex items-center p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                  <input
                    type="checkbox"
                    checked={selectedBookmarks.includes(bookmark.id)}
                    onChange={() => toggleBookmarkSelection(bookmark.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                    {bookmark.title}
                  </span>
                </label>
              ))}
              {bookmarks.length > 20 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  还有 {bookmarks.length - 20} 个书签...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 执行按钮 */}
      <div className="mt-6">
        <button
          onClick={executeAIOrganize}
          disabled={!aiStatus?.isAvailable || processStatus === ProcessStatus.ANALYZING || bookmarks.length === 0}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {processStatus === ProcessStatus.ANALYZING ? (
            <>
              <span className="animate-spin">🤖</span>
              AI 分析中...
            </>
          ) : (
            <>
              <span>🚀</span>
              开始 AI 整理
            </>
          )}
        </button>
      </div>
    </div>
  );

  /**
   * 渲染分类建议
   */
  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            💡 分类建议 ({suggestions.length})
          </h3>
          <button
            onClick={() => applySuggestions()}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <span>✅</span>
            应用所有建议
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, index) => {
            const bookmark = bookmarks.find(b => b.id === suggestion.siteId);
            if (!bookmark) return null;

            return (
              <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {bookmark.title}
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="inline-block bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs mr-2">
                        {suggestion.currentCategory}
                      </span>
                      <span>→</span>
                      <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs ml-2">
                        {suggestion.suggestedCategory}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {suggestion.reason}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className={`text-sm font-medium ${
                      suggestion.confidence >= 0.8 ? 'text-green-600' :
                      suggestion.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </div>
                    <button
                      onClick={() => applySuggestions([suggestion])}
                      className="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      应用
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /**
   * 渲染新分类建议
   */
  const renderNewCategories = () => {
    if (newCategories.length === 0) return null;

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🆕 新分类建议 ({newCategories.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {newCategories.map((category, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-md">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{category.icon}</span>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {category.name}
                </h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {category.description}
              </p>
              {category.keywords && (
                <div className="flex flex-wrap gap-1">
                  {category.keywords.map((keyword, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * 渲染状态信息
   */
  const renderStatusMessage = () => {
    if (error) {
      return (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      );
    }

    if (successMessage) {
      return (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-center">
            <span className="text-green-500 mr-2">✅</span>
            <span className="text-green-700 dark:text-green-400">{successMessage}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  /**
   * 渲染加载状态
   */
  const renderLoadingState = () => {
    if (processStatus !== ProcessStatus.LOADING && processStatus !== ProcessStatus.ANALYZING) {
      return null;
    }

    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-2xl mb-2">🤖</div>
          <div className="text-gray-600 dark:text-gray-300 flex items-end">
            {processStatus === ProcessStatus.ANALYZING ? 'AI 分析中' : '加载中'}
            <span className="inline-block ml-px font-bold animate-wave">.</span>
            <span className="inline-block ml-px font-bold animate-wave [animation-delay:0.1s]">.</span>
            <span className="inline-block ml-px font-bold animate-wave [animation-delay:0.2s]">.</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            🤖 AI 智能整理
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            使用 Gemini AI 智能分析和整理您的书签
          </p>
        </div>

        {renderStatusMessage()}
        {renderAIStatus()}
        
        {processStatus === ProcessStatus.LOADING || processStatus === ProcessStatus.ANALYZING ? (
          renderLoadingState()
        ) : (
          <>
            {renderControlPanel()}
            {renderSuggestions()}
            {renderNewCategories()}
          </>
        )}
      </div>
    </div>
  );
}
