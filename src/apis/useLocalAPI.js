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

  return {
    verifyServerConnection,
    verifyAdminPassword,
    loadNavigation,
    saveNavigation,
    uploadBinaryFile
  }
}

