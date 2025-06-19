/**
 * 用户界面增强组件
 * 提供通知、快捷键、无障碍访问等用户体验增强功能
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { useState, useEffect, useRef } from 'react';

/**
 * 通知类型枚举
 */
const NotificationType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * 通知位置枚举
 */
const NotificationPosition = {
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left'
};

export default function UIEnhancementIsland() {
  const [notifications, setNotifications] = useState([]);
  const [isKeyboardNavEnabled, setIsKeyboardNavEnabled] = useState(false);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);
  const notificationIdRef = useRef(0);

  /**
   * 显示通知
   * @param {string} message - 通知消息
   * @param {string} type - 通知类型
   * @param {number} duration - 显示时长（毫秒）
   * @param {string} position - 显示位置
   */
  const showNotification = (message, type = NotificationType.INFO, duration = 5000, position = NotificationPosition.TOP_RIGHT) => {
    const id = ++notificationIdRef.current;
    const notification = {
      id,
      message,
      type,
      position,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, notification]);

    // 自动移除通知
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  /**
   * 移除通知
   * @param {number} id - 通知ID
   */
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  /**
   * 清空所有通知
   */
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  /**
   * 获取通知图标
   * @param {string} type - 通知类型
   * @returns {string}
   */
  const getNotificationIcon = (type) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return '✅';
      case NotificationType.ERROR:
        return '❌';
      case NotificationType.WARNING:
        return '⚠️';
      case NotificationType.INFO:
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  /**
   * 获取通知样式类
   * @param {string} type - 通知类型
   * @returns {string}
   */
  const getNotificationClass = (type) => {
    const baseClass = 'notification-item p-4 rounded-lg shadow-lg border-l-4 mb-3 transition-all duration-300 transform';
    
    switch (type) {
      case NotificationType.SUCCESS:
        return `${baseClass} bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200`;
      case NotificationType.ERROR:
        return `${baseClass} bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200`;
      case NotificationType.WARNING:
        return `${baseClass} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-200`;
      case NotificationType.INFO:
        return `${baseClass} bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-200`;
      default:
        return `${baseClass} bg-gray-50 dark:bg-gray-900/20 border-gray-500 text-gray-800 dark:text-gray-200`;
    }
  };

  /**
   * 获取通知容器位置样式
   * @param {string} position - 位置
   * @returns {string}
   */
  const getPositionClass = (position) => {
    switch (position) {
      case NotificationPosition.TOP_RIGHT:
        return 'top-4 right-4';
      case NotificationPosition.TOP_LEFT:
        return 'top-4 left-4';
      case NotificationPosition.BOTTOM_RIGHT:
        return 'bottom-4 right-4';
      case NotificationPosition.BOTTOM_LEFT:
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  /**
   * 处理键盘导航
   * @param {KeyboardEvent} event - 键盘事件
   */
  const handleKeyboardNavigation = (event) => {
    if (!isKeyboardNavEnabled) return;

    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    switch (event.key) {
      case 'Tab':
        if (event.shiftKey) {
          // Shift + Tab: 向前导航
          setCurrentFocusIndex(prev => {
            const newIndex = prev <= 0 ? focusableElements.length - 1 : prev - 1;
            focusableElements[newIndex]?.focus();
            return newIndex;
          });
        } else {
          // Tab: 向后导航
          setCurrentFocusIndex(prev => {
            const newIndex = prev >= focusableElements.length - 1 ? 0 : prev + 1;
            focusableElements[newIndex]?.focus();
            return newIndex;
          });
        }
        event.preventDefault();
        break;

      case 'Escape':
        // Esc: 退出键盘导航模式
        setIsKeyboardNavEnabled(false);
        setCurrentFocusIndex(-1);
        break;

      case 'Enter':
      case ' ':
        // Enter/Space: 激活当前焦点元素
        if (currentFocusIndex >= 0 && focusableElements[currentFocusIndex]) {
          focusableElements[currentFocusIndex].click();
        }
        break;
    }
  };

  /**
   * 启用键盘导航
   */
  const enableKeyboardNavigation = () => {
    setIsKeyboardNavEnabled(true);
    setCurrentFocusIndex(0);
    
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  };

  /**
   * 复制文本到剪贴板
   * @param {string} text - 要复制的文本
   * @returns {Promise<boolean>}
   */
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showNotification('已复制到剪贴板', NotificationType.SUCCESS, 2000);
        return true;
      } else {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          showNotification('已复制到剪贴板', NotificationType.SUCCESS, 2000);
          return true;
        } else {
          throw new Error('复制失败');
        }
      }
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      showNotification('复制失败', NotificationType.ERROR, 3000);
      return false;
    }
  };

  /**
   * 检测用户偏好设置
   */
  const detectUserPreferences = () => {
    // 检测是否偏好减少动画
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    }

    // 检测是否偏好高对比度
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast) {
      document.documentElement.classList.add('high-contrast');
    }

    // 检测是否偏好深色模式
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('用户偏好深色模式:', prefersDarkMode);
  };

  /**
   * 添加无障碍访问支持
   */
  const addAccessibilitySupport = () => {
    // 为没有 alt 属性的图片添加默认描述
    const images = document.querySelectorAll('img:not([alt])');
    images.forEach(img => {
      img.setAttribute('alt', '图片');
    });

    // 为没有 aria-label 的按钮添加描述
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(button => {
      const text = button.textContent?.trim();
      if (text) {
        button.setAttribute('aria-label', text);
      }
    });

    // 添加跳转到主内容的链接
    if (!document.querySelector('#skip-to-main')) {
      const skipLink = document.createElement('a');
      skipLink.id = 'skip-to-main';
      skipLink.href = '#main-content';
      skipLink.textContent = '跳转到主内容';
      skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50';
      document.body.insertBefore(skipLink, document.body.firstChild);
    }
  };

  // 组件初始化
  useEffect(() => {
    // 检测用户偏好
    detectUserPreferences();
    
    // 添加无障碍访问支持
    addAccessibilitySupport();

    // 监听键盘事件
    document.addEventListener('keydown', handleKeyboardNavigation);

    // 监听 Alt + K 启用键盘导航
    const handleGlobalKeydown = (event) => {
      if (event.altKey && event.key === 'k') {
        event.preventDefault();
        enableKeyboardNavigation();
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);

    // 暴露全局方法
    window.showNotification = showNotification;
    window.copyToClipboard = copyToClipboard;
    window.enableKeyboardNavigation = enableKeyboardNavigation;

    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [isKeyboardNavEnabled, currentFocusIndex]);

  /**
   * 按位置分组通知
   */
  const notificationsByPosition = notifications.reduce((acc, notification) => {
    const position = notification.position || NotificationPosition.TOP_RIGHT;
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(notification);
    return acc;
  }, {});

  return (
    <>
      {/* 通知容器 */}
      {Object.entries(notificationsByPosition).map(([position, positionNotifications]) => (
        <div
          key={position}
          className={`fixed z-50 max-w-sm w-full ${getPositionClass(position)}`}
        >
          {positionNotifications.map(notification => (
            <div
              key={notification.id}
              className={getNotificationClass(notification.type)}
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start">
                <span className="text-lg mr-3 flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{notification.message}</p>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="关闭通知"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* 键盘导航指示器 */}
      {isKeyboardNavEnabled && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span>⌨️</span>
            <span className="text-sm">键盘导航模式</span>
            <span className="text-xs opacity-75">按 Esc 退出</span>
          </div>
        </div>
      )}

      {/* 无障碍访问帮助 */}
      <div className="sr-only" aria-live="polite" id="accessibility-announcements">
        {/* 屏幕阅读器公告区域 */}
      </div>
    </>
  );
}

// 导出通知相关的工具函数
export {
  NotificationType,
  NotificationPosition
};
