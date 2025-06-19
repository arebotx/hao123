/**
 * Cloudflare KV 数据适配器
 * 提供对 Cloudflare KV 存储的 CRUD 操作，支持批量操作和事务处理
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { handleError, ErrorType } from '../utils/error-handler.js';
import { cache } from '../utils/cache-manager.js';

/**
 * KV 存储键名常量
 */
export const KV_KEYS = {
  CATEGORIES: 'bookmarks:categories',
  SITES: 'bookmarks:sites',
  METADATA: 'bookmarks:metadata',
  STATS_CLICKS: 'stats:clicks',
  STATS_SEARCHES: 'stats:searches',
  STATS_PAGES: 'stats:pages',
  STATS_CATEGORIES: 'stats:categories',
  STATS_TIME: 'stats:time',
  STATS_BOOKMARKS: 'stats:bookmarks',
  STATS_USAGE: 'stats:usage',
  CONFIG_SETTINGS: 'config:settings',
  VERSION: 'data:version'
};

/**
 * 数据版本信息
 */
export const DATA_VERSION = {
  CURRENT: '1.0.0',
  COMPATIBLE: ['1.0.0']
};

/**
 * KV 适配器类
 */
export class KVAdapter {
  constructor(kvNamespace = null) {
    this.kv = kvNamespace;
    this.isAvailable = false;
    this.cachePrefix = 'kv_';
    this.cacheTTL = 300000; // 5 分钟缓存
    this.init();
  }

  /**
   * 初始化 KV 适配器
   */
  init() {
    try {
      // 在 Cloudflare Workers 环境中，KV 通过全局变量访问
      if (typeof BOOKMARKS_KV !== 'undefined') {
        this.kv = BOOKMARKS_KV;
        this.isAvailable = true;
        console.log('✅ KV 存储已连接');
      } else if (this.kv) {
        this.isAvailable = true;
        console.log('✅ KV 存储已手动设置');
      } else {
        console.log('⚠️ KV 存储不可用，将使用静态数据模式');
        this.isAvailable = false;
      }
    } catch (error) {
      console.warn('KV 存储初始化失败:', error);
      this.isAvailable = false;
    }
  }

  /**
   * 检查 KV 是否可用
   * @returns {boolean}
   */
  isKVAvailable() {
    return this.isAvailable && this.kv;
  }

  /**
   * 生成缓存键
   * @param {string} key - 原始键
   * @returns {string}
   */
  getCacheKey(key) {
    return `${this.cachePrefix}${key}`;
  }

  /**
   * 获取数据
   * @param {string} key - 存储键
   * @param {Object} options - 选项
   * @returns {Promise<any>}
   */
  async get(key, options = {}) {
    try {
      if (!this.isKVAvailable()) {
        throw new Error('KV 存储不可用');
      }

      // 先尝试从缓存获取
      const cacheKey = this.getCacheKey(key);
      const cachedData = cache.get(cacheKey);
      if (cachedData && !options.skipCache) {
        console.log(`从缓存获取数据: ${key}`);
        return cachedData;
      }

      console.log(`从 KV 获取数据: ${key}`);
      const value = await this.kv.get(key, options.type || 'json');
      
      if (value === null) {
        return null;
      }

      // 缓存数据
      cache.set(cacheKey, value, this.cacheTTL);
      
      return value;
    } catch (error) {
      console.error(`KV 获取数据失败 [${key}]:`, error);
      throw handleError.network(error, { operation: 'kv_get', key });
    }
  }

  /**
   * 设置数据
   * @param {string} key - 存储键
   * @param {any} value - 存储值
   * @param {Object} options - 选项
   * @returns {Promise<void>}
   */
  async set(key, value, options = {}) {
    try {
      if (!this.isKVAvailable()) {
        throw new Error('KV 存储不可用');
      }

      console.log(`向 KV 设置数据: ${key}`);
      
      // 设置到 KV
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: options.ttl,
        metadata: options.metadata
      });

      // 更新缓存
      const cacheKey = this.getCacheKey(key);
      cache.set(cacheKey, value, this.cacheTTL);

      console.log(`✅ KV 数据设置成功: ${key}`);
    } catch (error) {
      console.error(`KV 设置数据失败 [${key}]:`, error);
      throw handleError.network(error, { operation: 'kv_set', key });
    }
  }

  /**
   * 删除数据
   * @param {string} key - 存储键
   * @returns {Promise<void>}
   */
  async delete(key) {
    try {
      if (!this.isKVAvailable()) {
        throw new Error('KV 存储不可用');
      }

      console.log(`从 KV 删除数据: ${key}`);
      
      // 从 KV 删除
      await this.kv.delete(key);

      // 从缓存删除
      const cacheKey = this.getCacheKey(key);
      cache.delete(cacheKey);

      console.log(`✅ KV 数据删除成功: ${key}`);
    } catch (error) {
      console.error(`KV 删除数据失败 [${key}]:`, error);
      throw handleError.network(error, { operation: 'kv_delete', key });
    }
  }

  /**
   * 列出键
   * @param {Object} options - 选项
   * @returns {Promise<Array>}
   */
  async list(options = {}) {
    try {
      if (!this.isKVAvailable()) {
        throw new Error('KV 存储不可用');
      }

      console.log('列出 KV 键');
      const result = await this.kv.list(options);
      return result.keys || [];
    } catch (error) {
      console.error('KV 列出键失败:', error);
      throw handleError.network(error, { operation: 'kv_list' });
    }
  }

  /**
   * 批量获取数据
   * @param {string[]} keys - 键数组
   * @returns {Promise<Object>}
   */
  async batchGet(keys) {
    try {
      if (!this.isKVAvailable()) {
        throw new Error('KV 存储不可用');
      }

      console.log(`批量获取 KV 数据: ${keys.length} 个键`);
      
      const results = {};
      const promises = keys.map(async (key) => {
        try {
          const value = await this.get(key);
          results[key] = value;
        } catch (error) {
          console.warn(`批量获取失败 [${key}]:`, error);
          results[key] = null;
        }
      });

      await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('KV 批量获取失败:', error);
      throw handleError.network(error, { operation: 'kv_batch_get', keys });
    }
  }

  /**
   * 批量设置数据
   * @param {Object} data - 键值对对象
   * @returns {Promise<void>}
   */
  async batchSet(data) {
    try {
      if (!this.isKVAvailable()) {
        throw new Error('KV 存储不可用');
      }

      const keys = Object.keys(data);
      console.log(`批量设置 KV 数据: ${keys.length} 个键`);
      
      const promises = keys.map(async (key) => {
        try {
          await this.set(key, data[key]);
        } catch (error) {
          console.error(`批量设置失败 [${key}]:`, error);
          throw error;
        }
      });

      await Promise.all(promises);
      console.log(`✅ KV 批量设置成功: ${keys.length} 个键`);
    } catch (error) {
      console.error('KV 批量设置失败:', error);
      throw handleError.network(error, { operation: 'kv_batch_set', keys: Object.keys(data) });
    }
  }

  /**
   * 清除缓存
   * @param {string} key - 可选的特定键
   */
  clearCache(key = null) {
    if (key) {
      const cacheKey = this.getCacheKey(key);
      cache.delete(cacheKey);
      console.log(`清除缓存: ${key}`);
    } else {
      // 清除所有 KV 相关缓存
      cache.clear();
      console.log('清除所有 KV 缓存');
    }
  }

  /**
   * 获取数据版本信息
   * @returns {Promise<Object>}
   */
  async getVersion() {
    try {
      const version = await this.get(KV_KEYS.VERSION);
      return version || { version: DATA_VERSION.CURRENT, timestamp: Date.now() };
    } catch (error) {
      console.warn('获取数据版本失败:', error);
      return { version: DATA_VERSION.CURRENT, timestamp: Date.now() };
    }
  }

  /**
   * 设置数据版本信息
   * @param {string} version - 版本号
   * @returns {Promise<void>}
   */
  async setVersion(version = DATA_VERSION.CURRENT) {
    try {
      const versionInfo = {
        version,
        timestamp: Date.now(),
        compatible: DATA_VERSION.COMPATIBLE
      };
      await this.set(KV_KEYS.VERSION, versionInfo);
    } catch (error) {
      console.error('设置数据版本失败:', error);
      throw error;
    }
  }

  /**
   * 检查数据版本兼容性
   * @returns {Promise<boolean>}
   */
  async checkVersionCompatibility() {
    try {
      const versionInfo = await this.getVersion();
      const currentVersion = versionInfo.version;
      
      if (DATA_VERSION.COMPATIBLE.includes(currentVersion)) {
        return true;
      }
      
      console.warn(`数据版本不兼容: 当前 ${currentVersion}, 支持 ${DATA_VERSION.COMPATIBLE.join(', ')}`);
      return false;
    } catch (error) {
      console.error('检查版本兼容性失败:', error);
      return false;
    }
  }
}

// 默认 KV 适配器实例
export const kvAdapter = new KVAdapter();

/**
 * 便捷的 KV 操作函数
 */
export const kv = {
  get: (key, options) => kvAdapter.get(key, options),
  set: (key, value, options) => kvAdapter.set(key, value, options),
  delete: (key) => kvAdapter.delete(key),
  list: (options) => kvAdapter.list(options),
  batchGet: (keys) => kvAdapter.batchGet(keys),
  batchSet: (data) => kvAdapter.batchSet(data),
  isAvailable: () => kvAdapter.isKVAvailable(),
  clearCache: (key) => kvAdapter.clearCache(key)
};
