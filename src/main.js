import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const updateFavicon = () => {
  let version = ''
  try {
    version = localStorage.getItem('logo_version') || ''
  } catch {}

  const href = version ? `/logo.png?v=${version}` : '/logo.png'

  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = href
  link.type = 'image/png'
}

updateFavicon()
window.addEventListener('logo-version-updated', updateFavicon)
window.addEventListener('storage', (e) => {
  if (e.key === 'logo_version') updateFavicon()
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
