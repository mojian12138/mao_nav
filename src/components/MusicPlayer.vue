<template>
  <div ref="container" class="music-player-mount"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import APlayer from 'aplayer'

const container = ref(null)

let player = null

const fallbackPlaylist = [
  {
    name: '问风',
    artist: '金渔',
    url: 'https:\/\/lu-sycdn.kuwo.cn\/1203aecf931ef1a34d164b59ed164926\/69a5b5e4\/resource\/a3\/65\/2\/614591865.aac',
    cover: 'https://img1.kuwo.cn/star/albumcover/120/65/21/1817139843.jpg'
  },
  {
    name: '前前前世',
    artist: 'RADWIMPS',
    url: 'https://moeplayer.b0.upaiyun.com/aplayer/track/2.mp3',
    cover: 'https://moeplayer.b0.upaiyun.com/aplayer/cover/2.jpg'
  },
  {
    name: '恋',
    artist: '星野源',
    url: 'https://moeplayer.b0.upaiyun.com/aplayer/track/3.mp3',
    cover: 'https://moeplayer.b0.upaiyun.com/aplayer/cover/3.jpg'
  }
]

const fetchPlaylist = async () => {
  try {
    const response = await fetch('/api/playlist')
    if (!response.ok) return fallbackPlaylist
    const data = await response.json()
    // Return full data object to access settings, or just audio array for backward compatibility
    if (data?.audio || Array.isArray(data)) return data
    return fallbackPlaylist
  } catch {
    return fallbackPlaylist
  }
}

const destroyPlayer = () => {
  if (!player) return
  player.destroy()
  player = null
}

const mountPlayer = async () => {
  destroyPlayer()
  if (!container.value) return

  const playlistData = await fetchPlaylist()
  const audio = Array.isArray(playlistData) ? playlistData : (playlistData?.audio || fallbackPlaylist)
  const settings = !Array.isArray(playlistData) && playlistData?.settings ? playlistData.settings : {}

  player = new APlayer({
    container: container.value,
    fixed: true,
    mini: false,
    autoplay: false,
    theme: '#667eea',
    loop: 'all',
    order: 'list',
    preload: 'metadata',
    volume: 0.7,
    mutex: true,
    lrcType: 3,
    listFolded: true,
    listMaxHeight: '240px',
    storageName: 'mao-nav-player',
    audio
  })

  // Apply LRC settings if available
  if (settings.lrcFontSize || settings.lrcColor) {
    const styleId = 'aplayer-lrc-style'
    let style = document.getElementById(styleId)
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.body.appendChild(style)
    }
    
    style.innerHTML = `
      html body .aplayer.aplayer-fixed .aplayer-info {
        height: auto !important;
      }
      html body .aplayer .aplayer-lrc {
        height: 72px !important;
      }
      html body .aplayer .aplayer-lrc p {
        font-size: ${settings.lrcFontSize || '14px'} !important;
        line-height: 1.6 !important;
        color: ${settings.lrcColor || '#ffffff'} !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        opacity: 0.8;
      }
      html body .aplayer .aplayer-lrc p.aplayer-lrc-current {
        font-size: calc(${settings.lrcFontSize || '14px'} + 4px) !important;
        color: ${settings.lrcColor || '#ffffff'} !important;
        font-weight: bold !important;
        opacity: 1 !important;
      }
    `
  }
}

const syncHandler = () => {
  mountPlayer()
}

const storageHandler = (e) => {
  if (e.key === 'playlist_version') syncHandler()
}

onMounted(() => {
  mountPlayer()
  window.addEventListener('playlist-version-updated', syncHandler)
  window.addEventListener('storage', storageHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('playlist-version-updated', syncHandler)
  window.removeEventListener('storage', storageHandler)
  destroyPlayer()
})
</script>

<style scoped>
.music-player-mount :deep(.aplayer.aplayer-fixed) {
  z-index: 800;
}

.music-player-mount :deep(.aplayer.aplayer-fixed .aplayer-body),
.music-player-mount :deep(.aplayer.aplayer-fixed .aplayer-list) {
  z-index: 801;
}

.music-player-mount :deep(.aplayer),
.music-player-mount :deep(.aplayer .aplayer-body) {
  background: #ffffff;
  color: #2c3e50;
}

.music-player-mount :deep(.aplayer .aplayer-info .aplayer-music .aplayer-author) {
  color: #64748b;
}

.music-player-mount :deep(.aplayer .aplayer-icon svg path),
.music-player-mount :deep(.aplayer .aplayer-icon svg circle) {
  fill: #2c3e50;
}

.music-player-mount :deep(.aplayer .aplayer-icon:hover svg path),
.music-player-mount :deep(.aplayer .aplayer-icon:hover svg circle) {
  fill: #000;
}

:global(.dark) .music-player-mount :deep(.aplayer) {
  background: #1e293b;
  color: #e2e8f0;
}

:global(.dark) .music-player-mount :deep(.aplayer .aplayer-body) {
  background: #1e293b;
}

:global(.dark) .music-player-mount :deep(.aplayer .aplayer-icon svg path),
:global(.dark) .music-player-mount :deep(.aplayer .aplayer-icon svg circle) {
  fill: #e2e8f0;
}

:global(.dark) .music-player-mount :deep(.aplayer .aplayer-info .aplayer-music .aplayer-title),
:global(.dark) .music-player-mount :deep(.aplayer .aplayer-info .aplayer-music .aplayer-author) {
  color: #e2e8f0;
}

:global(.dark) .music-player-mount :deep(.aplayer .aplayer-list) {
  background: #1e293b;
  border-top: 1px solid rgba(226, 232, 240, 0.12);
}

:global(.dark) .music-player-mount :deep(.aplayer .aplayer-list li) {
  border-top: 1px solid rgba(226, 232, 240, 0.08);
}

:global(.dark) .music-player-mount :deep(.aplayer .aplayer-list li:hover),
:global(.dark) .music-player-mount :deep(.aplayer .aplayer-list li.aplayer-list-light) {
  background: rgba(255, 255, 255, 0.06);
}
</style>
