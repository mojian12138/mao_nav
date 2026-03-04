export function useLocalAPI() {
  const API_BASE = '/api'

  const requestJson = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, options)
    const text = await response.text()
    const data = text ? JSON.parse(text) : null

    if (!response.ok) {
      const message = data?.error || `HTTP ${response.status}`
      throw new Error(message)
    }

    return data
  }

  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const verifyServerConnection = async () => {
    try {
      await requestJson('/health')
      return { connected: true }
    } catch (error) {
      return { connected: false, error: error.message }
    }
  }

  const getConfigStatus = async () => {
    return await requestJson('/config/status')
  }

  const verifyAdminPassword = async (adminPassword) => {
    return await requestJson('/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({ password: adminPassword })
    })
  }

  const loadNavigation = async () => {
    return await requestJson('/navigation')
  }

  const saveNavigation = async (data, adminPassword) => {
    return await requestJson('/navigation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({ data })
    })
  }

  const loadPlaylist = async () => {
    return await requestJson('/playlist')
  }

  const savePlaylist = async (data, adminPassword) => {
    return await requestJson('/playlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({ data })
    })
  }

  const uploadBinaryFile = async (relativePath, arrayBuffer, adminPassword) => {
    const base64 = arrayBufferToBase64(arrayBuffer)
    return await requestJson('/file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({ path: relativePath, base64 })
    })
  }

  const searchMusic = async (input, page = 1, type = 'netease', adminPassword) => {
    return await requestJson('/music/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({ input, page, type })
    })
  }

  const exportBackup = async (adminPassword) => {
    const response = await fetch('/api/backup/export', {
      headers: {
        'x-admin-password': adminPassword
      }
    })
    
    if (!response.ok) {
      const text = await response.text()
      let message = `HTTP ${response.status}`
      try {
        const json = JSON.parse(text)
        if (json.error) message = json.error
      } catch {}
      throw new Error(message)
    }
    
    return await response.blob()
  }

  const importBackup = async (file, adminPassword) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/backup/import', {
      method: 'POST',
      headers: {
        'x-admin-password': adminPassword
      },
      body: formData
    })
    
    const text = await response.text()
    const data = text ? JSON.parse(text) : null
    
    if (!response.ok) {
      const message = data?.error || `HTTP ${response.status}`
      throw new Error(message)
    }
    
    return data
  }

  return {
    verifyServerConnection,
    verifyAdminPassword,
    loadNavigation,
    saveNavigation,
    loadPlaylist,
    savePlaylist,
    uploadBinaryFile,
    searchMusic,
    exportBackup,
    importBackup,
    getConfigStatus
  }
}

