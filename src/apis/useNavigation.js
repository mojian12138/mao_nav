import { ref } from 'vue'
import { useLocalAPI } from './useLocalAPI.js'

export function useNavigation() {
  const categories = ref([])
  const title = ref('')
  const defaultSearchEngine = ref('bing')
  const loading = ref(false)
  const error = ref(null)

  const cacheKey = 'navigation_cache_v1'
  try {
    const raw = localStorage.getItem(cacheKey)
    if (raw) {
      const cached = JSON.parse(raw)
      if (cached && typeof cached === 'object') {
        if (Array.isArray(cached.categories)) categories.value = cached.categories
        if (typeof cached.title === 'string' && cached.title) title.value = cached.title
        if (typeof cached.search === 'string' && cached.search) defaultSearchEngine.value = cached.search
        if (title.value) document.title = title.value
      }
    }
  } catch {}

  const fetchCategories = async () => {
    loading.value = true
    error.value = null

    try {
      const { loadNavigation } = useLocalAPI()
      const data = await loadNavigation()

      categories.value = data.categories || []
      title.value = data.title || '猫猫导航'

      // 设置默认搜索引擎，如果未指定或不存在则使用bing
      const searchEngines = ['google', 'baidu', 'bing', 'duckduckgo']
      if (data.search && searchEngines.includes(data.search)) {
        defaultSearchEngine.value = data.search
      } else {
        defaultSearchEngine.value = 'bing'
      }

      // 动态设置页面标题
      document.title = title.value

      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          categories: categories.value,
          title: title.value,
          search: defaultSearchEngine.value
        }))
      } catch {}

    } catch (err) {
      error.value = err.message
      if (!title.value) title.value = '猫猫导航'
      if (!defaultSearchEngine.value) defaultSearchEngine.value = 'bing'
      document.title = title.value

      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          categories: categories.value,
          title: title.value,
          search: defaultSearchEngine.value
        }))
      } catch {}
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    title,
    defaultSearchEngine,
    loading,
    error,
    fetchCategories
  }
}
