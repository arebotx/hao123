/**
 * 导入导出界面组件
 * 基于现有 Island 组件模式，提供 Chrome 书签的导入导出功能
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { useState, useEffect, useRef } from 'react';
import { handleError } from '../utils/error-handler.js';
import { api } from '../utils/api-client.js';
import { parseBookmarks } from '../utils/bookmark-parser.js';

/**
 * 操作模式枚举
 */
const OperationMode = {
  IMPORT: 'import',
  EXPORT: 'export'
};

/**
 * 导入状态枚举
 */
const ImportStatus = {
  IDLE: 'idle',
  PARSING: 'parsing',
  PREVIEWING: 'previewing',
  IMPORTING: 'importing',
  COMPLETED: 'completed',
  ERROR: 'error'
};

export default function ImportExportIsland() {
  const [currentMode, setCurrentMode] = useState(OperationMode.IMPORT);
  const [importStatus, setImportStatus] = useState(ImportStatus.IDLE);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // 文件输入引用
  const fileInputRef = useRef(null);
  
  // API 调用控制
  const isApiCallInProgress = useRef(false);

  /**
   * 处理文件选择
   */
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.html')) {
      setError('请选择 HTML 格式的书签文件');
      return;
    }

    // 验证文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccessMessage('');
    
    // 自动开始解析
    await parseBookmarkFile(file);
  };

  /**
   * 解析书签文件
   */
  const parseBookmarkFile = async (file) => {
    try {
      setImportStatus(ImportStatus.PARSING);
      setError(null);
      
      console.log('📖 开始解析书签文件...');
      
      // 使用书签解析器解析文件
      const result = await parseBookmarks.chrome(file);
      
      setParseResult(result);
      setImportStatus(ImportStatus.PREVIEWING);
      
      console.log(`✅ 解析完成: ${result.categories.length} 个分类, ${result.sites.length} 个书签`);
      
    } catch (error) {
      console.error('❌ 解析书签文件失败:', error);
      setError(error.message || '解析书签文件失败');
      setImportStatus(ImportStatus.ERROR);
    }
  };

  /**
   * 确认导入书签
   */
  const confirmImport = async () => {
    if (!parseResult || isApiCallInProgress.current) return;

    try {
      isApiCallInProgress.current = true;
      setImportStatus(ImportStatus.IMPORTING);
      setImportProgress(0);
      setError(null);

      console.log('📥 开始导入书签...');

      // 调用导入 API
      const response = await api.post('/api/import/chrome', {
        categories: parseResult.categories,
        sites: parseResult.sites,
        options: {
          mergeMode: 'append', // 追加模式
          downloadIcons: true  // 自动下载图标
        }
      });

      setImportProgress(100);
      setImportStatus(ImportStatus.COMPLETED);
      setSuccessMessage(`导入成功！共导入 ${response.data.importedSites} 个书签，${response.data.importedCategories} 个分类`);
      
      console.log('✅ 书签导入完成');

    } catch (error) {
      console.error('❌ 导入书签失败:', error);
      const appError = handleError.generic(error, { operation: 'import_bookmarks' });
      setError(appError.getUserMessage());
      setImportStatus(ImportStatus.ERROR);
    } finally {
      isApiCallInProgress.current = false;
    }
  };

  /**
   * 导出书签
   */
  const exportBookmarks = async () => {
    if (isApiCallInProgress.current) return;

    try {
      isApiCallInProgress.current = true;
      setError(null);
      setSuccessMessage('');

      console.log('📤 开始导出书签...');

      // 调用导出 API
      const response = await api.get('/api/export/chrome');
      
      // 创建下载链接
      const blob = new Blob([response.data], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookmarks_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      setSuccessMessage('书签导出成功！文件已开始下载');
      console.log('✅ 书签导出完成');

    } catch (error) {
      console.error('❌ 导出书签失败:', error);
      const appError = handleError.generic(error, { operation: 'export_bookmarks' });
      setError(appError.getUserMessage());
    } finally {
      isApiCallInProgress.current = false;
    }
  };

  /**
   * 重置导入状态
   */
  const resetImport = () => {
    setImportStatus(ImportStatus.IDLE);
    setSelectedFile(null);
    setParseResult(null);
    setImportProgress(0);
    setError(null);
    setSuccessMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 切换模式
   */
  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    resetImport();
  };

  /**
   * 渲染模式切换标签
   */
  const renderModeTabs = () => (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex">
        <button
          onClick={() => handleModeChange(OperationMode.IMPORT)}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentMode === OperationMode.IMPORT
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
          }`}
        >
          <span className="mr-2">📥</span>
          导入书签
        </button>
        <button
          onClick={() => handleModeChange(OperationMode.EXPORT)}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentMode === OperationMode.EXPORT
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
          }`}
        >
          <span className="mr-2">📤</span>
          导出书签
        </button>
      </div>
    </div>
  );

  /**
   * 渲染导入界面
   */
  const renderImportInterface = () => (
    <div className="p-6 space-y-6">
      {/* 文件上传区域 */}
      {importStatus === ImportStatus.IDLE && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            选择 Chrome 书签文件
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            请选择从 Chrome 浏览器导出的 HTML 格式书签文件
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            选择文件
          </button>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            支持的格式：HTML（最大 10MB）
          </div>
        </div>
      )}

      {/* 解析进度 */}
      {importStatus === ImportStatus.PARSING && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-gray-600 dark:text-gray-300 flex items-end justify-center">
            正在解析书签文件
            <span className="inline-block ml-px font-bold animate-wave">.</span>
            <span className="inline-block ml-px font-bold animate-wave [animation-delay:0.1s]">.</span>
            <span className="inline-block ml-px font-bold animate-wave [animation-delay:0.2s]">.</span>
          </div>
        </div>
      )}

      {/* 预览结果 */}
      {importStatus === ImportStatus.PREVIEWING && parseResult && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📋 导入预览
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {parseResult.categories.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">分类</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {parseResult.sites.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">书签</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {selectedFile ? Math.round(selectedFile.size / 1024) : 0}KB
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">文件大小</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  HTML
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">文件格式</div>
              </div>
            </div>

            {/* 分类预览 */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">分类预览：</h4>
              <div className="flex flex-wrap gap-2">
                {parseResult.categories.slice(0, 10).map((category, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {category.icon} {category.name} ({category.sites.length})
                  </span>
                ))}
                {parseResult.categories.length > 10 && (
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
                    +{parseResult.categories.length - 10} 更多...
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmImport}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <span>✅</span>
                确认导入
              </button>
              <button
                onClick={resetImport}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <span>❌</span>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入进度 */}
      {importStatus === ImportStatus.IMPORTING && (
        <div className="text-center py-8">
          <div className="text-2xl mb-4">📥</div>
          <div className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            正在导入书签...
          </div>
          <div className="w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {importProgress}%
          </div>
        </div>
      )}

      {/* 完成状态 */}
      {importStatus === ImportStatus.COMPLETED && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            导入完成！
          </h3>
          <p className="text-green-600 dark:text-green-400 mb-4">
            {successMessage}
          </p>
          <button
            onClick={resetImport}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            导入更多书签
          </button>
        </div>
      )}
    </div>
  );

  /**
   * 渲染导出界面
   */
  const renderExportInterface = () => (
    <div className="p-6">
      <div className="max-w-md mx-auto text-center">
        <div className="text-4xl mb-4">📤</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          导出书签
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          将当前的书签数据导出为 Chrome 浏览器兼容的 HTML 格式文件
        </p>
        
        <button
          onClick={exportBookmarks}
          disabled={isApiCallInProgress.current}
          className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
        >
          <span>📥</span>
          {isApiCallInProgress.current ? '导出中...' : '开始导出'}
        </button>
        
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>导出的文件可以直接导入到 Chrome 浏览器中</p>
          <p className="mt-1">Chrome → 书签 → 书签管理器 → 导入书签</p>
        </div>
      </div>
    </div>
  );

  /**
   * 渲染错误信息
   */
  const renderError = () => {
    if (!error) return null;

    return (
      <div className="mx-6 mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <div className="flex items-center">
          <span className="text-red-500 mr-2">❌</span>
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      </div>
    );
  };

  /**
   * 渲染成功信息
   */
  const renderSuccess = () => {
    if (!successMessage) return null;

    return (
      <div className="mx-6 mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <div className="flex items-center">
          <span className="text-green-500 mr-2">✅</span>
          <span className="text-green-700 dark:text-green-400">{successMessage}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {renderModeTabs()}
      {renderError()}
      {renderSuccess()}
      {currentMode === OperationMode.IMPORT ? renderImportInterface() : renderExportInterface()}
    </div>
  );
}
