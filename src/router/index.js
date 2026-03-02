import { createRouter, createWebHistory } from 'vue-router'
import NavHomeView from '../views/NavHomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: NavHomeView,
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
      meta: {
        title: '管理后台 - 猫猫导航',
        requiresAuth: true
      }
    },
  ],
})

// 路由前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = to.meta.title
  } else {
    try {
      const cached = localStorage.getItem('navigation_cache_v1')
      const cachedTitle = cached ? JSON.parse(cached)?.title : ''
      document.title = cachedTitle || '猫猫导航'
    } catch {
      document.title = '猫猫导航'
    }
  }

  next()
})

export default router
