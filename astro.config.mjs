import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
                 // 站点 URL：硬编码，与 robots.txt.ts 一致,记得修改
const SITE_URL = 'https://dh.zywe.de';
const sitemapConfig = {
  filter: (page) => {
    const excludedPaths = [
      '/xw_assets/',
      '/node_modules/',
    ];
    return !excludedPaths.some(path => page.includes(path));
  },
  customPages: [],
  serialize: (item) => {
    let priority = 0.7;   
    let changefreq = 'monthly'; 
    if (item.url === SITE_URL || item.url === `${SITE_URL}/`) {
      priority = 1.0;
      changefreq = 'weekly';
    } else if (item.url.startsWith(SITE_URL)) {
      priority = 0.9;
    }
    return {
      url: item.url,
      changefreq,
      priority,
    };
  },
  i18n: {
    defaultLocale: 'zh-CN',
    locales: {
      'zh-CN': 'zh-CN'
    },
  },
};
export default defineConfig({
  site: SITE_URL,
  output: 'server',
  adapter: cloudflare(),
  devToolbar: {
    enabled: false, 
  },
  build: {
    assets: 'xw_assets', 
    emptyOutDir: true, 
    inlineStylesheets: 'auto', 
    split: true, 
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-core': ['astro'],
          'vendor-ui': ['tailwindcss'],
          'react-core': ['react', 'react-dom'],
          'react-jsx': ['react/jsx-runtime'],
        },
      },
    },
  },
  compressHTML: true,
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    sitemap(sitemapConfig)
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp', 
    },
    format: ['webp'], 
  },
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'), 
      },
    },
    server: {
      fs: {
        strict: true, 
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'], 
      exclude: ['astro'], 
    },
    build: {
      cssCodeSplit: true, 
      minify: 'terser', 
      terserOptions: {
        compress: {
          drop_console: true, 
          drop_debugger: true, 
          pure_funcs: ['console.log', 'console.info'], 
          passes: 2, 
        },
        mangle: {
          safari10: true, 
        },
      },
      assetsInlineLimit: 4096, 
      chunkSizeWarningLimit: 1000, 
      reportCompressedSize: false, 
    },
    css: {
      devSourcemap: false, 
    },
  },
// 调试用
  server: {
    host: '0.0.0.0', 
    port: 4321, 
  },
});