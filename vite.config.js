import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 读取 server.config.json 中的端口
let serverPort = 8787
try {
  const configPath = path.resolve(__dirname, 'server.config.json')
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    if (config.port) {
      serverPort = config.port
    }
  }
} catch (e) {
  console.warn('Failed to read server.config.json, using default port 8787')
}

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
      '/api': `http://localhost:${serverPort}`,
      '/logo.png': `http://localhost:${serverPort}`,
      '/sitelogo': `http://localhost:${serverPort}`,
      '/music': `http://localhost:${serverPort}`,
      '/music-cover': `http://localhost:${serverPort}`,
      '/music-lrc': `http://localhost:${serverPort}`
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
