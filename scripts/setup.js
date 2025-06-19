#!/usr/bin/env node

/**
 * Cloudnav 配置向导脚本
 * 交互式配置项目环境和部署参数
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { createHash } from 'crypto';

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}🔧${colors.reset} ${colors.bright}${msg}${colors.reset}`)
};

/**
 * 创建命令行接口
 */
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * 询问用户输入
 * @param {string} question - 问题
 * @param {string} defaultValue - 默认值
 * @returns {Promise<string>}
 */
const askQuestion = (question, defaultValue = '') => {
  return new Promise((resolve) => {
    const prompt = defaultValue 
      ? `${question} [${defaultValue}]: `
      : `${question}: `;
    
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
};

/**
 * 询问密码输入（隐藏输入）
 * @param {string} question - 问题
 * @returns {Promise<string>}
 */
const askPassword = (question) => {
  return new Promise((resolve) => {
    process.stdout.write(question + ': ');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    
    const onData = (char) => {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          console.log('');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    };
    
    process.stdin.on('data', onData);
  });
};

/**
 * 生成密码哈希
 * @param {string} password - 密码
 * @returns {string}
 */
const hashPassword = (password) => {
  const salt = 'cloudnav_salt';
  return createHash('sha256').update(password + salt).digest('hex');
};

/**
 * 验证配置
 * @param {Object} config - 配置对象
 * @returns {Array} - 错误列表
 */
const validateConfig = (config) => {
  const errors = [];
  
  if (!config.siteName) {
    errors.push('网站名称不能为空');
  }
  
  if (!config.siteDescription) {
    errors.push('网站描述不能为空');
  }
  
  if (config.enableAdmin && !config.adminPassword) {
    errors.push('启用管理功能时必须设置管理员密码');
  }
  
  if (config.domain && !config.domain.includes('.')) {
    errors.push('域名格式不正确');
  }
  
  return errors;
};

/**
 * 收集基本配置
 */
const collectBasicConfig = async () => {
  log.step('配置基本信息');
  
  const config = {};
  
  config.siteName = await askQuestion('网站名称', 'Cloudnav 导航站');
  config.siteDescription = await askQuestion(
    '网站描述', 
    '智能化的个人导航站，支持书签管理、AI 分类和数据统计'
  );
  config.domain = await askQuestion('自定义域名（可选，如: nav.example.com）');
  
  return config;
};

/**
 * 收集管理功能配置
 */
const collectAdminConfig = async () => {
  log.step('配置管理功能');
  
  const config = {};
  
  const enableAdmin = await askQuestion('是否启用管理功能？', 'y');
  config.enableAdmin = enableAdmin.toLowerCase() === 'y';
  
  if (config.enableAdmin) {
    log.info('管理功能将允许您在线管理书签、分类和查看统计数据');
    
    let password = '';
    let confirmPassword = '';
    
    do {
      password = await askPassword('设置管理员密码（至少8位）');
      if (password.length < 8) {
        log.error('密码长度至少8位，请重新输入');
        continue;
      }
      
      confirmPassword = await askPassword('确认管理员密码');
      if (password !== confirmPassword) {
        log.error('两次输入的密码不一致，请重新输入');
      }
    } while (password !== confirmPassword || password.length < 8);
    
    config.adminPassword = password;
    config.adminPasswordHash = hashPassword(password);
    
    log.success('管理员密码设置成功');
  }
  
  return config;
};

/**
 * 收集 AI 功能配置
 */
const collectAIConfig = async () => {
  log.step('配置 AI 功能（可选）');
  
  const config = {};
  
  const enableAI = await askQuestion('是否启用 Gemini AI 智能分类功能？', 'n');
  config.enableAI = enableAI.toLowerCase() === 'y';
  
  if (config.enableAI) {
    log.info('AI 功能可以帮助您智能分类和整理书签');
    log.info('您需要从 Google AI Studio 获取 Gemini API 密钥');
    log.info('获取地址: https://aistudio.google.com/app/apikey');
    
    config.geminiApiKey = await askQuestion('Gemini API 密钥（可稍后配置）');
    
    if (config.geminiApiKey) {
      log.success('AI 功能配置成功');
    } else {
      log.warning('AI 功能将在稍后配置 API 密钥后启用');
    }
  }
  
  return config;
};

/**
 * 收集部署配置
 */
const collectDeploymentConfig = async () => {
  log.step('配置部署选项');
  
  const config = {};
  
  const dataSource = await askQuestion(
    '数据存储方式 (static/kv)', 
    'kv'
  );
  config.dataSource = dataSource === 'static' ? 'static' : 'kv';
  
  if (config.dataSource === 'static') {
    log.info('静态模式：数据存储在代码中，适合简单场景');
  } else {
    log.info('KV 模式：数据存储在 Cloudflare KV，支持在线管理');
  }
  
  const environment = await askQuestion(
    '默认部署环境 (development/production)', 
    'production'
  );
  config.environment = environment === 'development' ? 'development' : 'production';
  
  return config;
};

/**
 * 生成环境变量文件
 * @param {Object} config - 配置对象
 */
const generateEnvFile = (config) => {
  log.step('生成环境变量文件');
  
  const envContent = `# Cloudnav 环境变量配置
# 此文件由配置向导自动生成

# 基本配置
SITE_NAME="${config.siteName}"
SITE_DESCRIPTION="${config.siteDescription}"
${config.domain ? `SITE_DOMAIN="${config.domain}"` : '# SITE_DOMAIN=""'}

# 管理功能配置
ENABLE_ADMIN="${config.enableAdmin}"
${config.adminPasswordHash ? `ADMIN_PASSWORD_HASH="${config.adminPasswordHash}"` : '# ADMIN_PASSWORD_HASH=""'}

# AI 功能配置
${config.enableAI ? `ENABLE_AI="true"` : 'ENABLE_AI="false"'}
${config.geminiApiKey ? `GEMINI_API_KEY="${config.geminiApiKey}"` : '# GEMINI_API_KEY=""'}

# 数据存储配置
DATA_SOURCE="${config.dataSource}"

# 部署配置
ENVIRONMENT="${config.environment}"

# 调试配置
DEBUG="false"
`;
  
  writeFileSync('.env.example', envContent);
  
  // 如果 .env 不存在，创建一个
  if (!existsSync('.env')) {
    writeFileSync('.env', envContent);
    log.success('.env 文件已创建');
  } else {
    log.info('.env 文件已存在，示例配置已保存到 .env.example');
  }
};

/**
 * 更新 wrangler.toml 配置
 * @param {Object} config - 配置对象
 */
const updateWranglerConfig = (config) => {
  log.step('更新 wrangler.toml 配置');
  
  const wranglerPath = 'wrangler.toml';
  if (!existsSync(wranglerPath)) {
    log.error('wrangler.toml 文件不存在');
    return;
  }
  
  let content = readFileSync(wranglerPath, 'utf8');
  
  // 更新项目名称
  const projectName = config.siteName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  content = content.replace(
    /name = "cloudnav-navigation"/,
    `name = "${projectName}"`
  );
  
  // 更新环境变量
  if (config.enableAdmin) {
    content = content.replace(
      /ENABLE_ADMIN = "true"/,
      `ENABLE_ADMIN = "true"`
    );
    
    if (config.adminPasswordHash) {
      content = content.replace(
        /PUBLIC_ADMIN_PASSWORD_HASH = ""/,
        `PUBLIC_ADMIN_PASSWORD_HASH = "${config.adminPasswordHash}"`
      );
    }
  }
  
  // 更新域名配置
  if (config.domain) {
    content = content.replace(
      /zone_name = "your-domain.com"/,
      `zone_name = "${config.domain}"`
    );
  }
  
  writeFileSync(wranglerPath, content);
  log.success('wrangler.toml 配置已更新');
};

/**
 * 生成配置摘要
 * @param {Object} config - 配置对象
 */
const generateConfigSummary = (config) => {
  console.log('\n' + '='.repeat(50));
  log.success('配置完成！');
  console.log('='.repeat(50));
  
  console.log(`${colors.bright}📋 配置摘要:${colors.reset}`);
  console.log(`• 网站名称: ${config.siteName}`);
  console.log(`• 网站描述: ${config.siteDescription}`);
  console.log(`• 自定义域名: ${config.domain || '未配置'}`);
  console.log(`• 管理功能: ${config.enableAdmin ? '已启用' : '未启用'}`);
  console.log(`• AI 功能: ${config.enableAI ? '已启用' : '未启用'}`);
  console.log(`• 数据存储: ${config.dataSource === 'kv' ? 'Cloudflare KV' : '静态文件'}`);
  console.log(`• 部署环境: ${config.environment}`);
  
  console.log(`\n${colors.bright}📁 生成的文件:${colors.reset}`);
  console.log('• .env.example - 环境变量示例');
  if (!existsSync('.env')) {
    console.log('• .env - 环境变量配置');
  }
  console.log('• wrangler.toml - 更新的部署配置');
  
  console.log(`\n${colors.bright}🚀 下一步:${colors.reset}`);
  console.log('1. 运行 npm run deploy 开始部署');
  console.log('2. 或运行 npm run dev 本地开发');
  
  if (config.enableAdmin && !config.adminPasswordHash) {
    console.log(`\n${colors.yellow}⚠️ 注意: 管理功能需要设置密码才能使用${colors.reset}`);
  }
  
  if (config.enableAI && !config.geminiApiKey) {
    console.log(`\n${colors.yellow}⚠️ 注意: AI 功能需要配置 Gemini API 密钥才能使用${colors.reset}`);
  }
  
  console.log('\n' + '='.repeat(50));
};

/**
 * 主配置流程
 */
const main = async () => {
  try {
    console.log(`${colors.bright}${colors.magenta}
╔═══════════════════════════════════════╗
║        Cloudnav 配置向导              ║
║     交互式配置项目环境和部署参数      ║
╚═══════════════════════════════════════╝
${colors.reset}`);
    
    log.info('欢迎使用 Cloudnav 配置向导！');
    log.info('我们将引导您完成项目的初始配置。');
    
    // 收集配置
    const basicConfig = await collectBasicConfig();
    const adminConfig = await collectAdminConfig();
    const aiConfig = await collectAIConfig();
    const deploymentConfig = await collectDeploymentConfig();
    
    // 合并配置
    const config = {
      ...basicConfig,
      ...adminConfig,
      ...aiConfig,
      ...deploymentConfig
    };
    
    // 验证配置
    const errors = validateConfig(config);
    if (errors.length > 0) {
      log.error('配置验证失败:');
      errors.forEach(error => console.log(`  • ${error}`));
      process.exit(1);
    }
    
    // 生成配置文件
    generateEnvFile(config);
    updateWranglerConfig(config);
    
    // 显示摘要
    generateConfigSummary(config);
    
  } catch (error) {
    log.error('配置过程中发生错误:');
    console.error(error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// 运行主流程
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
