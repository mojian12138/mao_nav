import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import express from 'express'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(rootDir, '.env') })
dotenv.config()

const dataDir = path.join(rootDir, 'data')
const dataPublicDir = path.join(dataDir, 'public')
const navigationFilePath = path.join(dataDir, 'navigation.json')
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

const getAdminPassword = () => {
  return process.env.ADMIN_PASSWORD || serverConfig?.adminPassword || process.env.VITE_ADMIN_PASSWORD || ''
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
  return false
}

const app = express()
app.use(express.json({ limit: '15mb' }))

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

await ensureDir(path.join(dataPublicDir, 'sitelogo'))

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

