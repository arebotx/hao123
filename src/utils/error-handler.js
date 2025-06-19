/**
 * 统一错误处理工具
 * 基于 WeatherIsland 的错误处理模式，提供标准化的错误处理和用户反馈
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

/**
 * 错误类型枚举
 */
export const ErrorType = {
  NETWORK: 'network',           // 网络错误
  TIMEOUT: 'timeout',           // 超时错误
  VALIDATION: 'validation',     // 验证错误
  PERMISSION: 'permission',     // 权限错误
  NOT_FOUND: 'not_found',      // 资源未找到
  SERVER: 'server',            // 服务器错误
  UNKNOWN: 'unknown'           // 未知错误
};

/**
 * 错误级别枚举
 */
export const ErrorLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

/**
 * 中文错误信息映射
 */
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
  [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorType.VALIDATION]: '输入数据格式不正确',
  [ErrorType.PERMISSION]: '权限不足，无法执行此操作',
  [ErrorType.NOT_FOUND]: '请求的资源不存在',
  [ErrorType.SERVER]: '服务器内部错误，请稍后重试',
  [ErrorType.UNKNOWN]: '发生未知错误，请稍后重试'
};

/**
 * HTTP 状态码错误映射
 */
const HTTP_ERROR_MAP = {
  400: { type: ErrorType.VALIDATION, message: '请求参数错误' },
  401: { type: ErrorType.PERMISSION, message: '未授权访问' },
  403: { type: ErrorType.PERMISSION, message: '访问被拒绝' },
  404: { type: ErrorType.NOT_FOUND, message: '请求的资源不存在' },
  408: { type: ErrorType.TIMEOUT, message: '请求超时' },
  429: { type: ErrorType.NETWORK, message: '请求过于频繁，请稍后重试' },
  500: { type: ErrorType.SERVER, message: '服务器内部错误' },
  502: { type: ErrorType.SERVER, message: '网关错误' },
  503: { type: ErrorType.SERVER, message: '服务暂时不可用' },
  504: { type: ErrorType.TIMEOUT, message: '网关超时' }
};

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(message, type = ErrorType.UNKNOWN, level = ErrorLevel.ERROR, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.level = level;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 获取用户友好的错误信息
   * @returns {string}
   */
  getUserMessage() {
    return ERROR_MESSAGES[this.type] || this.message || ERROR_MESSAGES[ErrorType.UNKNOWN];
  }

  /**
   * 转换为 JSON 对象
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      level: this.level,
      details: this.details,
      timestamp: this.timestamp,
      userMessage: this.getUserMessage()
    };
  }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  constructor() {
    this.errorListeners = [];
    this.setupGlobalErrorHandlers();
  }

  /**
   * 设置全局错误处理器
   */
  setupGlobalErrorHandlers() {
    // 处理未捕获的 Promise 错误
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未处理的 Promise 错误:', event.reason);
      this.handleError(event.reason, ErrorLevel.ERROR);
      event.preventDefault();
    });

    // 处理全局 JavaScript 错误
    window.addEventListener('error', (event) => {
      console.error('全局 JavaScript 错误:', event.error);
      this.handleError(event.error, ErrorLevel.ERROR);
    });
  }

  /**
   * 添加错误监听器
   * @param {Function} listener - 错误监听函数
   */
  addErrorListener(listener) {
    this.errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   * @param {Function} listener - 错误监听函数
   */
  removeErrorListener(listener) {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 通知所有错误监听器
   * @param {AppError} error - 应用错误对象
   */
  notifyListeners(error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('错误监听器执行失败:', listenerError);
      }
    });
  }

  /**
   * 处理错误
   * @param {Error|string} error - 错误对象或错误信息
   * @param {string} level - 错误级别
   * @param {Object} context - 错误上下文
   * @returns {AppError}
   */
  handleError(error, level = ErrorLevel.ERROR, context = {}) {
    let appError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = this.parseError(error, level, context);
    } else {
      appError = new AppError(
        String(error),
        ErrorType.UNKNOWN,
        level,
        context
      );
    }

    // 记录错误日志
    this.logError(appError);

    // 通知监听器
    this.notifyListeners(appError);

    return appError;
  }

  /**
   * 解析原生错误对象
   * @param {Error} error - 原生错误对象
   * @param {string} level - 错误级别
   * @param {Object} context - 错误上下文
   * @returns {AppError}
   */
  parseError(error, level, context) {
    let type = ErrorType.UNKNOWN;
    let message = error.message;

    // 根据错误信息判断错误类型
    if (error.name === 'AbortError' || message.includes('超时')) {
      type = ErrorType.TIMEOUT;
    } else if (message.includes('网络') || message.includes('fetch')) {
      type = ErrorType.NETWORK;
    } else if (message.includes('权限') || message.includes('unauthorized')) {
      type = ErrorType.PERMISSION;
    } else if (message.includes('验证') || message.includes('validation')) {
      type = ErrorType.VALIDATION;
    } else if (message.includes('404') || message.includes('not found')) {
      type = ErrorType.NOT_FOUND;
    } else if (message.includes('500') || message.includes('server')) {
      type = ErrorType.SERVER;
    }

    return new AppError(message, type, level, { ...context, originalError: error });
  }

  /**
   * 解析 HTTP 错误
   * @param {Response} response - HTTP 响应对象
   * @param {Object} context - 错误上下文
   * @returns {AppError}
   */
  parseHttpError(response, context = {}) {
    const status = response.status;
    const errorInfo = HTTP_ERROR_MAP[status] || {
      type: ErrorType.SERVER,
      message: `HTTP ${status} 错误`
    };

    return new AppError(
      errorInfo.message,
      errorInfo.type,
      ErrorLevel.ERROR,
      { ...context, httpStatus: status, url: response.url }
    );
  }

  /**
   * 记录错误日志
   * @param {AppError} error - 应用错误对象
   */
  logError(error) {
    const logMethod = this.getLogMethod(error.level);
    logMethod(`[${error.type.toUpperCase()}] ${error.message}`, error.toJSON());
  }

  /**
   * 获取日志方法
   * @param {string} level - 错误级别
   * @returns {Function}
   */
  getLogMethod(level) {
    switch (level) {
      case ErrorLevel.INFO:
        return console.info;
      case ErrorLevel.WARN:
        return console.warn;
      case ErrorLevel.ERROR:
      case ErrorLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }
}

// 全局错误处理器实例
export const errorHandler = new ErrorHandler();

/**
 * 便捷的错误处理函数
 */
export const handleError = {
  /**
   * 处理网络错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {AppError}
   */
  network: (error, context = {}) => 
    errorHandler.handleError(error, ErrorLevel.ERROR, { ...context, source: 'network' }),

  /**
   * 处理验证错误
   * @param {string} message - 错误信息
   * @param {Object} context - 错误上下文
   * @returns {AppError}
   */
  validation: (message, context = {}) => 
    errorHandler.handleError(
      new AppError(message, ErrorType.VALIDATION, ErrorLevel.WARN),
      ErrorLevel.WARN,
      context
    ),

  /**
   * 处理权限错误
   * @param {string} message - 错误信息
   * @param {Object} context - 错误上下文
   * @returns {AppError}
   */
  permission: (message, context = {}) => 
    errorHandler.handleError(
      new AppError(message, ErrorType.PERMISSION, ErrorLevel.ERROR),
      ErrorLevel.ERROR,
      context
    ),

  /**
   * 处理 HTTP 错误
   * @param {Response} response - HTTP 响应对象
   * @param {Object} context - 错误上下文
   * @returns {AppError}
   */
  http: (response, context = {}) => {
    const error = errorHandler.parseHttpError(response, context);
    return errorHandler.handleError(error, error.level, context);
  },

  /**
   * 处理通用错误
   * @param {Error|string} error - 错误对象或信息
   * @param {Object} context - 错误上下文
   * @returns {AppError}
   */
  generic: (error, context = {}) => 
    errorHandler.handleError(error, ErrorLevel.ERROR, context)
};

/**
 * 错误边界 Hook（用于 React 组件）
 * @param {Function} onError - 错误处理回调
 * @returns {Function}
 */
export function useErrorBoundary(onError) {
  return (error, errorInfo) => {
    const appError = errorHandler.handleError(error, ErrorLevel.ERROR, errorInfo);
    onError && onError(appError);
  };
}
