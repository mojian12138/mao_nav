<template>
  <div class="admin-container">
    <!-- 登录界面 -->
    <div v-if="!isAuthenticated" class="login-container">
      <div class="login-box">
        <h1>🔐 管理员登录</h1>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="password">管理密钥:</label>
            <input
              id="password"
              type="password"
              v-model="loginPassword"
              placeholder="请输入管理密钥"
              required
              class="form-input"
            />
          </div>
          <button type="submit" class="login-btn" :disabled="loading">
            {{ loading ? '验证中...' : '登录' }}
          </button>
        </form>
        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>
      </div>
    </div>

    <!-- 管理界面 -->
    <div v-else class="admin-dashboard">
      <!-- 顶部导航 -->
      <header class="admin-header">
        <div class="header-content">
          <h1>🛠️ 导航站管理</h1>
          <div class="header-actions">
            <span class="user-info">管理员</span>
            <button @click="logout" class="logout-btn">退出</button>
          </div>
        </div>
      </header>

      <!-- 主要内容 -->
      <main class="admin-main">
        <div class="admin-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'categories' }"
            @click="activeTab = 'categories'"
          >
            📁 分类管理
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'sites' }"
            @click="switchToSiteTab"
          >
            🌐 站点管理
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'settings' }"
            @click="activeTab = 'settings'"
          >
            ⚙️ 系统设置
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'playlist' }"
            @click="activeTab = 'playlist'"
          >
            🎵 歌单管理
          </button>
        </div>

        <!-- 分类管理 -->
        <div v-if="activeTab === 'categories'" class="tab-content">
          <CategoryManager
            :categories="categories"
            @update="handleCategoriesUpdate"
            @save="saveToLocal"
            @viewSites="switchToSiteManager"
            :loading="saving"
          />
        </div>

        <!-- 站点管理 -->
        <div v-if="activeTab === 'sites'" class="tab-content">
          <SiteManager
            :categories="categories"
            :initialSelectedCategoryId="selectedCategoryId"
            @update="handleCategoriesUpdate"
            @save="saveToLocal"
            :loading="saving"
          />
        </div>

        <!-- 系统设置 -->
        <div v-if="activeTab === 'settings'" class="tab-content">
          <SystemSettings />
        </div>

        <div v-if="activeTab === 'playlist'" class="tab-content">
          <PlaylistManager />
        </div>
      </main>
    </div>

    <!-- 自定义弹框 -->
    <CustomDialog
      :visible="dialogVisible"
      :type="dialogType"
      :title="dialogTitle"
      :message="dialogMessage"
      :details="dialogDetails"
      @close="closeDialog"
      @confirm="closeDialog"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CategoryManager from '../components/admin/CategoryManager.vue'
import SiteManager from '../components/admin/SiteManager.vue'
import SystemSettings from '../components/admin/SystemSettings.vue'
import PlaylistManager from '../components/admin/PlaylistManager.vue'
import CustomDialog from '../components/admin/CustomDialog.vue'
import { useLocalAPI } from '../apis/useLocalAPI.js'
import { useDialog } from '../composables/useDialog.js'

const router = useRouter()
const { saveNavigation, loadNavigation, verifyAdminPassword } = useLocalAPI()

// 认证状态
const isAuthenticated = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const loading = ref(false)
const saving = ref(false)

// 管理界面状态
const activeTab = ref('categories')
const categories = ref([])
const selectedCategoryId = ref('') // 用于站点管理的选中分类
const { dialogVisible, dialogType, dialogTitle, dialogMessage, dialogDetails, showDialog, closeDialog } = useDialog()

// 验证管理员密钥
const handleLogin = async () => {
  loading.value = true
  loginError.value = ''

  try {
    await verifyAdminPassword(loginPassword.value)

    isAuthenticated.value = true
    localStorage.setItem('admin_authenticated', 'true')
    sessionStorage.setItem('admin_password', loginPassword.value)

    setTimeout(async () => {
      try {
        await loadCategories()
      } catch (error) {
        loading.value = false
      }
    }, 500)
  } catch (error) {
    if (error?.message === '未授权') {
      loginError.value = '未授权：请确认服务端 ADMIN_PASSWORD 与输入的密码一致，并且反代未拦截 x-admin-password 请求头'
    } else {
      loginError.value = error.message
    }
  } finally {
    // 确保登录流程的loading状态被重置
    if (!isAuthenticated.value) {
      loading.value = false
    }
  }
}

// 退出登录
const logout = () => {
  isAuthenticated.value = false
  localStorage.removeItem('admin_authenticated')
  sessionStorage.removeItem('admin_password')
  loginPassword.value = ''
  router.push('/')
}

// 加载分类数据
const loadCategories = async () => {
  loading.value = true

  try {
    const data = await loadNavigation()
    categories.value = data.categories || []
  } catch (error) {
    try {
      const cached = localStorage.getItem('navigation_cache_v1')
      const cachedCategories = cached ? JSON.parse(cached)?.categories : null
      categories.value = Array.isArray(cachedCategories) ? cachedCategories : []
    } catch {
      categories.value = []
    }
  } finally {
    loading.value = false
  }
}

// 处理分类更新
const handleCategoriesUpdate = (newCategories) => {
  categories.value = newCategories
}

// 切换到站点管理并选中对应分类
const switchToSiteManager = (categoryId) => {
  selectedCategoryId.value = categoryId
  activeTab.value = 'sites'
}

// 手动切换到站点管理标签
const switchToSiteTab = () => {
  selectedCategoryId.value = '' // 清空选中分类，显示所有站点
  activeTab.value = 'sites'
}

const saveToLocal = async () => {
  saving.value = true
  try {
    const currentData = await loadNavigation()
    const adminPassword = sessionStorage.getItem('admin_password') || ''
    if (!adminPassword) {
      throw new Error('登录信息已失效，请重新登录后再保存')
    }

    await saveNavigation({
      categories: categories.value,
      title: currentData.title || '猫猫导航',
      search: currentData.search || 'bing'
    }, adminPassword)
    showDialog(
      'success',
      '🎉 保存成功',
      '您的更改已成功保存到服务器本地文件！',
      [
        '• 刷新前台页面即可看到最新内容',
        '• 如果前台有缓存，请强制刷新（Ctrl+F5）'
      ]
    )
  } catch (error) {
    showDialog(
      'error',
      '❌ 保存失败',
      '保存过程中发生错误，请重试',
      [`• 错误详情: ${error.message}`]
    )
  } finally {
    saving.value = false
  }
}

// 组件挂载时检查认证状态
onMounted(() => {
  loading.value = false

  const savedAuth = localStorage.getItem('admin_authenticated')
  if (savedAuth === 'true') {
    const savedPassword = sessionStorage.getItem('admin_password') || ''
    if (savedPassword) {
      isAuthenticated.value = true
      loadCategories()
    } else {
      localStorage.removeItem('admin_authenticated')
    }
  }
})
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: #2c3e50;
}

/* 登录界面样式 */
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
}

.login-box h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #2c3e50;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e1e1;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-btn:hover:not(:disabled) {
  background: #2980b9;
}

.login-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
}

/* 管理界面样式 */
.admin-dashboard {
  min-height: 100vh;
  background: #f5f7fa;
}

.admin-header {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-content h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info {
  color: #7f8c8d;
  font-size: 14px;
}

.logout-btn {
  padding: 8px 16px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.logout-btn:hover {
  background: #c0392b;
}

.admin-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
}

.admin-tabs {
  display: flex;
  background: white;
  border-radius: 8px;
  padding: 5px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.tab-btn {
  flex: 1;
  padding: 12px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #7f8c8d;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background: #3498db;
  color: white;
}

.tab-btn:hover:not(.active) {
  background: #f8f9fa;
  color: #2c3e50;
}

.tab-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 15px 20px;
  }

  .admin-main {
    padding: 20px 15px;
  }

  .tab-content {
    padding: 20px 15px;
  }

  .admin-tabs {
    flex-direction: column;
  }

  .tab-btn {
    margin-bottom: 5px;
  }
}
</style>
