/**
 * 统一数据管理器
 * 提供静态文件和 KV 存储的统一访问接口，支持自动切换和数据同步
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { categories as staticCategories, sites as staticSites, searchSites, sitesToHtml } from './navLinks.js';
import { kvAdapter, KV_KEYS } from './kv-adapter.js';
import { handleError, ErrorType } from '../utils/error-handler.js';
import { cache } from '../utils/cache-manager.js';

/**
 * 数据源类型枚举
 */
export const DataSource = {
  STATIC: 'static',    // 静态文件
  KV: 'kv',           // KV 存储
  HYBRID: 'hybrid'    // 混合模式
};

/**
 * 数据管理器类
 */
export class DataManager {
  constructor() {
    this.dataSource = DataSource.STATIC;
    this.isInitialized = false;
    this.cachePrefix = 'dm_';
    this.cacheTTL = 600000; // 10 分钟缓存
    this.init();
  }

  /**
   * 初始化数据管理器
   */
  async init() {
    try {
      console.log('🔄 初始化数据管理器...');
      
      // 检查 KV 是否可用
      if (kvAdapter.isKVAvailable()) {
        // 检查版本兼容性
        const isCompatible = await kvAdapter.checkVersionCompatibility();
        if (isCompatible) {
          this.dataSource = DataSource.KV;
          console.log('✅ 使用 KV 存储模式');
        } else {
          console.warn('⚠️ KV 数据版本不兼容，使用静态数据模式');
          this.dataSource = DataSource.STATIC;
        }
      } else {
        this.dataSource = DataSource.STATIC;
        console.log('📁 使用静态数据模式');
      }

      this.isInitialized = true;
      console.log(`✅ 数据管理器初始化完成，数据源: ${this.dataSource}`);
    } catch (error) {
      console.error('数据管理器初始化失败:', error);
      this.dataSource = DataSource.STATIC;
      this.isInitialized = true;
    }
  }

  /**
   * 确保已初始化
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
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
   * 获取分类列表
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Array>}
   */
  async getCategories(useCache = true) {
    await this.ensureInitialized();
    
    try {
      const cacheKey = this.getCacheKey('categories');
      
      // 尝试从缓存获取
      if (useCache) {
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          console.log('从缓存获取分类数据');
          return cachedData;
        }
      }

      let categories;
      
      if (this.dataSource === DataSource.KV) {
        // 从 KV 获取
        categories = await kvAdapter.get(KV_KEYS.CATEGORIES);
        if (!categories) {
          console.log('KV 中无分类数据，使用静态数据');
          categories = staticCategories;
        }
      } else {
        // 使用静态数据
        categories = staticCategories;
      }

      // 缓存数据
      cache.set(cacheKey, categories, this.cacheTTL);
      
      console.log(`获取分类数据成功: ${categories.length} 个分类`);
      return categories;
    } catch (error) {
      console.error('获取分类数据失败:', error);
      // 降级到静态数据
      return staticCategories;
    }
  }

  /**
   * 获取网站列表
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Array>}
   */
  async getSites(useCache = true) {
    await this.ensureInitialized();
    
    try {
      const cacheKey = this.getCacheKey('sites');
      
      // 尝试从缓存获取
      if (useCache) {
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          console.log('从缓存获取网站数据');
          return cachedData;
        }
      }

      let sites;
      
      if (this.dataSource === DataSource.KV) {
        // 从 KV 获取
        sites = await kvAdapter.get(KV_KEYS.SITES);
        if (!sites) {
          console.log('KV 中无网站数据，使用静态数据');
          sites = staticSites;
        }
      } else {
        // 使用静态数据
        sites = staticSites;
      }

      // 缓存数据
      cache.set(cacheKey, sites, this.cacheTTL);
      
      console.log(`获取网站数据成功: ${sites.length} 个网站`);
      return sites;
    } catch (error) {
      console.error('获取网站数据失败:', error);
      // 降级到静态数据
      return staticSites;
    }
  }

  /**
   * 获取指定分类的网站
   * @param {string} categoryId - 分类 ID
   * @returns {Promise<Array>}
   */
  async getSitesByCategory(categoryId) {
    const sites = await this.getSites();
    return sites.filter(site => site.category === categoryId);
  }

  /**
   * 搜索网站
   * @param {string} query - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchSites(query) {
    const sites = await this.getSites();
    
    if (!query) return sites;
    
    const lowerQuery = query.toLowerCase();
    return sites.filter(site => {
      return (
        site.title.toLowerCase().includes(lowerQuery) ||
        site.description.toLowerCase().includes(lowerQuery) ||
        site.shortDesc.toLowerCase().includes(lowerQuery) ||
        site.category.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 保存分类列表
   * @param {Array} categories - 分类数组
   * @returns {Promise<void>}
   */
  async saveCategories(categories) {
    await this.ensureInitialized();
    
    try {
      if (this.dataSource === DataSource.KV) {
        await kvAdapter.set(KV_KEYS.CATEGORIES, categories);
        console.log('✅ 分类数据已保存到 KV');
      } else {
        throw new Error('静态数据模式不支持保存操作');
      }

      // 更新缓存
      const cacheKey = this.getCacheKey('categories');
      cache.set(cacheKey, categories, this.cacheTTL);
      
      // 更新元数据
      await this.updateMetadata('categories', categories.length);
      
    } catch (error) {
      console.error('保存分类数据失败:', error);
      throw handleError.generic(error, { operation: 'save_categories' });
    }
  }

  /**
   * 保存网站列表
   * @param {Array} sites - 网站数组
   * @returns {Promise<void>}
   */
  async saveSites(sites) {
    await this.ensureInitialized();
    
    try {
      if (this.dataSource === DataSource.KV) {
        await kvAdapter.set(KV_KEYS.SITES, sites);
        console.log('✅ 网站数据已保存到 KV');
      } else {
        throw new Error('静态数据模式不支持保存操作');
      }

      // 更新缓存
      const cacheKey = this.getCacheKey('sites');
      cache.set(cacheKey, sites, this.cacheTTL);
      
      // 更新元数据
      await this.updateMetadata('sites', sites.length);
      
    } catch (error) {
      console.error('保存网站数据失败:', error);
      throw handleError.generic(error, { operation: 'save_sites' });
    }
  }

  /**
   * 添加新分类
   * @param {Object} category - 分类对象
   * @returns {Promise<void>}
   */
  async addCategory(category) {
    const categories = await this.getCategories();
    
    // 检查 ID 是否已存在
    if (categories.find(cat => cat.id === category.id)) {
      throw handleError.validation(`分类 ID "${category.id}" 已存在`);
    }
    
    categories.push(category);
    await this.saveCategories(categories);
    
    console.log(`✅ 新增分类: ${category.name}`);
  }

  /**
   * 更新分类
   * @param {string} categoryId - 分类 ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<void>}
   */
  async updateCategory(categoryId, updates) {
    const categories = await this.getCategories();
    const index = categories.findIndex(cat => cat.id === categoryId);
    
    if (index === -1) {
      throw handleError.validation(`分类 "${categoryId}" 不存在`);
    }
    
    categories[index] = { ...categories[index], ...updates };
    await this.saveCategories(categories);
    
    console.log(`✅ 更新分类: ${categoryId}`);
  }

  /**
   * 删除分类
   * @param {string} categoryId - 分类 ID
   * @returns {Promise<void>}
   */
  async deleteCategory(categoryId) {
    const categories = await this.getCategories();
    const sites = await this.getSites();
    
    // 检查是否有网站使用此分类
    const sitesInCategory = sites.filter(site => site.category === categoryId);
    if (sitesInCategory.length > 0) {
      throw handleError.validation(`无法删除分类 "${categoryId}"，还有 ${sitesInCategory.length} 个网站使用此分类`);
    }
    
    const filteredCategories = categories.filter(cat => cat.id !== categoryId);
    await this.saveCategories(filteredCategories);
    
    console.log(`✅ 删除分类: ${categoryId}`);
  }

  /**
   * 添加新网站
   * @param {Object} site - 网站对象
   * @returns {Promise<void>}
   */
  async addSite(site) {
    const sites = await this.getSites();
    
    // 检查 ID 是否已存在
    if (sites.find(s => s.id === site.id)) {
      throw handleError.validation(`网站 ID "${site.id}" 已存在`);
    }
    
    // 检查 URL 是否已存在
    if (sites.find(s => s.url === site.url)) {
      throw handleError.validation(`网站 URL "${site.url}" 已存在`);
    }
    
    sites.push(site);
    await this.saveSites(sites);
    
    console.log(`✅ 新增网站: ${site.title}`);
  }

  /**
   * 更新网站
   * @param {string} siteId - 网站 ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<void>}
   */
  async updateSite(siteId, updates) {
    const sites = await this.getSites();
    const index = sites.findIndex(site => site.id === siteId);
    
    if (index === -1) {
      throw handleError.validation(`网站 "${siteId}" 不存在`);
    }
    
    sites[index] = { ...sites[index], ...updates };
    await this.saveSites(sites);
    
    console.log(`✅ 更新网站: ${siteId}`);
  }

  /**
   * 删除网站
   * @param {string} siteId - 网站 ID
   * @returns {Promise<void>}
   */
  async deleteSite(siteId) {
    const sites = await this.getSites();
    const filteredSites = sites.filter(site => site.id !== siteId);
    
    if (filteredSites.length === sites.length) {
      throw handleError.validation(`网站 "${siteId}" 不存在`);
    }
    
    await this.saveSites(filteredSites);
    
    console.log(`✅ 删除网站: ${siteId}`);
  }

  /**
   * 更新元数据
   * @param {string} type - 数据类型
   * @param {number} count - 数据数量
   * @returns {Promise<void>}
   */
  async updateMetadata(type, count) {
    try {
      if (this.dataSource === DataSource.KV) {
        const metadata = await kvAdapter.get(KV_KEYS.METADATA) || {};
        metadata[type] = {
          count,
          lastUpdated: Date.now()
        };
        await kvAdapter.set(KV_KEYS.METADATA, metadata);
      }
    } catch (error) {
      console.warn('更新元数据失败:', error);
    }
  }

  /**
   * 获取元数据
   * @returns {Promise<Object>}
   */
  async getMetadata() {
    try {
      if (this.dataSource === DataSource.KV) {
        return await kvAdapter.get(KV_KEYS.METADATA) || {};
      }
      return {};
    } catch (error) {
      console.warn('获取元数据失败:', error);
      return {};
    }
  }

  /**
   * 清除缓存
   * @param {string} type - 可选的数据类型
   */
  clearCache(type = null) {
    if (type) {
      const cacheKey = this.getCacheKey(type);
      cache.delete(cacheKey);
      console.log(`清除数据缓存: ${type}`);
    } else {
      // 清除所有数据管理器缓存
      cache.delete(this.getCacheKey('categories'));
      cache.delete(this.getCacheKey('sites'));
      console.log('清除所有数据缓存');
    }
  }

  /**
   * 获取数据源信息
   * @returns {Object}
   */
  getDataSourceInfo() {
    return {
      source: this.dataSource,
      isKVAvailable: kvAdapter.isKVAvailable(),
      isInitialized: this.isInitialized
    };
  }
}

// 默认数据管理器实例
export const dataManager = new DataManager();

/**
 * 便捷的数据操作函数（保持与原 navLinks.js 的兼容性）
 */
export const data = {
  // 获取数据
  getCategories: () => dataManager.getCategories(),
  getSites: () => dataManager.getSites(),
  getSitesByCategory: (categoryId) => dataManager.getSitesByCategory(categoryId),
  searchSites: (query) => dataManager.searchSites(query),
  
  // 管理操作（仅在 KV 模式下可用）
  addCategory: (category) => dataManager.addCategory(category),
  updateCategory: (id, updates) => dataManager.updateCategory(id, updates),
  deleteCategory: (id) => dataManager.deleteCategory(id),
  addSite: (site) => dataManager.addSite(site),
  updateSite: (id, updates) => dataManager.updateSite(id, updates),
  deleteSite: (id) => dataManager.deleteSite(id),
  
  // 工具函数
  clearCache: (type) => dataManager.clearCache(type),
  getDataSourceInfo: () => dataManager.getDataSourceInfo(),
  getMetadata: () => dataManager.getMetadata()
};

// 保持与原 navLinks.js 的兼容性
export { searchSites, sitesToHtml };
