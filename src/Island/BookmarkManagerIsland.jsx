/**
 * 书签管理组件
 * 基于现有 Island 组件模式，提供书签的增删改查功能
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { useState, useEffect, useRef } from 'react';
import { handleError } from '../utils/error-handler.js';
import { api } from '../utils/api-client.js';

/**
 * 操作模式枚举
 */
const OperationMode = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit'
};

export default function BookmarkManagerIsland() {
  const [bookmarks, setBookmarks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operationMode, setOperationMode] = useState(OperationMode.VIEW);
  const [selectedBookmark, setSelectedBookmark] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // 表单数据
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    url: '',
    description: '',
    shortDesc: '',
    category: '',
    icon: ''
  });

  // API 调用控制
  const isApiCallInProgress = useRef(false);
  const lastApiCallTime = useRef(0);
  const MIN_API_INTERVAL = 1000;

  /**
   * 获取书签列表
   */
  const fetchBookmarks = async () => {
    if (isApiCallInProgress.current) {
      console.log('书签 API 调用正在进行中，跳过重复请求');
      return;
    }

    const now = Date.now();
    if (now - lastApiCallTime.current < MIN_API_INTERVAL) {
      console.log('书签 API 调用过于频繁，跳过请求');
      return;
    }

    isApiCallInProgress.current = true;
    lastApiCallTime.current = now;

    try {
      console.log('📖 获取书签列表...');
      
      // 构建查询参数
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const queryString = params.toString();
      const url = `/api/bookmarks${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      setBookmarks(response.data.sites || []);
      setError(null);
      console.log(`✅ 获取到 ${response.data.sites?.length || 0} 个书签`);
    } catch (error) {
      console.error('❌ 获取书签列表失败:', error);
      const appError = handleError.generic(error, { operation: 'fetch_bookmarks' });
      setError(appError.getUserMessage());
    } finally {
      isApiCallInProgress.current = false;
    }
  };

  /**
   * 获取分类列表
   */
  const fetchCategories = async () => {
    try {
      console.log('📂 获取分类列表...');
      const response = await api.get('/api/categories');
      setCategories(response.data || []);
      console.log(`✅ 获取到 ${response.data?.length || 0} 个分类`);
    } catch (error) {
      console.error('❌ 获取分类列表失败:', error);
    }
  };

  /**
   * 保存书签
   */
  const saveBookmark = async () => {
    try {
      setIsLoading(true);
      
      if (operationMode === OperationMode.CREATE) {
        console.log('📝 创建新书签...');
        await api.post('/api/bookmarks', formData);
        console.log('✅ 书签创建成功');
      } else if (operationMode === OperationMode.EDIT) {
        console.log('📝 更新书签...');
        await api.put(`/api/bookmarks/${formData.id}`, formData);
        console.log('✅ 书签更新成功');
      }
      
      // 刷新书签列表
      await fetchBookmarks();
      setOperationMode(OperationMode.VIEW);
      resetForm();
      
    } catch (error) {
      console.error('❌ 保存书签失败:', error);
      const appError = handleError.generic(error, { operation: 'save_bookmark' });
      setError(appError.getUserMessage());
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 删除书签
   */
  const deleteBookmark = async (bookmarkId) => {
    if (!confirm('确定要删除这个书签吗？')) {
      return;
    }

    try {
      setIsLoading(true);
      console.log(`🗑️ 删除书签: ${bookmarkId}`);
      await api.delete(`/api/bookmarks/${bookmarkId}`);
      console.log('✅ 书签删除成功');
      
      // 刷新书签列表
      await fetchBookmarks();
      
    } catch (error) {
      console.error('❌ 删除书签失败:', error);
      const appError = handleError.generic(error, { operation: 'delete_bookmark' });
      setError(appError.getUserMessage());
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      url: '',
      description: '',
      shortDesc: '',
      category: '',
      icon: ''
    });
    setSelectedBookmark(null);
  };

  /**
   * 开始创建书签
   */
  const startCreate = () => {
    resetForm();
    setOperationMode(OperationMode.CREATE);
  };

  /**
   * 开始编辑书签
   */
  const startEdit = (bookmark) => {
    setFormData({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || '',
      shortDesc: bookmark.shortDesc || '',
      category: bookmark.category,
      icon: bookmark.icon || ''
    });
    setSelectedBookmark(bookmark);
    setOperationMode(OperationMode.EDIT);
  };

  /**
   * 取消操作
   */
  const cancelOperation = () => {
    setOperationMode(OperationMode.VIEW);
    resetForm();
  };

  /**
   * 处理表单输入
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * 生成唯一ID
   */
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  /**
   * 处理搜索
   */
  const handleSearch = () => {
    fetchBookmarks();
  };

  // 组件初始化
  useEffect(() => {
    let isComponentMounted = true;

    const initBookmarkManager = async () => {
      if (!isComponentMounted) return;
      
      try {
        setIsLoading(true);
        await Promise.all([fetchCategories(), fetchBookmarks()]);
      } catch (error) {
        console.error('初始化书签管理器失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 使用 requestIdleCallback 优化性能
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        if (isComponentMounted) {
          initBookmarkManager();
        }
      });
    } else {
      setTimeout(() => {
        if (isComponentMounted) {
          initBookmarkManager();
        }
      }, 100);
    }

    return () => {
      isComponentMounted = false;
    };
  }, []);

  // 监听搜索和分类变化
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBookmarks();
    }, 300); // 防抖

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory]);

  /**
   * 渲染工具栏
   */
  const renderToolbar = () => (
    <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* 搜索框 */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索书签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          </div>

          {/* 分类筛选 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">所有分类</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {operationMode === OperationMode.VIEW ? (
            <button
              onClick={startCreate}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              新增书签
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveBookmark}
                disabled={!formData.title || !formData.url || !formData.category}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <span>💾</span>
                保存
              </button>
              <button
                onClick={cancelOperation}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <span>❌</span>
                取消
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /**
   * 渲染书签表单
   */
  const renderBookmarkForm = () => {
    if (operationMode === OperationMode.VIEW) return null;

    return (
      <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {operationMode === OperationMode.CREATE ? '新增书签' : '编辑书签'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 书签标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入书签标题"
            />
          </div>

          {/* 书签URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>

          {/* 分类选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              分类 *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">选择分类</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* 图标URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              图标URL
            </label>
            <input
              type="url"
              value={formData.icon}
              onChange={(e) => handleInputChange('icon', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="图标URL（可选）"
            />
          </div>

          {/* 描述 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="书签描述（可选）"
            />
          </div>

          {/* 自动生成ID */}
          {operationMode === OperationMode.CREATE && !formData.id && formData.title && (
            <input
              type="hidden"
              value={formData.id = generateId()}
              onChange={() => {}}
            />
          )}
        </div>
      </div>
    );
  };

  /**
   * 渲染书签列表
   */
  const renderBookmarkList = () => {
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
              onClick={fetchBookmarks}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    if (bookmarks.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无书签
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery || selectedCategory ? '没有找到符合条件的书签' : '还没有添加任何书签'}
          </p>
          {!searchQuery && !selectedCategory && (
            <button
              onClick={startCreate}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              添加第一个书签
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {bookmarks.map(bookmark => {
          const category = categories.find(cat => cat.id === bookmark.category);
          return (
            <div
              key={bookmark.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src={bookmark.icon || '/images/default.svg'}
                    alt={bookmark.title}
                    className="w-8 h-8 rounded flex-shrink-0"
                    onError={(e) => {
                      e.target.src = '/images/default.svg';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {bookmark.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {category?.icon} {category?.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => startEdit(bookmark)}
                    className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteBookmark(bookmark.id)}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {bookmark.description || bookmark.shortDesc}
              </p>
              
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
              >
                {bookmark.url}
              </a>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {renderToolbar()}
      {renderBookmarkForm()}
      {renderBookmarkList()}
    </div>
  );
}
