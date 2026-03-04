<template>
  <div class="playlist-manager">
    <div class="manager-header">
      <h2>🎵 歌单管理</h2>
      <div class="header-actions">
        <button @click="openAddModal" class="add-btn">➕ 添加歌曲</button>
        <button @click="handleSave" :disabled="saving" class="save-btn">
          {{ saving ? '保存中...' : '💾 保存歌单' }}
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-number">{{ localTracks.length }}</span>
        <span class="stat-label">歌曲数</span>
      </div>
      <div class="lrc-settings">
        <span class="settings-label">歌词样式:</span>
        <div class="setting-control">
          <label>大小</label>
          <select v-model="lrcFontSize" class="setting-select">
            <option value="12px">小</option>
            <option value="14px">默认</option>
            <option value="16px">中</option>
            <option value="18px">大</option>
            <option value="20px">特大</option>
          </select>
        </div>
        <div class="setting-control">
          <label>颜色</label>
          <input type="color" v-model="lrcColor" class="setting-color">
        </div>
        <div class="preview-box" :style="{ fontSize: lrcFontSize, color: lrcColor }">
          样式预览 Text
        </div>
        <button @click="handleSaveSettings" :disabled="saving" class="apply-style-btn">
          应用样式
        </button>
      </div>
      <div class="stat-info">
        💡 支持拖拽排序；支持在线链接与本地上传（音乐/封面）
      </div>
    </div>

    <div class="tracks-list">
      <draggable
        v-model="localTracks"
        v-bind="dragOptions"
        item-key="id"
        tag="div"
        class="draggable-list"
      >
        <template #item="{ element: track, index }">
          <div class="track-item">
            <div class="drag-handle" title="拖拽排序">⋮⋮</div>
            <div class="track-info">
              <div class="track-cover">
                <img v-if="track.cover" :src="track.cover" :alt="track.name" @error="handleImageError">
                <div v-else class="cover-placeholder">🎵</div>
              </div>
              <div class="track-details">
                <h3 class="track-title">{{ track.name }}</h3>
                <p class="track-artist">{{ track.artist || '未知歌手' }}</p>
                <p class="track-url">{{ track.url }}</p>
                <p v-if="track.lrc" class="track-lrc">📝 包含歌词</p>
              </div>
            </div>
            <div class="track-actions">
              <button @click="editTrack(track)" class="edit-btn">✏️ 编辑</button>
              <button @click="deleteTrack(index)" class="delete-btn">🗑️ 删除</button>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-if="showAddModal || editingTrack" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingTrack ? '编辑歌曲' : '添加歌曲' }}</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>

        <div v-if="!editingTrack" class="search-section">
          <div class="search-box">
            <input 
              v-model="searchQuery" 
              placeholder="🔍 搜索网络歌曲（歌名/歌手）" 
              class="form-input search-input"
              @keyup.enter="performSearch"
            >
            <button @click="performSearch" :disabled="searching" class="search-btn">
              {{ searching ? '...' : '搜索' }}
            </button>
          </div>
          
          <div v-if="searchResults.length > 0" class="search-results">
            <div 
              v-for="item in searchResults" 
              :key="item.songid" 
              class="search-item"
              @click="selectSearchedTrack(item)"
            >
              <img :src="item.pic" class="search-cover" loading="lazy">
              <div class="search-info">
                <div class="search-title">{{ item.title }}</div>
                <div class="search-author">{{ item.author }}</div>
                <div v-if="item.lrc" class="search-lrc-preview">{{ item.lrc.substring(0, 30) }}...</div>
              </div>
              <div class="search-actions">
                <button 
                  class="preview-btn" 
                  @click.stop="togglePreview(item)"
                  :class="{ playing: previewingId === item.songid }"
                >
                  {{ previewingId === item.songid ? '⏹' : '▶' }}
                </button>
                <button class="select-btn">选择</button>
              </div>
            </div>
          </div>
          <div v-if="searchError" class="search-error">{{ searchError }}</div>
        </div>

        <form @submit.prevent="saveTrack" class="track-form">
          <div class="form-row">
            <div class="form-group">
              <label>歌曲名称 *:</label>
              <input v-model="formData.name" required placeholder="请输入歌曲名称" class="form-input">
            </div>
            <div class="form-group">
              <label>歌手:</label>
              <input v-model="formData.artist" placeholder="请输入歌手" class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label>音乐来源 *:</label>
            <div class="segmented">
              <button type="button" class="seg-btn" :class="{ active: audioMode === 'online' }" @click="audioMode = 'online'">
                🌐 在线链接
              </button>
              <button type="button" class="seg-btn" :class="{ active: audioMode === 'upload' }" @click="audioMode = 'upload'">
                📁 本地上传
              </button>
            </div>
          </div>

          <div v-if="audioMode === 'online'" class="form-group">
            <label>音乐链接 *:</label>
            <div class="input-with-preview">
              <input v-model="formData.url" required placeholder="https://..." class="form-input">
              <button 
                type="button" 
                class="preview-btn-inline" 
                @click="toggleUrlPreview(formData.url)"
                :disabled="!formData.url"
                :title="formData.url ? '点击试听' : '请输入链接'"
              >
                {{ previewingUrl === formData.url && previewAudio ? '⏹' : '▶' }}
              </button>
            </div>
          </div>

          <div v-else class="form-group">
            <label>选择音乐文件 *:</label>
            <input type="file" accept="audio/*" @change="onAudioFileChange" class="form-input">
            <div v-if="audioFileName" class="file-hint">
              已选择新文件：{{ audioFileName }}
            </div>
            <div v-else-if="formData.url && formData.url.startsWith('/music/')" class="file-hint">
              当前文件：{{ getFilenameFromUrl(formData.url) }}
            </div>
          </div>

          <div class="form-group">
            <label>封面来源:</label>
            <div class="segmented">
              <button type="button" class="seg-btn" :class="{ active: coverMode === 'none' }" @click="setCoverMode('none')">
                🚫 无封面
              </button>
              <button type="button" class="seg-btn" :class="{ active: coverMode === 'online' }" @click="setCoverMode('online')">
                🌐 在线链接
              </button>
              <button type="button" class="seg-btn" :class="{ active: coverMode === 'upload' }" @click="setCoverMode('upload')">
                📁 本地上传
              </button>
            </div>
          </div>

          <div v-if="coverMode === 'online'" class="form-group">
            <label>封面链接:</label>
            <input v-model="formData.cover" placeholder="https://..." class="form-input">
          </div>

          <div v-if="coverMode === 'upload'" class="form-group">
            <label>选择封面图片:</label>
            <input type="file" accept="image/*" @change="onCoverFileChange" class="form-input">
            <div v-if="coverFileName" class="file-hint">
              已选择新文件：{{ coverFileName }}
            </div>
            <div v-else-if="formData.cover && formData.cover.startsWith('/music-cover/')" class="file-hint">
              当前文件：{{ getFilenameFromUrl(formData.cover) }}
            </div>
          </div>

          <div class="form-group">
            <label>歌词来源:</label>
            <div class="segmented">
              <button type="button" class="seg-btn" :class="{ active: lrcMode === 'none' }" @click="setLrcMode('none')">
                🚫 无歌词
              </button>
              <button type="button" class="seg-btn" :class="{ active: lrcMode === 'online' }" @click="setLrcMode('online')">
                🌐 在线链接
              </button>
              <button type="button" class="seg-btn" :class="{ active: lrcMode === 'upload' }" @click="setLrcMode('upload')">
                📁 上传 LRC
              </button>
            </div>
          </div>

          <div v-if="lrcMode === 'online'" class="form-group">
            <label>歌词链接 (.lrc):</label>
            <input v-model="formData.lrc" placeholder="https://..." class="form-input">
          </div>

          <div v-if="lrcMode === 'upload'" class="form-group">
            <label>选择 LRC 文件:</label>
            <input type="file" accept=".lrc" @change="onLrcFileChange" class="form-input">
            <div v-if="lrcFileName" class="file-hint">
              已选择新文件：{{ lrcFileName }}
            </div>
            <div v-else-if="formData.lrc && formData.lrc.startsWith('/music-lrc/')" class="file-hint">
              当前文件：{{ getFilenameFromUrl(formData.lrc) }}
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="cancel-btn" :disabled="uploading">取消</button>
            <button type="submit" class="submit-btn" :disabled="uploading">
              {{ uploading ? '处理中...' : (editingTrack ? '更新' : '添加') }}
            </button>
          </div>
        </form>
      </div>
    </div>

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
import { computed, onMounted, ref } from 'vue'
import draggable from 'vuedraggable'
import { useLocalAPI } from '@/apis/useLocalAPI.js'
import { useDialog } from '@/composables/useDialog.js'
import CustomDialog from '@/components/admin/CustomDialog.vue'

const { loadPlaylist, savePlaylist, uploadBinaryFile, searchMusic } = useLocalAPI()
const { dialogVisible, dialogType, dialogTitle, dialogMessage, dialogDetails, showDialog, closeDialog } = useDialog()

const localTracks = ref([])
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)

const lrcFontSize = ref('14px')
const lrcColor = ref('#ffffff')

// Search states
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const searchError = ref('')
const previewAudio = ref(null)
const previewingId = ref(null)
const previewingUrl = ref(null)

const showAddModal = ref(false)
const editingTrack = ref(null)

const audioMode = ref('online')
const coverMode = ref('none')
const lrcMode = ref('none')
const audioFile = ref(null)
const coverFile = ref(null)
const lrcFile = ref(null)

const audioFileName = computed(() => audioFile.value?.name || '')
const coverFileName = computed(() => coverFile.value?.name || '')
const lrcFileName = computed(() => lrcFile.value?.name || '')

const formData = ref({
  id: '',
  name: '',
  artist: '',
  url: '',
  cover: '',
  lrc: ''
})

const dragOptions = {
  animation: 200,
  ghostClass: 'drag-ghost',
  chosenClass: 'drag-chosen',
  dragClass: 'drag-dragging',
  forceFallback: true,
  fallbackTolerance: 3,
  scroll: true,
  scrollSensitivity: 60,
  scrollSpeed: 20
}

const createId = () => {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID()
  } catch {}
  return `track_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const getAdminPassword = () => sessionStorage.getItem('admin_password') || ''

const handleImageError = (event) => {
  event.target.src = '/favicon.ico'
  event.target.onerror = null
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await loadPlaylist()
    localTracks.value = Array.isArray(data?.audio) ? data.audio.map(normalizeTrack).filter((t) => t.id) : []
    
    // Load settings if available
    if (data?.settings) {
      // Ensure we have default values if settings are partial
      lrcFontSize.value = data.settings.lrcFontSize || '14px'
      lrcColor.value = data.settings.lrcColor || '#ffffff'
    }
  } catch (error) {
    localTracks.value = []
  } finally {
    loading.value = false
  }
}

const normalizeTrack = (track) => {
  const t = track && typeof track === 'object' ? track : {}
  return {
    id: typeof t.id === 'string' && t.id ? t.id : createId(),
    name: typeof t.name === 'string' ? t.name : '',
    artist: typeof t.artist === 'string' ? t.artist : '',
    url: typeof t.url === 'string' ? t.url : '',
    cover: typeof t.cover === 'string' ? t.cover : '',
    lrc: typeof t.lrc === 'string' ? t.lrc : ''
  }
}

const openAddModal = () => {
  editingTrack.value = null
  showAddModal.value = true
  audioMode.value = 'online'
  coverMode.value = 'none'
  lrcMode.value = 'none'
  audioFile.value = null
  coverFile.value = null
  lrcFile.value = null
  searchResults.value = []
  searchQuery.value = ''
  searching.value = false
  searchError.value = ''
  stopPreview()
  formData.value = {
    id: createId(),
    name: '',
    artist: '',
    url: '',
    cover: '',
    lrc: ''
  }
}

const performSearch = async () => {
  if (!searchQuery.value.trim()) return
  searching.value = true
  searchError.value = ''
  searchResults.value = []
  
  try {
    const adminPassword = getAdminPassword()
    if (!adminPassword) throw new Error('请先登录')
    
    const data = await searchMusic(searchQuery.value.trim(), 1, 'netease', adminPassword)
    if (data?.data && Array.isArray(data.data)) {
      searchResults.value = data.data
    } else {
      searchError.value = '未搜索到相关歌曲'
    }
  } catch (err) {
    searchError.value = err.message || '搜索失败'
  } finally {
    searching.value = false
  }
}

const selectSearchedTrack = (item) => {
  formData.value.name = item.title || ''
  formData.value.artist = item.author || ''
  
  // Audio
  audioMode.value = 'online'
  formData.value.url = item.url || ''
  audioFile.value = null

  // Cover
  coverMode.value = 'online'
  formData.value.cover = item.pic || ''
  coverFile.value = null

  // LRC
  if (item.lrc && typeof item.lrc === 'string') {
    // If LRC content is provided, create a File object to upload
    const blob = new Blob([item.lrc], { type: 'text/plain' })
    const file = new File([blob], `${safeFilename(item.title)}.lrc`, { type: 'text/plain' })
    
    lrcMode.value = 'upload'
    lrcFile.value = file
    formData.value.lrc = '' // Clear URL field as we use file
  } else {
    lrcMode.value = 'none'
    formData.value.lrc = ''
    lrcFile.value = null
  }

  // Clear search results to focus on editing
  searchResults.value = []
  searchQuery.value = ''
  stopPreview()
}

const togglePreview = (item) => {
  if (previewingId.value === item.songid) {
    stopPreview()
    return
  }

  stopPreview()
  
  if (!item.url) {
    searchError.value = '该歌曲暂无试听链接'
    return
  }

  previewAudio.value = new Audio(item.url)
  previewAudio.value.volume = 0.5
  previewAudio.value.play().catch(e => {
    console.error('Preview failed:', e)
    searchError.value = '播放失败，可能是版权限制或格式不支持'
    stopPreview()
  })
  
  previewAudio.value.onended = () => stopPreview()
  previewingId.value = item.songid
}

const toggleUrlPreview = (url) => {
  if (!url) return
  
  if (previewingUrl.value === url) {
    stopPreview()
    return
  }

  stopPreview()

  previewAudio.value = new Audio(url)
  previewAudio.value.volume = 0.5
  previewAudio.value.play().catch(e => {
    console.error('Preview failed:', e)
    showDialog('error', '❌ 播放失败', '无法播放该链接，可能是格式不支持或存在访问限制')
    stopPreview()
  })
  
  previewAudio.value.onended = () => stopPreview()
  previewingUrl.value = url
}

const stopPreview = () => {
  if (previewAudio.value) {
    previewAudio.value.pause()
    previewAudio.value = null
  }
  previewingId.value = null
  previewingUrl.value = null
}

const editTrack = (track) => {
  editingTrack.value = track
  showAddModal.value = false
  audioFile.value = null
  coverFile.value = null
  lrcFile.value = null
  searchResults.value = []
  searchQuery.value = ''
  searching.value = false
  searchError.value = ''
  stopPreview()
  audioMode.value = track.url?.startsWith('/music/') ? 'upload' : 'online'
  coverMode.value = track.cover ? (track.cover.startsWith('/music-cover/') ? 'upload' : 'online') : 'none'
  lrcMode.value = track.lrc ? (track.lrc.startsWith('/music-lrc/') ? 'upload' : 'online') : 'none'
  formData.value = { ...normalizeTrack(track) }
}

const deleteTrack = (index) => {
  if (!confirm('确定要删除这首歌吗？')) return
  localTracks.value.splice(index, 1)
}

const closeModal = () => {
  showAddModal.value = false
  editingTrack.value = null
  uploading.value = false
  audioFile.value = null
  coverFile.value = null
  lrcFile.value = null
  stopPreview()
}

const onAudioFileChange = (e) => {
  const file = e.target.files?.[0] || null
  audioFile.value = file
}

const onCoverFileChange = (e) => {
  const file = e.target.files?.[0] || null
  coverFile.value = file
}

const onLrcFileChange = (e) => {
  const file = e.target.files?.[0] || null
  lrcFile.value = file
}

const setCoverMode = (mode) => {
  coverMode.value = mode
  if (mode === 'none') {
    formData.value.cover = ''
    coverFile.value = null
  }
}

const setLrcMode = (mode) => {
  lrcMode.value = mode
  if (mode === 'none') {
    formData.value.lrc = ''
    lrcFile.value = null
  }
}

const getFilenameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return ''
  return url.split('/').pop()
}

const safeFilename = (name) => {
  const base = typeof name === 'string' ? name : ''
  const cleaned = base.replaceAll('\\', '/').split('/').pop() || ''
  // 替换所有非字母数字和常用字符的符号为下划线，避免文件名非法
  return cleaned.replaceAll(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_')
}

const uploadFileTo = async (file, dir) => {
  if (!file) throw new Error('未选择文件')
  const adminPassword = getAdminPassword()
  if (!adminPassword) throw new Error('登录信息已失效，请重新登录后再操作')

  const buffer = await file.arrayBuffer()
  const ext = safeFilename(file.name)
  const path = `${dir}/${formData.value.id}_${ext}`
  const result = await uploadBinaryFile(path, buffer, adminPassword)
  return result?.url || ''
}

const saveTrack = async () => {
  uploading.value = true
  try {
    const next = normalizeTrack(formData.value)
    if (!next.name) throw new Error('歌曲名称不能为空')

    if (audioMode.value === 'upload') {
      if (audioFile.value) {
        next.url = await uploadFileTo(audioFile.value, 'music')
      } else {
        if (!next.url || !next.url.startsWith('/music/')) throw new Error('请选择音乐文件')
      }
    } else {
      if (!next.url) throw new Error('音乐链接不能为空')
    }

    if (coverMode.value === 'upload') {
      if (coverFile.value) {
        next.cover = await uploadFileTo(coverFile.value, 'music-cover')
      } else {
        if (next.cover && !next.cover.startsWith('/music-cover/')) throw new Error('封面选择为本地上传时，请上传封面图片或改为在线链接')
      }
    }

    if (coverMode.value === 'none') next.cover = ''

    if (lrcMode.value === 'upload') {
      if (lrcFile.value) {
        next.lrc = await uploadFileTo(lrcFile.value, 'music-lrc')
      } else {
        if (next.lrc && !next.lrc.startsWith('/music-lrc/')) throw new Error('LRC 选择为本地上传时，请上传文件或改为在线链接')
      }
    }

    if (lrcMode.value === 'none') next.lrc = ''

    if (editingTrack.value) {
      const idx = localTracks.value.findIndex((t) => t.id === editingTrack.value.id)
      if (idx !== -1) localTracks.value[idx] = next
    } else {
      localTracks.value.unshift(next)
    }

    closeModal()
  } catch (error) {
    showDialog('error', '❌ 操作失败', error.message || '处理失败，请重试')
  } finally {
    uploading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const adminPassword = getAdminPassword()
    if (!adminPassword) throw new Error('登录信息已失效，请重新登录后再保存')

    const payload = {
      audio: localTracks.value.map(normalizeTrack).map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        url: t.url,
        cover: t.cover,
        lrc: t.lrc
      })),
      settings: {
        lrcFontSize: lrcFontSize.value,
        lrcColor: lrcColor.value
      }
    }

    await savePlaylist(payload, adminPassword)
    try {
      localStorage.setItem('playlist_version', `${Date.now()}`)
      window.dispatchEvent(new Event('playlist-version-updated'))
    } catch {}

    showDialog('success', '🎉 保存成功', '歌单已成功保存到服务器本地文件！', [
      '• 刷新前台页面即可看到最新歌单',
      '• 或等待播放器自动刷新（如果已开启）'
    ])
  } catch (error) {
    showDialog('error', '❌ 保存失败', '保存过程中发生错误，请重试', [`• 错误详情: ${error.message}`])
  } finally {
    saving.value = false
  }
}

const handleSaveSettings = async () => {
  saving.value = true
  try {
    const adminPassword = getAdminPassword()
    if (!adminPassword) throw new Error('登录信息已失效，请重新登录后再保存')

    const payload = {
      audio: localTracks.value.map(normalizeTrack).map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        url: t.url,
        cover: t.cover,
        lrc: t.lrc
      })),
      settings: {
        lrcFontSize: lrcFontSize.value,
        lrcColor: lrcColor.value
      }
    }

    await savePlaylist(payload, adminPassword)
    try {
      localStorage.setItem('playlist_version', `${Date.now()}`)
      window.dispatchEvent(new Event('playlist-version-updated'))
    } catch {}

    showDialog('success', '🎨 样式已应用', '歌词样式已更新，前台页面刷新后即可生效。')
  } catch (error) {
    showDialog('error', '❌ 保存失败', '保存过程中发生错误，请重试', [`• 错误详情: ${error.message}`])
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;
}

.manager-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 22px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.add-btn,
.save-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-btn {
  background: #27ae60;
  color: white;
}

.add-btn:hover {
  background: #229954;
}

.save-btn {
  background: #3498db;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #2980b9;
}

.save-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  background: #f8f9fa;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #3498db;
}

.stat-label {
  font-size: 13px;
  color: #7f8c8d;
}

.stat-info {
    margin-left: auto;
    font-size: 13px;
    color: #7f8c8d;
  }

.lrc-settings {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 0 15px;
  border-left: 1px solid #e9ecef;
  margin-left: 15px;
}

.settings-label {
  font-size: 13px;
  color: #7f8c8d;
  font-weight: 500;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.setting-control label {
  font-size: 12px;
  color: #95a5a6;
}

.setting-select {
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  color: #2c3e50;
  outline: none;
}

.setting-color {
  width: 24px;
  height: 24px;
  border: none;
  padding: 0;
  background: none;
  cursor: pointer;
}

.preview-box {
  background: rgba(0,0,0,0.7);
  padding: 2px 8px;
  border-radius: 4px;
  margin: 0 5px;
  font-weight: 500;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  min-width: 60px;
  text-align: center;
}

.apply-style-btn {
  padding: 4px 10px;
  background: #9b59b6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 5px;
}

.apply-style-btn:hover {
  background: #8e44ad;
}

.apply-style-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.track-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  background: white;
  margin-bottom: 12px;
}

.drag-handle {
  width: 26px;
  text-align: center;
  cursor: grab;
  color: #95a5a6;
  user-select: none;
  font-size: 16px;
}

.track-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.track-cover {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  background: #f8f9fa;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e9ecef;
}

.track-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  font-size: 18px;
}

.track-details {
  flex: 1;
  min-width: 0;
}

.track-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
}

.track-artist {
  margin: 2px 0 0;
  font-size: 13px;
  color: #7f8c8d;
}

.track-url {
  margin: 4px 0 0;
  font-size: 12px;
  color: #95a5a6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-lrc {
  margin: 2px 0 0;
  font-size: 12px;
  color: #27ae60;
  font-weight: 500;
}

.track-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.edit-btn,
.delete-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s ease;
}

.edit-btn {
  background: #f39c12;
  color: white;
}

.edit-btn:hover {
  background: #e67e22;
}

.delete-btn {
  background: #e74c3c;
  color: white;
}

.delete-btn:hover {
  background: #c0392b;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #7f8c8d;
  padding: 5px;
}

.track-form {
  padding: 25px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e1e1e1;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
}

.input-with-preview {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-with-preview .form-input {
  flex: 1;
}

.preview-btn-inline {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid #3498db;
  background: white;
  color: #3498db;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  font-size: 14px;
}

.preview-btn-inline:hover:not(:disabled) {
  background: #3498db;
  color: white;
}

.preview-btn-inline:disabled {
  border-color: #bdc3c7;
  color: #bdc3c7;
  cursor: not-allowed;
}

.segmented {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.seg-btn {
  border: 1px solid #e1e1e1;
  background: #fff;
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #2c3e50;
  transition: all 0.2s ease;
}

.seg-btn.active {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.1);
  color: #2980b9;
}

.file-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #7f8c8d;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e9ecef;
}

.cancel-btn,
.submit-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.cancel-btn {
  background: #bdc3c7;
  color: white;
}

.submit-btn {
  background: #3498db;
  color: white;
}

.submit-btn:disabled,
.cancel-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.drag-ghost {
  opacity: 0.5;
}

.drag-chosen {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .add-btn,
  .save-btn {
    width: 100%;
  }

  .manager-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .stat-info {
    margin-left: 0;
  }
}

.search-section {
  padding: 0 25px;
  margin-bottom: 20px;
}

.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.search-input {
  flex: 1;
}

.search-btn {
  padding: 0 20px;
  background: #8e44ad;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.search-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.search-results {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: background 0.2s;
}

.search-item:last-child {
  border-bottom: none;
}

.search-item:hover {
  background: #f8f9fa;
}

.search-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  background: #eee;
}

.search-info {
  flex: 1;
  min-width: 0;
}

.search-title {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-author {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 2px;
}

.search-lrc-preview {
  font-size: 11px;
  color: #95a5a6;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.preview-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #3498db;
  background: white;
  color: #3498db;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}

.preview-btn.playing {
  background: #3498db;
  color: white;
}

.select-btn {
  padding: 4px 10px;
  background: white;
  border: 1px solid #3498db;
  color: #3498db;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.search-item:hover .select-btn {
  background: #3498db;
  color: white;
}

.search-error {
  margin-top: 8px;
  color: #e74c3c;
  font-size: 13px;
  text-align: center;
}
</style>
