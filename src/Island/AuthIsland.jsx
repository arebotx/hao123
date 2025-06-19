/**
 * 用户认证组件
 * 基于现有 Island 组件模式，提供简单的密码保护机制
 * @author Claude 4.0 sonnet
 * @version 1.0.0
 */

import { useState, useEffect, useRef } from 'react';
import { handleError } from '../utils/error-handler.js';

/**
 * 认证状态枚举
 */
const AuthStatus = {
  CHECKING: 'checking',
  UNAUTHENTICATED: 'unauthenticated',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  ERROR: 'error'
};

export default function AuthIsland({ children, onAuthChange }) {
  const [authStatus, setAuthStatus] = useState(AuthStatus.CHECKING);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // 会话管理
  const sessionTimeout = 24 * 60 * 60 * 1000; // 24小时
  const inactivityTimeout = 2 * 60 * 60 * 1000; // 2小时无操作自动登出
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef(null);

  /**
   * 检查认证状态
   */
  const checkAuthStatus = () => {
    try {
      const authData = localStorage.getItem('cloudnav_admin_auth');
      if (!authData) {
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
        return;
      }

      const { timestamp, hash } = JSON.parse(authData);
      const now = Date.now();

      // 检查会话是否过期
      if (now - timestamp > sessionTimeout) {
        localStorage.removeItem('cloudnav_admin_auth');
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
        return;
      }

      // 检查是否有管理权限
      const isAdminEnabled = import.meta.env.PUBLIC_ENABLE_ADMIN === 'true';
      if (!isAdminEnabled) {
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
        setError('管理功能未启用');
        return;
      }

      // 验证密码哈希
      const expectedHash = import.meta.env.PUBLIC_ADMIN_PASSWORD_HASH;
      if (expectedHash && hash === expectedHash) {
        setAuthStatus(AuthStatus.AUTHENTICATED);
        lastActivityRef.current = now;
        startInactivityTimer();
        if (onAuthChange) onAuthChange(true);
      } else {
        localStorage.removeItem('cloudnav_admin_auth');
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      setAuthStatus(AuthStatus.UNAUTHENTICATED);
    }
  };

  /**
   * 简单的密码哈希函数
   * @param {string} password - 密码
   * @returns {Promise<string>}
   */
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'cloudnav_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /**
   * 处理登录
   */
  const handleLogin = async () => {
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    try {
      setAuthStatus(AuthStatus.AUTHENTICATING);
      setError('');

      // 检查管理功能是否启用
      const isAdminEnabled = import.meta.env.PUBLIC_ENABLE_ADMIN === 'true';
      if (!isAdminEnabled) {
        setError('管理功能未启用，请在环境变量中设置 PUBLIC_ENABLE_ADMIN=true');
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
        return;
      }

      // 获取预设的密码哈希
      const expectedHash = import.meta.env.PUBLIC_ADMIN_PASSWORD_HASH;
      if (!expectedHash) {
        setError('管理密码未配置，请在环境变量中设置 PUBLIC_ADMIN_PASSWORD_HASH');
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
        return;
      }

      // 验证密码
      const inputHash = await hashPassword(password);
      if (inputHash === expectedHash) {
        // 登录成功
        const authData = {
          timestamp: Date.now(),
          hash: inputHash
        };
        localStorage.setItem('cloudnav_admin_auth', JSON.stringify(authData));
        setAuthStatus(AuthStatus.AUTHENTICATED);
        lastActivityRef.current = Date.now();
        startInactivityTimer();
        if (onAuthChange) onAuthChange(true);
        console.log('✅ 管理员登录成功');
      } else {
        setError('密码错误');
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError('登录过程中发生错误');
      setAuthStatus(AuthStatus.UNAUTHENTICATED);
    }
  };

  /**
   * 处理登出
   */
  const handleLogout = () => {
    localStorage.removeItem('cloudnav_admin_auth');
    setAuthStatus(AuthStatus.UNAUTHENTICATED);
    setPassword('');
    setError('');
    stopInactivityTimer();
    if (onAuthChange) onAuthChange(false);
    console.log('📤 管理员已登出');
  };

  /**
   * 开始无操作计时器
   */
  const startInactivityTimer = () => {
    stopInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏰ 长时间无操作，自动登出');
      handleLogout();
    }, inactivityTimeout);
  };

  /**
   * 停止无操作计时器
   */
  const stopInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  /**
   * 更新活动时间
   */
  const updateActivity = () => {
    if (authStatus === AuthStatus.AUTHENTICATED) {
      lastActivityRef.current = Date.now();
      startInactivityTimer();
    }
  };

  /**
   * 处理键盘事件
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  // 组件初始化
  useEffect(() => {
    checkAuthStatus();

    // 监听用户活动
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => updateActivity();

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      stopInactivityTimer();
    };
  }, []);

  /**
   * 渲染登录界面
   */
  const renderLoginForm = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <span className="text-2xl">🔐</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            管理员登录
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            请输入管理密码以访问后台管理功能
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div>
            <label htmlFor="password" className="sr-only">
              密码
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="管理密码"
                disabled={authStatus === AuthStatus.AUTHENTICATING}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <span className="text-sm">🙈</span>
                ) : (
                  <span className="text-sm">👁️</span>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <span className="text-red-400 mr-2">❌</span>
                <div className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              onClick={handleLogin}
              disabled={authStatus === AuthStatus.AUTHENTICATING || !password.trim()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {authStatus === AuthStatus.AUTHENTICATING ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  验证中...
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2">🔓</span>
                  登录
                </span>
              )}
            </button>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>💡 提示：管理功能需要在环境变量中配置</p>
              <p className="mt-1">PUBLIC_ENABLE_ADMIN=true</p>
              <p className="mt-1">PUBLIC_ADMIN_PASSWORD_HASH=密码哈希值</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * 渲染加载状态
   */
  const renderLoading = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-2">⏳</div>
        <div className="text-gray-600 dark:text-gray-300 flex items-end">
          检查认证状态
          <span className="inline-block ml-px font-bold animate-wave">.</span>
          <span className="inline-block ml-px font-bold animate-wave [animation-delay:0.1s]">.</span>
          <span className="inline-block ml-px font-bold animate-wave [animation-delay:0.2s]">.</span>
        </div>
      </div>
    </div>
  );

  /**
   * 渲染认证成功后的内容
   */
  const renderAuthenticatedContent = () => (
    <div className="relative">
      {/* 登出按钮 */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-1"
          title="登出管理"
        >
          <span>📤</span>
          登出
        </button>
      </div>
      
      {/* 管理内容 */}
      {children}
    </div>
  );

  // 根据认证状态渲染不同内容
  switch (authStatus) {
    case AuthStatus.CHECKING:
      return renderLoading();
    case AuthStatus.UNAUTHENTICATED:
    case AuthStatus.AUTHENTICATING:
    case AuthStatus.ERROR:
      return renderLoginForm();
    case AuthStatus.AUTHENTICATED:
      return renderAuthenticatedContent();
    default:
      return renderLoginForm();
  }
}
