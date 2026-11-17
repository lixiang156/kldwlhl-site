<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { BedroomApp } from './three/BedroomApp'
import { api } from './services/api'

import LoadingScreen from './components/LoadingScreen.vue'
import PauseOverlay from './components/PauseOverlay.vue'
import HudBar from './components/HudBar.vue'
import TopBar from './components/TopBar.vue'
import Crosshair from './components/Crosshair.vue'
import PhotoModal from './components/PhotoModal.vue'
import GuestbookModal from './components/GuestbookModal.vue'
import InfoModal from './components/InfoModal.vue'
import ToastLayer from './components/ToastLayer.vue'

const canvasEl = ref(null)
const statsEl = ref(null)
const guiEl = ref(null)
const app = shallowRef(null)

const loading = ref(true)
const ready = ref(false)
const progress = ref(0)
const label = ref('准备中…')
const loadError = ref('')

const locked = ref(false)
const hoverHint = ref('')
const modal = ref(null)
const timeMode = ref('day')
const musicOn = ref(false)
const touring = ref(false)
const toasts = ref([])

let toastSeq = 0
let checkedIn = false

function pushToast(t) {
  const id = ++toastSeq
  toasts.value.push({ id, ...t })
  setTimeout(() => {
    toasts.value = toasts.value.filter((x) => x.id !== id)
  }, 3400)
}

async function runCheckIn() {
  if (checkedIn) return
  checkedIn = true
  try {
    const nickname = localStorage.getItem('bedroom.nickname') || '路过的旅人'
    const res = await api.checkIn(nickname)
    if (!res.already) {
      pushToast({ text: '欢迎来到我的小屋，' + res.visitor.name, icon: '🎉' })
    }
  } catch {
    /* 打卡失败不影响体验 */
  }
}

/* ------------------------------------------------------------------ */
/* 初始化                                                              */
/* ------------------------------------------------------------------ */
onMounted(async () => {
  await nextTick()
  app.value = new BedroomApp({
    canvas: canvasEl.value,
    statsContainer: statsEl.value,
    guiContainer: guiEl.value,
    onProgress: (p) => {
      progress.value = p.progress
      label.value = p.label
    },
    onLockChange: (v) => {
      locked.value = v
      if (v) runCheckIn()
    },
    onHover: (data) => {
      hoverHint.value = data ? data.hint || data.label || '点击' : ''
    },
    onPick: (data) => {
      openModal(data)
    },
    onToast: (t) => pushToast(t),
    onTimeChange: (m) => {
      timeMode.value = m
    },
    onMusicChange: (v) => {
      musicOn.value = v
    },
    onTourChange: (v) => {
      touring.value = v
    },
  })

  try {
    await app.value.init()
    // 方便在控制台里调东西：__bedroom.setTimeOfDay('night') / .toggleMusic()
    window.__bedroom = app.value
    progress.value = 1
    ready.value = true
    setTimeout(() => {
      loading.value = false
      if (window.matchMedia('(pointer: coarse)').matches) {
        pushToast({ text: '移动端暂不支持第一人称漫游，建议用桌面浏览器', icon: '💻' })
      }
    }, 480)
  } catch (err) {
    console.error(err)
    loadError.value = String(err && err.message ? err.message : err)
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (app.value) app.value.dispose()
  app.value = null
})

/* ------------------------------------------------------------------ */
/* 交互                                                                */
/* ------------------------------------------------------------------ */
function startExperience() {
  if (!app.value || modal.value) return
  app.value.start()
}

function openModal(data) {
  if (!app.value) return
  if (app.value.player) app.value.player.unlock()
  if (app.value.tour && app.value.tour.isActive) app.value.tour.stop()
  app.value.shortcutsEnabled = false
  modal.value = data
}

function closeModal() {
  modal.value = null
  if (app.value) app.value.shortcutsEnabled = true
}

function openGuestbook() {
  openModal({ type: 'book' })
}

function openHelp() {
  openModal({
    type: 'info',
    title: '怎么玩这间小屋',
    icon: '🧭',
    text: '这是一间可以用第一人称走进去的卧室。所有摆件都能点 —— 相框会放大、电脑会跳链接、收音机会放歌、留言簿能写字。',
    list: [
      { k: 'W A S D', v: '前后左右走动' },
      { k: 'Shift', v: '加速跑' },
      { k: '鼠标', v: '转动视角' },
      { k: 'ESC', v: '释放鼠标、暂停漫游' },
      { k: '点击摆件', v: '对准准星按左键交互' },
      { k: '1 / 2 / 3', v: '白天 / 黄昏 / 夜晚' },
      { k: 'T', v: '自动巡游一圈' },
      { k: 'M', v: '播放 / 暂停背景音乐' },
      { k: 'L', v: '开 / 关台灯' },
      { k: '右上角 ⚙', v: '调灯光、位置、曝光' },
    ],
  })
}

function infoOf(data) {
  return {
    icon: data.type === 'door' ? '🚪' : '💡',
    title: data.title || data.label || '提示',
    text: data.text || '',
  }
}

function onTimeClick() {
  if (app.value) app.value.cycleTimeOfDay()
}

function onMusicClick() {
  if (app.value) app.value.toggleMusic()
}

function onHomeClick() {
  if (app.value) app.value.returnToStart()
}

function onTourClick() {
  if (app.value) app.value.toggleTour()
}

function reload() {
  window.location.reload()
}
</script>

<template>
  <div class="app">
    <canvas ref="canvasEl" class="scene-canvas" />
    <div class="vignette" />
    <div ref="statsEl" class="stats-host" />
    <div ref="guiEl" class="gui-host" />

    <template v-if="ready">
      <TopBar :mode="timeMode" />

      <HudBar
        :music="musicOn"
        :touring="touring"
        :mode="timeMode"
        @time="onTimeClick"
        @music="onMusicClick"
        @home="onHomeClick"
        @tour="onTourClick"
        @guestbook="openGuestbook"
        @help="openHelp"
      />

      <Crosshair v-if="locked && !modal" :hint="hoverHint" />

      <Transition name="fade">
        <PauseOverlay v-if="!locked && !modal" :touring="touring" @start="startExperience" />
      </Transition>
    </template>

    <LoadingScreen
      v-if="loading"
      :progress="progress"
      :label="label"
      :error="loadError"
      @retry="reload"
    />

    <PhotoModal v-if="modal && modal.type === 'photo'" :photo="modal" @close="closeModal" />
    <GuestbookModal v-if="modal && modal.type === 'book'" @close="closeModal" @toast="pushToast" />
    <InfoModal
      v-if="modal && (modal.type === 'info' || modal.type === 'door')"
      :info="infoOf(modal)"
      @close="closeModal"
    />

    <ToastLayer :toasts="toasts" />
  </div>
</template>

<style scoped>
.app {
  position: fixed;
  inset: 0;
  overflow: hidden;
}
</style>
