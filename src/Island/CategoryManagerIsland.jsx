/**
 * 分类管理组件
 * 基于现有 Island 组件模式，提供分类的增删改查功能
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

/**
 * 常用图标列表
 */
const COMMON_ICONS = [
  '📂', '📁', '🔖', '⭐', '💼', '🎯', '🔧', '🎨', '📚', '🌐',
  '💻', '📱', '🎮', '🎵', '📺', '🛒', '🏠', '🚗', '✈️', '🍔',
  '⚽', '🎪', '🎭', '🎨', '📰', '💰', '🏥', '🎓', '🔬', '🌟'
];

export default function CategoryManagerIsland() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operationMode, setOperationMode] = useState(OperationMode.VIEW);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '',
    description: ''
  });

  // API 调用控制
  const isApiCallInProgress = useRef(false);
  const lastApiCallTime = useRef(0);
  const MIN_API_INTERVAL = 1000;

  /**
   * 获取分类列表
   */
  const fetchCategories = async () => {
    if (isApiCallInProgress.current) {
      console.log('分类 API 调用正在进行中，跳过重复请求');
      return;
    }

    const now = Date.now();
    if (now - lastApiCallTime.current < MIN_API_INTERVAL) {
      console.log('分类 API 调用过于频繁，跳过请求');
      return;
    }

    isApiCallInProgress.current = true;
    lastApiCallTime.current = now;

    try {
      console.log('📂 获取分类列表...');
      const response = await api.get('/api/categories?includeStats=true');
      setCategories(response.data || []);
      setError(null);
      console.log(`✅ 获取到 ${response.data?.length || 0} 个分类`);
    } catch (error) {
      console.error('❌ 获取分类列表失败:', error);
      const appError = handleError.generic(error, { operation: 'fetch_categories' });
      setError(appError.getUserMessage());
    } finally {
      setIsLoading(false);
      isApiCallInProgress.current = false;
    }
  };

  /**
   * 保存分类
   */
  const saveCategory = async () => {
    try {
      setIsLoading(true);
      
      if (operationMode === OperationMode.CREATE) {
        console.log('📝 创建新分类...');
        await api.post('/api/categories', formData);
        console.log('✅ 分类创建成功');
      } else if (operationMode === OperationMode.EDIT) {
        console.log('📝 更新分类...');
        await api.put(`/api/categories/${formData.id}`, formData);
        console.log('✅ 分类更新成功');
      }
      
      // 刷新分类列表
      await fetchCategories();
      setOperationMode(OperationMode.VIEW);
      resetForm();
      
    } catch (error) {
      console.error('❌ 保存分类失败:', error);
      const appError = handleError.generic(error, { operation: 'save_category' });
      setError(appError.getUserMessage());
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 删除分类
   */
  const deleteCategory = async (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    const siteCount = category?.siteCount || 0;
    
    if (siteCount > 0) {
      alert(`无法删除分类"${category.name}"，还有 ${siteCount} 个书签使用此分类。请先移动或删除这些书签。`);
      return;
    }

    if (!confirm(`确定要删除分类"${category.name}"吗？`)) {
      return;
    }

    try {
      setIsLoading(true);
      console.log(`🗑️ 删除分类: ${categoryId}`);
      await api.delete(`/api/categories/${categoryId}`);
      console.log('✅ 分类删除成功');
      
      // 刷新分类列表
      await fetchCategories();
      
    } catch (error) {
      console.error('❌ 删除分类失败:', error);
      const appError = handleError.generic(error, { operation: 'delete_category' });
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
      name: '',
      icon: '',
      description: ''
    });
    setSelectedCategory(null);
  };

  /**
   * 开始创建分类
   */
  const startCreate = () => {
    resetForm();
    setOperationMode(OperationMode.CREATE);
  };

  /**
   * 开始编辑分类
   */
  const startEdit = (category) => {
    setFormData({
      id: category.id,
      name: category.name,
      icon: category.icon || '',
      description: category.description || ''
    });
    setSelectedCategory(category);
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
   * 生成分类ID
   */
  const generateId = (name) => {
    // 基于名称生成ID，移除特殊字符并转为小写
    return name.toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
      .substring(0, 20) + '_' + Date.now().toString(36);
  };

  /**
   * 选择图标
   */
  const selectIcon = (icon) => {
    handleInputChange('icon', icon);
  };

  // 组件初始化
  useEffect(() => {
    let isComponentMounted = true;

    const initCategoryManager = () => {
      if (!isComponentMounted) return;
      
      // 使用 requestIdleCallback 优化性能
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          if (isComponentMounted) {
            fetchCategories();
          }
        });
      } else {
        setTimeout(() => {
          if (isComponentMounted) {
            fetchCategories();
          }
        }, 100);
      }
    };

    initCategoryManager();

    return () => {
      isComponentMounted = false;
    };
  }, []);

  /**
   * 渲染工具栏
   */
  const renderToolbar = () => (
    <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          📂 分类管理
        </h2>
        
        {operationMode === OperationMode.VIEW ? (
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            新增分类
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={saveCategory}
              disabled={!formData.name || !formData.icon}
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
  );

  /**
   * 渲染分类表单
   */
  const renderCategoryForm = () => {
    if (operationMode === OperationMode.VIEW) return null;

    return (
      <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {operationMode === OperationMode.CREATE ? '新增分类' : '编辑分类'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {/* 分类名称 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                分类名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  handleInputChange('name', e.target.value);
                  // 自动生成ID
                  if (operationMode === OperationMode.CREATE && e.target.value) {
                    handleInputChange('id', generateId(e.target.value));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入分类名称"
              />
            </div>

            {/* 分类描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                分类描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="分类描述（可选）"
              />
            </div>
          </div>

          <div>
            {/* 图标选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                分类图标 *
              </label>
              
              {/* 当前选中的图标 */}
              <div className="mb-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {formData.icon || '❓'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.icon ? '当前图标' : '请选择图标'}
                  </div>
                </div>
              </div>

              {/* 图标选择器 */}
              <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                {COMMON_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => selectIcon(icon)}
                    className={`p-2 text-xl rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                      formData.icon === icon 
                        ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' 
                        : ''
                    }`}
                    title={`选择图标: ${icon}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              {/* 自定义图标输入 */}
              <div className="mt-3">
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => handleInputChange('icon', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="或输入自定义图标"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染分类列表
   */
  const renderCategoryList = () => {
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
              onClick={fetchCategories}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    if (categories.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无分类
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            还没有创建任何分类
          </p>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            创建第一个分类
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {categories.map(category => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-2xl flex-shrink-0">
                  {category.icon || '📂'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {category.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {category.siteCount || 0} 个书签
                  </p>
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => startEdit(category)}
                  className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                  title="编辑"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteCategory(category.id)}
                  className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  title="删除"
                  disabled={category.siteCount > 0}
                >
                  🗑️
                </button>
              </div>
            </div>
            
            {category.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {category.description}
              </p>
            )}
            
            <div className="text-xs text-gray-500 dark:text-gray-500">
              ID: {category.id}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {renderToolbar()}
      {renderCategoryForm()}
      {renderCategoryList()}
    </div>
  );
}
