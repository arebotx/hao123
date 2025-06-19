/**
 * 统一的 API 客户端
 * 基于 WeatherIsland 的 API 调用模式，提供标准化的请求处理
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

/**
 * API 客户端配置
 */
const DEFAULT_CONFIG = {
  timeout: 4000, // 默认超时时间 4 秒
  retryAttempts: 2, // 重试次数
  retryDelay: 1000, // 重试延迟
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Content-Type': 'application/json'
  }
};

/**
 * API 请求限流管理
 */
class RequestThrottler {
  constructor() {
    this.activeRequests = new Map(); // 正在进行的请求
    this.lastRequestTimes = new Map(); // 最后请求时间
    this.minInterval = 1000; // 最小请求间隔 1 秒
  }

  /**
   * 检查是否可以发起请求
   * @param {string} key - 请求标识
   * @returns {boolean}
   */
  canMakeRequest(key) {
    const now = Date.now();
    const lastTime = this.lastRequestTimes.get(key) || 0;
    
    if (this.activeRequests.has(key)) {
      console.log(`API 请求正在进行中，跳过重复请求: ${key}`);
      return false;
    }
    
    if (now - lastTime < this.minInterval) {
      console.log(`API 请求过于频繁，跳过请求: ${key}`);
      return false;
    }
    
    return true;
  }

  /**
   * 标记请求开始
   * @param {string} key - 请求标识
   */
  markRequestStart(key) {
    this.activeRequests.set(key, true);
    this.lastRequestTimes.set(key, Date.now());
  }

  /**
   * 标记请求结束
   * @param {string} key - 请求标识
   */
  markRequestEnd(key) {
    this.activeRequests.delete(key);
  }
}

// 全局请求限流器
const requestThrottler = new RequestThrottler();

/**
 * 统一的 API 客户端类
 */
export class ApiClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 发起 HTTP 请求
   * @param {string} url - 请求 URL
   * @param {Object} options - 请求选项
   * @returns {Promise<Response>}
   */
  async request(url, options = {}) {
    const requestKey = `${options.method || 'GET'}_${url}`;
    
    // 检查请求限流
    if (!requestThrottler.canMakeRequest(requestKey)) {
      throw new Error('请求过于频繁，请稍后再试');
    }

    requestThrottler.markRequestStart(requestKey);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const requestOptions = {
        signal: controller.signal,
        headers: { ...this.config.headers, ...options.headers },
        ...options
      };

      console.log(`发起 API 请求: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      console.log(`API 请求成功: ${url}`);
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      console.error(`API 请求失败: ${url}`, error);
      throw error;
    } finally {
      requestThrottler.markRequestEnd(requestKey);
    }
  }

  /**
   * GET 请求
   * @param {string} url - 请求 URL
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  async get(url, options = {}) {
    const response = await this.request(url, { ...options, method: 'GET' });
    return response.json();
  }

  /**
   * POST 请求
   * @param {string} url - 请求 URL
   * @param {any} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  async post(url, data, options = {}) {
    const response = await this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  }

  /**
   * PUT 请求
   * @param {string} url - 请求 URL
   * @param {any} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  async put(url, data, options = {}) {
    const response = await this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  }

  /**
   * DELETE 请求
   * @param {string} url - 请求 URL
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  async delete(url, options = {}) {
    const response = await this.request(url, { ...options, method: 'DELETE' });
    return response.json();
  }

  /**
   * 带重试的请求
   * @param {Function} requestFn - 请求函数
   * @param {number} attempts - 重试次数
   * @returns {Promise<any>}
   */
  async requestWithRetry(requestFn, attempts = this.config.retryAttempts) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempts > 0 && !error.message.includes('请求过于频繁')) {
        console.log(`请求失败，${this.config.retryDelay}ms 后重试，剩余重试次数: ${attempts}`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.requestWithRetry(requestFn, attempts - 1);
      }
      throw error;
    }
  }
}

// 默认 API 客户端实例
export const apiClient = new ApiClient();

/**
 * 便捷的 API 调用函数
 */
export const api = {
  get: (url, options) => apiClient.get(url, options),
  post: (url, data, options) => apiClient.post(url, data, options),
  put: (url, data, options) => apiClient.put(url, data, options),
  delete: (url, options) => apiClient.delete(url, options),
  
  // 带重试的请求
  getWithRetry: (url, options) => apiClient.requestWithRetry(() => apiClient.get(url, options)),
  postWithRetry: (url, data, options) => apiClient.requestWithRetry(() => apiClient.post(url, data, options))
};
