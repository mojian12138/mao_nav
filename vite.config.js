import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    // 配置SPA fallback，所有路由都返回index.html
    historyApiFallback: true,
    proxy: {
      '/api': 'http://localhost:8787',
      '/logo.png': 'http://localhost:8787',
      '/sitelogo': 'http://localhost:8787'
    }
  },
  build: {
    // 构建时也需要考虑路由配置
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'admin': ['./src/views/AdminView.vue']
        }
      }
    }
  }
})
