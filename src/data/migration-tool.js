/**
 * 数据迁移工具
 * 用于在静态文件和 KV 存储之间迁移数据，确保数据完整性
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { categories as staticCategories, sites as staticSites, dataVersion } from './navLinks.js';
import { kvAdapter, KV_KEYS, DATA_VERSION } from './kv-adapter.js';
import { dataManager } from './data-manager.js';
import { handleError, ErrorType } from '../utils/error-handler.js';

/**
 * 迁移状态枚举
 */
export const MigrationStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * 数据迁移工具类
 */
export class MigrationTool {
  constructor() {
    this.status = MigrationStatus.NOT_STARTED;
    this.progress = 0;
    this.errors = [];
    this.migrationLog = [];
  }

  /**
   * 记录迁移日志
   * @param {string} message - 日志信息
   * @param {string} level - 日志级别
   */
  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    this.migrationLog.push(logEntry);
    console.log(`[Migration ${level.toUpperCase()}] ${message}`);
  }

  /**
   * 检查迁移前置条件
   * @returns {Promise<boolean>}
   */
  async checkPrerequisites() {
    try {
      this.log('检查迁移前置条件...');
      
      // 检查 KV 是否可用
      if (!kvAdapter.isKVAvailable()) {
        throw new Error('KV 存储不可用，无法进行迁移');
      }

      // 检查静态数据是否存在
      if (!staticCategories || !staticSites) {
        throw new Error('静态数据不完整，无法进行迁移');
      }

      // 检查数据格式
      if (!Array.isArray(staticCategories) || !Array.isArray(staticSites)) {
        throw new Error('静态数据格式错误');
      }

      this.log('✅ 前置条件检查通过');
      return true;
    } catch (error) {
      this.log(`❌ 前置条件检查失败: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 验证数据完整性
   * @param {Array} categories - 分类数据
   * @param {Array} sites - 网站数据
   * @returns {boolean}
   */
  validateData(categories, sites) {
    try {
      this.log('验证数据完整性...');
      
      // 验证分类数据
      for (const category of categories) {
        if (!category.id || !category.name) {
          throw new Error(`分类数据不完整: ${JSON.stringify(category)}`);
        }
      }

      // 验证网站数据
      for (const site of sites) {
        if (!site.id || !site.title || !site.url || !site.category) {
          throw new Error(`网站数据不完整: ${JSON.stringify(site)}`);
        }
        
        // 检查分类是否存在
        if (!categories.find(cat => cat.id === site.category)) {
          throw new Error(`网站 "${site.title}" 引用了不存在的分类: ${site.category}`);
        }
      }

      // 检查 ID 唯一性
      const categoryIds = categories.map(cat => cat.id);
      const siteIds = sites.map(site => site.id);
      
      if (new Set(categoryIds).size !== categoryIds.length) {
        throw new Error('分类 ID 存在重复');
      }
      
      if (new Set(siteIds).size !== siteIds.length) {
        throw new Error('网站 ID 存在重复');
      }

      this.log('✅ 数据完整性验证通过');
      return true;
    } catch (error) {
      this.log(`❌ 数据验证失败: ${error.message}`, 'error');
      this.errors.push(error.message);
      return false;
    }
  }

  /**
   * 从静态文件迁移到 KV
   * @returns {Promise<boolean>}
   */
  async migrateToKV() {
    try {
      this.status = MigrationStatus.IN_PROGRESS;
      this.progress = 0;
      this.errors = [];
      this.migrationLog = [];
      
      this.log('🚀 开始从静态文件迁移到 KV 存储...');
      
      // 检查前置条件
      if (!(await this.checkPrerequisites())) {
        this.status = MigrationStatus.FAILED;
        return false;
      }
      this.progress = 10;

      // 验证数据完整性
      if (!this.validateData(staticCategories, staticSites)) {
        this.status = MigrationStatus.FAILED;
        return false;
      }
      this.progress = 20;

      // 检查 KV 中是否已有数据
      const existingCategories = await kvAdapter.get(KV_KEYS.CATEGORIES);
      const existingSites = await kvAdapter.get(KV_KEYS.SITES);
      
      if (existingCategories || existingSites) {
        this.log('⚠️ KV 中已存在数据，将进行覆盖', 'warn');
      }
      this.progress = 30;

      // 迁移分类数据
      this.log(`迁移分类数据: ${staticCategories.length} 个分类`);
      await kvAdapter.set(KV_KEYS.CATEGORIES, staticCategories);
      this.progress = 50;

      // 迁移网站数据
      this.log(`迁移网站数据: ${staticSites.length} 个网站`);
      await kvAdapter.set(KV_KEYS.SITES, staticSites);
      this.progress = 70;

      // 设置元数据
      const metadata = {
        categories: {
          count: staticCategories.length,
          lastUpdated: Date.now()
        },
        sites: {
          count: staticSites.length,
          lastUpdated: Date.now()
        },
        migration: {
          fromVersion: dataVersion.version,
          toVersion: DATA_VERSION.CURRENT,
          timestamp: Date.now(),
          source: 'static_to_kv'
        }
      };
      await kvAdapter.set(KV_KEYS.METADATA, metadata);
      this.progress = 85;

      // 设置版本信息
      await kvAdapter.setVersion(DATA_VERSION.CURRENT);
      this.progress = 95;

      // 清除缓存
      dataManager.clearCache();
      this.progress = 100;

      this.status = MigrationStatus.COMPLETED;
      this.log('✅ 迁移完成！');
      
      return true;
    } catch (error) {
      this.status = MigrationStatus.FAILED;
      this.log(`❌ 迁移失败: ${error.message}`, 'error');
      this.errors.push(error.message);
      return false;
    }
  }

  /**
   * 从 KV 导出到静态文件格式
   * @returns {Promise<Object|null>}
   */
  async exportFromKV() {
    try {
      this.log('📤 从 KV 导出数据...');
      
      if (!kvAdapter.isKVAvailable()) {
        throw new Error('KV 存储不可用');
      }

      // 获取数据
      const categories = await kvAdapter.get(KV_KEYS.CATEGORIES);
      const sites = await kvAdapter.get(KV_KEYS.SITES);
      const metadata = await kvAdapter.get(KV_KEYS.METADATA);
      
      if (!categories || !sites) {
        throw new Error('KV 中无有效数据');
      }

      // 验证数据
      if (!this.validateData(categories, sites)) {
        throw new Error('KV 数据验证失败');
      }

      const exportData = {
        version: DATA_VERSION.CURRENT,
        timestamp: Date.now(),
        categories,
        sites,
        metadata
      };

      this.log(`✅ 导出完成: ${categories.length} 个分类, ${sites.length} 个网站`);
      return exportData;
    } catch (error) {
      this.log(`❌ 导出失败: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * 生成静态文件代码
   * @param {Object} exportData - 导出的数据
   * @returns {string}
   */
  generateStaticFileCode(exportData) {
    const { categories, sites } = exportData;
    
    let code = `/**
 * 网站导航数据
 * 由数据迁移工具自动生成
 * 生成时间: ${new Date().toISOString()}
 * 数据版本: ${exportData.version}
 */

/**
 * 数据版本信息
 * @type {Object}
 */
export const dataVersion = {
  version: '${exportData.version}',
  timestamp: ${exportData.timestamp},
  source: 'kv_export'
};

/**
 * 网站分类列表
 * @type {Array<{id: string, name: string, icon: string}>}
 */
export const categories = ${JSON.stringify(categories, null, 2)};

/**
 * 网站列表
 * @type {Array<{id: string, title: string, description: string, shortDesc: string, url: string, icon: string, category: string}>}
 */
export const sites = ${JSON.stringify(sites, null, 2)};

/**
 * 搜索网站
 * @param {string} query
 * @returns {Array}
 */
export function searchSites(query) {
  if (!query) return sites;
  const lowerQuery = query.toLowerCase();
  return sites.filter(site => {
    return (
      site.title.toLowerCase().includes(lowerQuery) ||
      site.description.toLowerCase().includes(lowerQuery) ||
      site.category.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * 将网站列表转换为 HTML
 * @param {Array} sitesList
 * @returns {string}
 */
export function sitesToHtml(sitesList) {
  if (!sitesList || !sitesList.length) return '<p>没有找到符合条件的网站</p>';
  const html = sitesList.map(site => {
    const safeTitle = escapeHtml(site.title);
    const safeDesc = escapeHtml(site.shortDesc || site.description);
    const safeUrl = escapeHtml(site.url);
    const safeIcon = escapeHtml(site.icon || '/images/default.svg');
    return \`
      <div class="site-card" data-category="\${site.category}">
        <a href="\${safeUrl}" target="_blank" rel="noopener noreferrer">
          <div class="site-icon">
            <img src="\${safeIcon}" alt="\${safeTitle}" loading="lazy" onerror="this.src='/images/default.svg'">
          </div>
          <div class="site-info">
            <h3>\${safeTitle}</h3>
            <p>\${safeDesc}</p>
          </div>
        </a>
      </div>
    \`;
  }).join('');
  return \`<div class="sites-grid">\${html}</div>\`;
}

/**
 * HTML 转义函数
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
`;

    return code;
  }

  /**
   * 获取迁移状态
   * @returns {Object}
   */
  getStatus() {
    return {
      status: this.status,
      progress: this.progress,
      errors: this.errors,
      log: this.migrationLog
    };
  }

  /**
   * 重置迁移状态
   */
  reset() {
    this.status = MigrationStatus.NOT_STARTED;
    this.progress = 0;
    this.errors = [];
    this.migrationLog = [];
  }
}

// 默认迁移工具实例
export const migrationTool = new MigrationTool();

/**
 * 便捷的迁移操作函数
 */
export const migration = {
  toKV: () => migrationTool.migrateToKV(),
  fromKV: () => migrationTool.exportFromKV(),
  generateCode: (data) => migrationTool.generateStaticFileCode(data),
  getStatus: () => migrationTool.getStatus(),
  reset: () => migrationTool.reset()
};
