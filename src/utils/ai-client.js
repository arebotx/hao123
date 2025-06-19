/**
 * Gemini AI 客户端封装
 * 提供书签智能分类和整理功能的 AI 服务
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { handleError, ErrorType } from './error-handler.js';

/**
 * AI 分类建议结构
 * @typedef {Object} CategorySuggestion
 * @property {string} siteId - 书签ID
 * @property {string} currentCategory - 当前分类
 * @property {string} suggestedCategory - 建议分类
 * @property {string} reason - 分类理由
 * @property {number} confidence - 置信度 (0-1)
 */

/**
 * Gemini AI 客户端类
 */
export class GeminiAIClient {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.isAvailable = false;
    this.apiKey = null;
    this.modelName = 'gemini-1.5-flash';
    this.maxRetries = 2;
    this.requestTimeout = 30000; // 30秒超时
    this.init();
  }

  /**
   * 初始化 AI 客户端
   */
  init() {
    try {
      // 检查 API Key
      this.apiKey = import.meta.env.GEMINI_API_KEY || 
                   (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null);
      
      if (!this.apiKey) {
        console.log('⚠️ Gemini API Key 未配置，AI 功能将不可用');
        this.isAvailable = false;
        return;
      }

      // 初始化 Gemini AI
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: this.modelName,
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });
      
      this.isAvailable = true;
      console.log('✅ Gemini AI 客户端初始化成功');
      
    } catch (error) {
      console.error('Gemini AI 初始化失败:', error);
      this.isAvailable = false;
    }
  }

  /**
   * 检查 AI 是否可用
   * @returns {boolean}
   */
  isAIAvailable() {
    return this.isAvailable && this.model;
  }

  /**
   * 生成书签分类建议
   * @param {Array} bookmarks - 书签数组
   * @param {Array} existingCategories - 现有分类
   * @returns {Promise<CategorySuggestion[]>}
   */
  async generateCategorySuggestions(bookmarks, existingCategories = []) {
    if (!this.isAIAvailable()) {
      throw new Error('Gemini AI 服务不可用');
    }

    try {
      console.log(`🤖 开始生成分类建议: ${bookmarks.length} 个书签`);
      
      // 构建提示词
      const prompt = this.buildCategorizationPrompt(bookmarks, existingCategories);
      
      // 调用 AI 生成内容
      const result = await this.callAIWithRetry(prompt);
      
      // 解析 AI 响应
      const suggestions = this.parseCategorizationResponse(result, bookmarks);
      
      console.log(`✅ 生成分类建议完成: ${suggestions.length} 个建议`);
      return suggestions;
      
    } catch (error) {
      console.error('❌ 生成分类建议失败:', error);
      throw handleError.generic(error, { operation: 'generate_category_suggestions' });
    }
  }

  /**
   * 构建分类提示词
   * @param {Array} bookmarks - 书签数组
   * @param {Array} existingCategories - 现有分类
   * @returns {string}
   */
  buildCategorizationPrompt(bookmarks, existingCategories) {
    const categoryList = existingCategories.map(cat => `- ${cat.name}: ${cat.description || cat.name}`).join('\n');
    
    const bookmarkList = bookmarks.map(bookmark => 
      `ID: ${bookmark.id}\n标题: ${bookmark.title}\nURL: ${bookmark.url}\n描述: ${bookmark.description || bookmark.shortDesc || ''}\n当前分类: ${bookmark.category}`
    ).join('\n\n');

    return `你是一个专业的书签分类助手。请根据书签的标题、URL和描述，为每个书签推荐最合适的分类。

现有分类：
${categoryList}

需要分类的书签：
${bookmarkList}

请按照以下JSON格式返回分类建议，每个书签一个建议：

{
  "suggestions": [
    {
      "siteId": "书签ID",
      "currentCategory": "当前分类",
      "suggestedCategory": "建议分类名称",
      "reason": "分类理由（简短说明）",
      "confidence": 0.95
    }
  ]
}

分类规则：
1. 优先使用现有分类，如果现有分类不合适，可以建议新分类
2. 分类名称要简洁明了，使用中文
3. 置信度范围 0.0-1.0，表示分类的确定程度
4. 理由要简洁，说明为什么这样分类
5. 考虑网站的主要功能和用途
6. 相似功能的网站应该归为同一类

请只返回JSON格式的结果，不要包含其他文字。`;
  }

  /**
   * 调用 AI 并重试
   * @param {string} prompt - 提示词
   * @returns {Promise<string>}
   */
  async callAIWithRetry(prompt) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🤖 调用 Gemini AI (尝试 ${attempt}/${this.maxRetries})`);
        
        // 设置超时
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI 请求超时')), this.requestTimeout);
        });
        
        const aiPromise = this.model.generateContent(prompt);
        
        const result = await Promise.race([aiPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();
        
        if (!text) {
          throw new Error('AI 返回空响应');
        }
        
        console.log(`✅ AI 调用成功 (尝试 ${attempt})`);
        return text;
        
      } catch (error) {
        lastError = error;
        console.warn(`❌ AI 调用失败 (尝试 ${attempt}/${this.maxRetries}):`, error.message);
        
        if (attempt < this.maxRetries) {
          // 指数退避
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ 等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 解析 AI 分类响应
   * @param {string} response - AI 响应文本
   * @param {Array} bookmarks - 原始书签数组
   * @returns {CategorySuggestion[]}
   */
  parseCategorizationResponse(response, bookmarks) {
    try {
      // 清理响应文本，移除可能的 markdown 标记
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(cleanResponse);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('AI 响应格式无效：缺少 suggestions 数组');
      }
      
      // 验证和清理建议
      const validSuggestions = [];
      const bookmarkMap = new Map(bookmarks.map(b => [b.id, b]));
      
      for (const suggestion of parsed.suggestions) {
        if (!suggestion.siteId || !bookmarkMap.has(suggestion.siteId)) {
          console.warn(`跳过无效建议：书签ID ${suggestion.siteId} 不存在`);
          continue;
        }
        
        const bookmark = bookmarkMap.get(suggestion.siteId);
        
        validSuggestions.push({
          siteId: suggestion.siteId,
          currentCategory: bookmark.category,
          suggestedCategory: suggestion.suggestedCategory || '未分类',
          reason: suggestion.reason || '无理由',
          confidence: Math.max(0, Math.min(1, suggestion.confidence || 0.5))
        });
      }
      
      console.log(`✅ 解析完成: ${validSuggestions.length}/${parsed.suggestions.length} 个有效建议`);
      return validSuggestions;
      
    } catch (error) {
      console.error('解析 AI 响应失败:', error);
      console.log('原始响应:', response);
      
      // 返回空建议而不是抛出错误
      return [];
    }
  }

  /**
   * 生成新分类建议
   * @param {Array} bookmarks - 书签数组
   * @returns {Promise<Array>}
   */
  async generateNewCategories(bookmarks) {
    if (!this.isAIAvailable()) {
      throw new Error('Gemini AI 服务不可用');
    }

    try {
      console.log(`🤖 生成新分类建议: ${bookmarks.length} 个书签`);
      
      const bookmarkList = bookmarks.map(bookmark => 
        `标题: ${bookmark.title}\nURL: ${bookmark.url}\n描述: ${bookmark.description || bookmark.shortDesc || ''}`
      ).join('\n\n');

      const prompt = `请分析以下书签，建议合适的分类体系。

书签列表：
${bookmarkList}

请按照以下JSON格式返回分类建议：

{
  "categories": [
    {
      "name": "分类名称",
      "icon": "分类图标（emoji）",
      "description": "分类描述",
      "keywords": ["关键词1", "关键词2"]
    }
  ]
}

要求：
1. 分类名称要简洁明了，使用中文
2. 每个分类包含3-10个相关书签
3. 分类要有层次性和逻辑性
4. 提供合适的emoji图标
5. 包含描述和关键词

请只返回JSON格式的结果。`;

      const result = await this.callAIWithRetry(prompt);
      const parsed = JSON.parse(result.replace(/^```json\s*/, '').replace(/\s*```$/, ''));
      
      return parsed.categories || [];
      
    } catch (error) {
      console.error('❌ 生成新分类失败:', error);
      throw handleError.generic(error, { operation: 'generate_new_categories' });
    }
  }

  /**
   * 获取 AI 服务状态
   * @returns {Object}
   */
  getStatus() {
    return {
      isAvailable: this.isAvailable,
      hasApiKey: !!this.apiKey,
      modelName: this.modelName,
      maxRetries: this.maxRetries,
      requestTimeout: this.requestTimeout
    };
  }
}

// 默认 AI 客户端实例
export const geminiAI = new GeminiAIClient();

/**
 * 便捷的 AI 操作函数
 */
export const aiService = {
  /**
   * 生成分类建议
   * @param {Array} bookmarks - 书签数组
   * @param {Array} categories - 现有分类
   * @returns {Promise<CategorySuggestion[]>}
   */
  categorize: (bookmarks, categories) => geminiAI.generateCategorySuggestions(bookmarks, categories),
  
  /**
   * 生成新分类
   * @param {Array} bookmarks - 书签数组
   * @returns {Promise<Array>}
   */
  generateCategories: (bookmarks) => geminiAI.generateNewCategories(bookmarks),
  
  /**
   * 检查 AI 是否可用
   * @returns {boolean}
   */
  isAvailable: () => geminiAI.isAIAvailable(),
  
  /**
   * 获取状态
   * @returns {Object}
   */
  getStatus: () => geminiAI.getStatus()
};
