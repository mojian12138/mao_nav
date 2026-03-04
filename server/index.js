import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import express from 'express'
import dotenv from 'dotenv'
import archiver from 'archiver'
import AdmZip from 'adm-zip'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(rootDir, '.env') })
dotenv.config()

const dataDir = path.join(rootDir, 'data')
const dataPublicDir = path.join(dataDir, 'public')
const navigationFilePath = path.join(dataDir, 'navigation.json')
const playlistFilePath = path.join(dataDir, 'playlist.json')
const distDir = path.join(rootDir, 'dist')
const seedNavigationFilePath = path.join(__dirname, 'seed_navigation.json')

const readServerConfig = () => {
  const configPath = path.join(rootDir, 'server.config.json')
  if (!fs.existsSync(configPath)) return null
  try {
    const raw = fs.readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

const serverConfig = readServerConfig()

const ensureDir = async (dirPath) => {
  await fsp.mkdir(dirPath, { recursive: true })
}

const seedNavigation = async () => {
  let seeded = null
  try {
    if (fs.existsSync(seedNavigationFilePath)) {
      const raw = await fsp.readFile(seedNavigationFilePath, 'utf8')
      seeded = JSON.parse(raw)
    }
  } catch {
    seeded = null
  }

  if (!seeded || typeof seeded !== 'object') {
    seeded = { categories: [], title: '猫猫导航', search: 'bing' }
  }

  seeded = {
    categories: Array.isArray(seeded.categories) ? seeded.categories : [],
    title: typeof seeded.title === 'string' ? seeded.title : '猫猫导航',
    search: typeof seeded.search === 'string' ? seeded.search : 'bing'
  }

  await writeNavigation(seeded)
  return seeded
}

const readNavigation = async () => {
  try {
    const raw = await fsp.readFile(navigationFilePath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return await seedNavigation()
  }
}

const writeNavigation = async (data) => {
  await ensureDir(dataDir)
  await fsp.writeFile(navigationFilePath, JSON.stringify(data, null, 2), 'utf8')
}

const seedPlaylist = async () => {
  const seeded = {
    audio: [],
    settings: {
      lrcFontSize: '14px',
      lrcColor: '#ffffff'
    }
  }
  await writePlaylist(seeded)
  return seeded
}

const readPlaylist = async () => {
  try {
    const raw = await fsp.readFile(playlistFilePath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return await seedPlaylist()
  }
}

const writePlaylist = async (data) => {
  await ensureDir(dataDir)
  await fsp.writeFile(playlistFilePath, JSON.stringify(data, null, 2), 'utf8')
}

const getAdminPassword = () => {
  const runtimeConfig = readServerConfig()
  return process.env.ADMIN_PASSWORD || runtimeConfig?.adminPassword || serverConfig?.adminPassword || process.env.VITE_ADMIN_PASSWORD || ''
}

const requireAdmin = (req, res, next) => {
  const expected = getAdminPassword()
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_PASSWORD 未配置' })
    return
  }

  const provided = req.get('x-admin-password') || req.body?.adminPassword || ''
  if (provided !== expected) {
    res.status(401).json({ error: '未授权' })
    return
  }

  next()
}

const isSafeRelativePath = (p) => {
  if (typeof p !== 'string') return false
  if (p.includes('..')) return false
  if (path.isAbsolute(p)) return false
  const normalized = p.replaceAll('\\', '/')
  if (normalized === 'logo.png') return true
  if (normalized.startsWith('sitelogo/')) return true
  if (normalized.startsWith('music/')) return true
  if (normalized.startsWith('music-cover/')) return true
  if (normalized.startsWith('music-lrc/')) return true
  return false
}

const app = express()
app.use(express.json({ limit: '120mb' }))

app.get('/install', (req, res) => {
  const runtimeConfig = readServerConfig()
  const installed = !!(process.env.ADMIN_PASSWORD || runtimeConfig?.adminPassword || serverConfig?.adminPassword || process.env.VITE_ADMIN_PASSWORD)
  if (installed) {
    return res.redirect('/')
  }
  res.sendFile(path.join(__dirname, 'install.html'))
})

app.post('/api/install', async (req, res) => {
  try {
    const runtimeConfig = readServerConfig()
    const installed = !!(process.env.ADMIN_PASSWORD || runtimeConfig?.adminPassword || serverConfig?.adminPassword || process.env.VITE_ADMIN_PASSWORD)
    if (installed) {
      return res.status(403).json({ error: '已安装，如需重置请删除 server.config.json' })
    }

    const { adminPassword, port, domain } = req.body
    if (!adminPassword) return res.status(400).json({ error: '请设置管理员密码' })
    
    const newConfig = {
      adminPassword,
      port: Number(port) || 8787
    }
    
    await fsp.writeFile(path.join(rootDir, 'server.config.json'), JSON.stringify(newConfig, null, 2))
    
    if (domain) {
      const nginxConfig = `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:${newConfig.port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`
      const deployDir = path.join(rootDir, 'deploy/nginx')
      await ensureDir(deployDir)
      await fsp.writeFile(path.join(deployDir, 'mao_nav.conf'), nginxConfig)
    }

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.use((req, res, next) => {
  const runtimeConfig = readServerConfig()
  const installed = !!(process.env.ADMIN_PASSWORD || runtimeConfig?.adminPassword || serverConfig?.adminPassword || process.env.VITE_ADMIN_PASSWORD)
  if (!installed && req.path !== '/install' && req.path !== '/api/install' && !req.path.startsWith('/api/health')) {
    return res.redirect('/install')
  }
  next()
})

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/verify', (req, res) => {
  const expected = getAdminPassword()
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_PASSWORD 未配置' })
    return
  }

  const provided = req.get('x-admin-password') || req.body?.password || ''
  if (provided !== expected) {
    res.status(401).json({ error: '未授权' })
    return
  }

  res.json({ ok: true })
})

app.get('/api/navigation', async (req, res) => {
  try {
    const data = await readNavigation()
    if (!data) {
      res.status(404).json({ error: 'navigation.json 不存在' })
      return
    }
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/navigation', requireAdmin, async (req, res) => {
  try {
    const data = req.body?.data
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'data 无效' })
      return
    }
    if (!Array.isArray(data.categories)) {
      res.status(400).json({ error: 'data.categories 必须是数组' })
      return
    }
    if (typeof data.title !== 'string') {
      res.status(400).json({ error: 'data.title 必须是字符串' })
      return
    }
    if (data.search != null && typeof data.search !== 'string') {
      res.status(400).json({ error: 'data.search 必须是字符串' })
      return
    }

    await writeNavigation({
      categories: data.categories,
      title: data.title,
      search: data.search || 'bing'
    })

    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/playlist', async (req, res) => {
  try {
    const data = await readPlaylist()
    if (!data) {
      res.status(404).json({ error: 'playlist.json 不存在' })
      return
    }
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/playlist', requireAdmin, async (req, res) => {
  try {
    const data = req.body?.data
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'data 无效' })
      return
    }

    const audio = Array.isArray(data.audio) ? data.audio : null
    if (!audio) {
      res.status(400).json({ error: 'data.audio 必须是数组' })
      return
    }

    const settings = data.settings && typeof data.settings === 'object' ? data.settings : {}
    const lrcFontSize = typeof settings.lrcFontSize === 'string' ? settings.lrcFontSize : ''
    const lrcColor = typeof settings.lrcColor === 'string' ? settings.lrcColor : ''
    const allowedFontSizes = new Set(['12px', '14px', '16px', '18px', '20px'])
    const normalizedSettings = {
      lrcFontSize: allowedFontSizes.has(lrcFontSize) ? lrcFontSize : '14px',
      lrcColor: /^#[0-9a-fA-F]{6}$/.test(lrcColor) ? lrcColor : '#ffffff'
    }

    const normalized = audio.map((item) => {
      const safe = item && typeof item === 'object' ? item : {}
      return {
        id: typeof safe.id === 'string' ? safe.id : '',
        name: typeof safe.name === 'string' ? safe.name : '',
        artist: typeof safe.artist === 'string' ? safe.artist : '',
        url: typeof safe.url === 'string' ? safe.url : '',
        cover: typeof safe.cover === 'string' ? safe.cover : '',
        lrc: typeof safe.lrc === 'string' ? safe.lrc : ''
      }
    }).filter((item) => item.name && item.url)

    await writePlaylist({ audio: normalized, settings: normalizedSettings })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/file', requireAdmin, async (req, res) => {
  try {
    const relPath = req.body?.path
    const base64 = req.body?.base64

    if (!isSafeRelativePath(relPath)) {
      res.status(400).json({ error: 'path 非法' })
      return
    }
    if (typeof base64 !== 'string' || base64.length === 0) {
      res.status(400).json({ error: 'base64 无效' })
      return
    }

    const normalized = relPath.replaceAll('\\', '/')
    const targetPath = path.join(dataPublicDir, normalized)
    await ensureDir(path.dirname(targetPath))

    const buffer = Buffer.from(base64, 'base64')
    await fsp.writeFile(targetPath, buffer)

    res.json({ ok: true, url: `/${normalized}` })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/music/search', requireAdmin, async (req, res) => {
  try {
    const { input, page = 1, type = 'netease' } = req.body || {}
    if (!input) {
      res.status(400).json({ error: '请输入搜索关键词' })
      return
    }

    const params = new URLSearchParams()
    params.append('input', input)
    params.append('filter', 'name')
    params.append('type', type)
    params.append('page', page)

    const response = await fetch('https://music.txqq.pro/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://music.txqq.pro',
        'Referer': 'https://music.txqq.pro/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: params
    })

    if (!response.ok) {
      throw new Error(`搜索失败: ${response.status}`)
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB Limit
})

app.get('/api/backup/export', requireAdmin, async (req, res) => {
  try {
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    // Set response headers
    res.attachment(`mao_nav_full_backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`)
    
    archive.pipe(res)
    
    // Add all files in data directory to the root of the zip
    archive.directory(dataDir, false)
    
    await archive.finalize()
  } catch (error) {
    console.error('Export error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    }
  }
})

app.post('/api/backup/import', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' })
    }
    
    // Verify file type (simple check)
    if (req.file.mimetype !== 'application/zip' && req.file.mimetype !== 'application/x-zip-compressed' && !req.file.originalname.endsWith('.zip')) {
      return res.status(400).json({ error: '请上传 ZIP 格式的备份文件' })
    }

    const zip = new AdmZip(req.file.buffer)
    // Extract to data directory, overwriting existing files
    zip.extractAllTo(dataDir, true)
    
    res.json({ ok: true })
  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/get-favicon', async (req, res) => {
  const targetUrl = req.query.url
  if (!targetUrl) {
    res.status(400).json({ error: 'url is required' })
    return
  }

  try {
    let pageUrl = targetUrl
    if (!pageUrl.startsWith('http')) {
      pageUrl = `https://${pageUrl}`
    }

    // 1. Fetch the page content to find link tags
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    let iconUrl = null
    let baseUrl = null

    try {
      const pageRes = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      clearTimeout(timeoutId)

      if (pageRes.ok) {
        const html = await pageRes.text()
        baseUrl = new URL(pageRes.url)

        // Simple regex to find link tags with rel containing "icon"
        const linkRegex = /<link\s+[^>]*?>/gi
        const links = html.match(linkRegex) || []

        for (const link of links) {
          const relMatch = link.match(/rel=["']([^"']*?)["']/i)
          const hrefMatch = link.match(/href=["']([^"']*?)["']/i)

          if (relMatch && hrefMatch) {
            const rel = relMatch[1].toLowerCase()
            if (rel.includes('icon')) {
              iconUrl = hrefMatch[1]
              break // Found the first icon
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch page:', e.message)
    }

    // If no icon found in HTML, or page fetch failed, try default favicon.ico
    if (!baseUrl) {
      try {
        baseUrl = new URL(pageUrl)
      } catch {
        throw new Error('Invalid URL')
      }
    }

    if (!iconUrl) {
      iconUrl = '/favicon.ico'
    }

    // Resolve relative URL
    const finalIconUrl = new URL(iconUrl, baseUrl).toString()

    // 2. Fetch the icon
    const iconRes = await fetch(finalIconUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!iconRes.ok) {
      throw new Error(`Icon fetch failed: ${iconRes.status}`)
    }

    const contentType = iconRes.headers.get('content-type')
    const arrayBuffer = await iconRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length < 100) {
      throw new Error('Icon file too small')
    }

    res.set('Content-Type', contentType || 'image/x-icon')
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

await ensureDir(path.join(dataPublicDir, 'sitelogo'))
await ensureDir(path.join(dataPublicDir, 'music'))
await ensureDir(path.join(dataPublicDir, 'music-cover'))
await ensureDir(path.join(dataPublicDir, 'music-lrc'))

app.use(express.static(dataPublicDir, { index: false, fallthrough: true }))

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

const port = Number.parseInt(process.env.PORT || `${serverConfig?.port ?? 8787}`, 10)
app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`)
})

