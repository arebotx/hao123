/**
 * 缓存管理器
 * 基于 WeatherIsland 的 weatherCacheRef 模式，提供统一的缓存管理
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

/**
 * 缓存策略枚举
 */
export const CacheStrategy = {
  MEMORY: 'memory',           // 内存缓存
  SESSION: 'session',         // 会话存储
  LOCAL: 'local',            // 本地存储
  HYBRID: 'hybrid'           // 混合策略（内存 + 本地存储）
};

/**
 * 默认缓存配置
 */
const DEFAULT_CACHE_CONFIG = {
  strategy: CacheStrategy.MEMORY,
  defaultTTL: 3600000,       // 默认过期时间 1 小时
  maxSize: 100,              // 最大缓存条目数
  cleanupInterval: 300000    // 清理间隔 5 分钟
};

/**
 * 缓存条目结构
 * @typedef {Object} CacheEntry
 * @property {any} data - 缓存数据
 * @property {number} timestamp - 创建时间戳
 * @property {number} ttl - 生存时间（毫秒）
 * @property {string} key - 缓存键
 */

/**
 * 内存缓存实现
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.accessTimes = new Map(); // 记录访问时间，用于 LRU
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   * @param {number} ttl - 生存时间
   */
  set(key, data, ttl) {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    };
    
    this.cache.set(key, entry);
    this.accessTimes.set(key, Date.now());
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any|null}
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    this.accessTimes.set(key, now);
    return entry.data;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    this.accessTimes.delete(key);
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
  }

  /**
   * 获取缓存大小
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
      }
    }
  }

  /**
   * LRU 清理（当缓存满时移除最久未访问的条目）
   * @param {number} maxSize - 最大缓存大小
   */
  evictLRU(maxSize) {
    if (this.cache.size <= maxSize) return;

    const sortedByAccess = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1]);

    const toRemove = sortedByAccess.slice(0, this.cache.size - maxSize);
    toRemove.forEach(([key]) => this.delete(key));
  }
}

/**
 * 存储缓存实现（localStorage/sessionStorage）
 */
class StorageCache {
  constructor(storage) {
    this.storage = storage;
    this.prefix = 'cloudnav_cache_';
  }

  /**
   * 生成存储键
   * @param {string} key - 原始键
   * @returns {string}
   */
  getStorageKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   * @param {number} ttl - 生存时间
   */
  set(key, data, ttl) {
    try {
      const entry = {
        data,
        timestamp: Date.now(),
        ttl,
        key
      };
      this.storage.setItem(this.getStorageKey(key), JSON.stringify(entry));
    } catch (error) {
      console.warn('存储缓存失败:', error);
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any|null}
   */
  get(key) {
    try {
      const item = this.storage.getItem(this.getStorageKey(key));
      if (!item) return null;

      const entry = JSON.parse(item);
      const now = Date.now();
      
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('读取缓存失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    try {
      this.storage.removeItem(this.getStorageKey(key));
    } catch (error) {
      console.warn('删除缓存失败:', error);
    }
  }

  /**
   * 清空缓存
   */
  clear() {
    try {
      const keys = Object.keys(this.storage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          this.storage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('清空缓存失败:', error);
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    try {
      const keys = Object.keys(this.storage);
      const now = Date.now();
      
      keys.forEach(storageKey => {
        if (storageKey.startsWith(this.prefix)) {
          const item = this.storage.getItem(storageKey);
          if (item) {
            try {
              const entry = JSON.parse(item);
              if (now - entry.timestamp > entry.ttl) {
                this.storage.removeItem(storageKey);
              }
            } catch (parseError) {
              // 删除无效的缓存条目
              this.storage.removeItem(storageKey);
            }
          }
        }
      });
    } catch (error) {
      console.warn('清理缓存失败:', error);
    }
  }
}

/**
 * 缓存管理器主类
 */
export class CacheManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.initializeCache();
    this.startCleanupTimer();
  }

  /**
   * 初始化缓存实现
   */
  initializeCache() {
    switch (this.config.strategy) {
      case CacheStrategy.MEMORY:
        this.cache = new MemoryCache();
        break;
      case CacheStrategy.SESSION:
        this.cache = new StorageCache(sessionStorage);
        break;
      case CacheStrategy.LOCAL:
        this.cache = new StorageCache(localStorage);
        break;
      case CacheStrategy.HYBRID:
        this.memoryCache = new MemoryCache();
        this.storageCache = new StorageCache(localStorage);
        break;
      default:
        this.cache = new MemoryCache();
    }
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   * @param {number} ttl - 生存时间（可选，使用默认值）
   */
  set(key, data, ttl = this.config.defaultTTL) {
    if (this.config.strategy === CacheStrategy.HYBRID) {
      this.memoryCache.set(key, data, ttl);
      this.storageCache.set(key, data, ttl);
    } else {
      this.cache.set(key, data, ttl);
      
      // 检查缓存大小限制
      if (this.cache.size && this.cache.size() > this.config.maxSize) {
        this.cache.evictLRU && this.cache.evictLRU(this.config.maxSize);
      }
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any|null}
   */
  get(key) {
    if (this.config.strategy === CacheStrategy.HYBRID) {
      // 先尝试内存缓存
      let data = this.memoryCache.get(key);
      if (data !== null) {
        return data;
      }
      
      // 再尝试存储缓存
      data = this.storageCache.get(key);
      if (data !== null) {
        // 将数据重新放入内存缓存
        this.memoryCache.set(key, data, this.config.defaultTTL);
        return data;
      }
      
      return null;
    } else {
      return this.cache.get(key);
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    if (this.config.strategy === CacheStrategy.HYBRID) {
      this.memoryCache.delete(key);
      this.storageCache.delete(key);
    } else {
      this.cache.delete(key);
    }
  }

  /**
   * 清空所有缓存
   */
  clear() {
    if (this.config.strategy === CacheStrategy.HYBRID) {
      this.memoryCache.clear();
      this.storageCache.clear();
    } else {
      this.cache.clear();
    }
  }

  /**
   * 启动定时清理
   */
  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止定时清理
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 手动清理过期缓存
   */
  cleanup() {
    if (this.config.strategy === CacheStrategy.HYBRID) {
      this.memoryCache.cleanup();
      this.storageCache.cleanup();
    } else {
      this.cache.cleanup && this.cache.cleanup();
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy() {
    this.stopCleanupTimer();
    this.clear();
  }
}

// 默认缓存管理器实例
export const cacheManager = new CacheManager();

/**
 * 便捷的缓存操作函数
 */
export const cache = {
  set: (key, data, ttl) => cacheManager.set(key, data, ttl),
  get: (key) => cacheManager.get(key),
  delete: (key) => cacheManager.delete(key),
  clear: () => cacheManager.clear(),
  cleanup: () => cacheManager.cleanup()
};
