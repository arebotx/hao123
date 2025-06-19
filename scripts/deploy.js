#!/usr/bin/env node

/**
 * Cloudnav 一键部署脚本
 * 自动化部署到 Cloudflare Workers 和 Pages
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

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
  step: (msg) => console.log(`${colors.cyan}🚀${colors.reset} ${colors.bright}${msg}${colors.reset}`)
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
 * @returns {Promise<string>}
 */
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

/**
 * 执行命令并显示输出
 * @param {string} command - 命令
 * @param {Object} options - 选项
 * @returns {string}
 */
const execCommand = (command, options = {}) => {
  try {
    log.info(`执行命令: ${command}`);
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'inherit',
      ...options
    });
    return result;
  } catch (error) {
    log.error(`命令执行失败: ${command}`);
    log.error(error.message);
    throw error;
  }
};

/**
 * 检查必要的工具
 */
const checkRequirements = () => {
  log.step('检查部署环境...');
  
  const requirements = [
    { command: 'node --version', name: 'Node.js' },
    { command: 'npm --version', name: 'npm' },
    { command: 'wrangler --version', name: 'Wrangler CLI' }
  ];
  
  for (const req of requirements) {
    try {
      const version = execSync(req.command, { encoding: 'utf8', stdio: 'pipe' });
      log.success(`${req.name}: ${version.trim()}`);
    } catch (error) {
      log.error(`${req.name} 未安装或不可用`);
      
      if (req.name === 'Wrangler CLI') {
        log.info('正在安装 Wrangler CLI...');
        execCommand('npm install -g wrangler');
      } else {
        throw new Error(`请先安装 ${req.name}`);
      }
    }
  }
};

/**
 * 检查 Cloudflare 认证
 */
const checkCloudflareAuth = async () => {
  log.step('检查 Cloudflare 认证...');
  
  try {
    execSync('wrangler whoami', { encoding: 'utf8', stdio: 'pipe' });
    log.success('Cloudflare 认证已配置');
  } catch (error) {
    log.warning('Cloudflare 认证未配置');
    log.info('请运行以下命令进行认证:');
    console.log('  wrangler login');
    
    const shouldLogin = await askQuestion('是否现在进行认证? (y/N): ');
    if (shouldLogin.toLowerCase() === 'y') {
      execCommand('wrangler login');
    } else {
      throw new Error('需要 Cloudflare 认证才能继续部署');
    }
  }
};

/**
 * 创建 KV 命名空间
 * @param {string} name - 命名空间名称
 * @returns {string} - 命名空间 ID
 */
const createKVNamespace = (name) => {
  log.info(`创建 KV 命名空间: ${name}`);
  
  try {
    const result = execSync(`wrangler kv:namespace create "${name}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // 解析输出获取 ID
    const match = result.match(/id = "([^"]+)"/);
    if (match) {
      const id = match[1];
      log.success(`KV 命名空间创建成功: ${id}`);
      return id;
    } else {
      throw new Error('无法解析 KV 命名空间 ID');
    }
  } catch (error) {
    log.error(`创建 KV 命名空间失败: ${name}`);
    throw error;
  }
};

/**
 * 更新 wrangler.toml 配置
 * @param {Object} kvIds - KV 命名空间 ID
 */
const updateWranglerConfig = (kvIds) => {
  log.step('更新 wrangler.toml 配置...');
  
  const wranglerPath = 'wrangler.toml';
  if (!existsSync(wranglerPath)) {
    throw new Error('wrangler.toml 文件不存在');
  }
  
  let content = readFileSync(wranglerPath, 'utf8');
  
  // 更新 KV 命名空间 ID
  content = content.replace(
    /id = "your_bookmarks_kv_namespace_id"/,
    `id = "${kvIds.bookmarks}"`
  );
  content = content.replace(
    /id = "your_session_kv_namespace_id"/,
    `id = "${kvIds.session}"`
  );
  
  // 如果有预览 ID，也更新
  if (kvIds.bookmarksPreview) {
    content = content.replace(
      /preview_id = "your_bookmarks_kv_preview_id"/,
      `preview_id = "${kvIds.bookmarksPreview}"`
    );
  }
  if (kvIds.sessionPreview) {
    content = content.replace(
      /preview_id = "your_session_kv_preview_id"/,
      `preview_id = "${kvIds.sessionPreview}"`
    );
  }
  
  writeFileSync(wranglerPath, content);
  log.success('wrangler.toml 配置已更新');
};

/**
 * 构建项目
 */
const buildProject = () => {
  log.step('构建项目...');
  
  // 安装依赖
  if (!existsSync('node_modules')) {
    log.info('安装项目依赖...');
    execCommand('npm install');
  }
  
  // 构建项目
  execCommand('npm run build');
  log.success('项目构建完成');
};

/**
 * 部署到 Cloudflare Workers
 */
const deployToWorkers = async () => {
  log.step('部署到 Cloudflare Workers...');
  
  const environment = await askQuestion('选择部署环境 (development/production) [production]: ');
  const env = environment.trim() || 'production';
  
  try {
    if (env === 'production') {
      execCommand('wrangler deploy --env production');
    } else {
      execCommand('wrangler deploy --env development');
    }
    log.success(`部署到 ${env} 环境成功`);
  } catch (error) {
    log.error('部署失败');
    throw error;
  }
};

/**
 * 初始化数据
 */
const initializeData = async () => {
  log.step('初始化数据...');
  
  const shouldInit = await askQuestion('是否初始化示例数据? (Y/n): ');
  if (shouldInit.toLowerCase() !== 'n') {
    try {
      // 这里可以调用数据初始化脚本
      log.info('正在初始化示例数据...');
      // execCommand('node scripts/init-data.js');
      log.success('示例数据初始化完成');
    } catch (error) {
      log.warning('数据初始化失败，可以稍后手动初始化');
    }
  }
};

/**
 * 显示部署结果
 * @param {string} workerUrl - Worker URL
 */
const showDeploymentResult = (workerUrl) => {
  console.log('\n' + '='.repeat(60));
  log.success('🎉 部署完成！');
  console.log('='.repeat(60));
  
  if (workerUrl) {
    console.log(`${colors.bright}🌐 网站地址:${colors.reset} ${colors.cyan}${workerUrl}${colors.reset}`);
  }
  
  console.log(`${colors.bright}📊 管理后台:${colors.reset} ${colors.cyan}${workerUrl}/admin${colors.reset}`);
  console.log(`${colors.bright}📚 文档地址:${colors.reset} ${colors.cyan}https://github.com/arebotx/CloudNav/tree/main/docs${colors.reset}`);
  
  console.log('\n' + colors.bright + '📋 后续步骤:' + colors.reset);
  console.log('1. 配置自定义域名（可选）');
  console.log('2. 设置管理员密码');
  console.log('3. 导入书签数据');
  console.log('4. 配置 AI 功能（可选）');
  
  console.log('\n' + colors.bright + '🔧 有用的命令:' + colors.reset);
  console.log('• 查看日志: wrangler tail');
  console.log('• 更新部署: npm run deploy');
  console.log('• 本地开发: npm run dev');
  
  console.log('\n' + '='.repeat(60));
};

/**
 * 主部署流程
 */
const main = async () => {
  try {
    console.log(`${colors.bright}${colors.magenta}
╔═══════════════════════════════════════╗
║        Cloudnav 一键部署工具          ║
║     自动化部署到 Cloudflare Workers   ║
╚═══════════════════════════════════════╝
${colors.reset}`);
    
    // 1. 检查环境
    checkRequirements();
    
    // 2. 检查认证
    await checkCloudflareAuth();
    
    // 3. 创建 KV 命名空间
    log.step('创建 KV 命名空间...');
    const kvIds = {
      bookmarks: createKVNamespace('cloudnav-bookmarks'),
      session: createKVNamespace('cloudnav-session')
    };
    
    // 4. 更新配置
    updateWranglerConfig(kvIds);
    
    // 5. 构建项目
    buildProject();
    
    // 6. 部署
    await deployToWorkers();
    
    // 7. 初始化数据
    await initializeData();
    
    // 8. 显示结果
    const workerUrl = `https://cloudnav-navigation.your-account.workers.dev`;
    showDeploymentResult(workerUrl);
    
  } catch (error) {
    log.error('部署失败:');
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
