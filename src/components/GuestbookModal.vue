<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { api } from '../services/api'

const emit = defineEmits(['close', 'toast'])

const messages = ref([])
const loading = ref(true)
const submitting = ref(false)
const offline = ref(false)
const name = ref(localStorage.getItem('bedroom.nickname') || '')
const text = ref('')
const mood = ref('✨')
const error = ref('')

const MOODS = ['✨', '🌙', '☕', '🎮', '🌸', '💭']

const remaining = computed(() => 240 - text.value.length)
const canSubmit = computed(() => text.value.trim().length > 0 && !submitting.value)

async function load() {
  loading.value = true
  const res = await api.listMessages()
  messages.value = res.messages
  offline.value = res.offline
  loading.value = false
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = ''
  try {
    const res = await api.addMessage({ name: name.value.trim() || '匿名旅人', text: text.value.trim(), mood: mood.value })
    messages.value.unshift(res.message)
    offline.value = res.offline
    localStorage.setItem('bedroom.nickname', name.value.trim() || '匿名旅人')
    text.value = ''
    emit('toast', { text: '留言成功，谢谢来过 ✨', icon: '📖' })
  } catch (e) {
    error.value = '留言失败，稍后再试试'
  } finally {
    submitting.value = false
  }
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function formatTime(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="modal" @click.self="emit('close')">
    <div class="panel glass">
      <header>
        <div>
          <h2>📖 留言簿</h2>
          <p class="sub">来过的人，都可以在这里留一句话</p>
        </div>
        <button class="close" @click="emit('close')">✕</button>
      </header>

      <div class="body">
        <form class="form" @submit.prevent="submit">
          <div class="row">
            <input v-model="name" class="input name" maxlength="24" placeholder="你的昵称" />
            <div class="moods">
              <button
                v-for="m in MOODS"
                :key="m"
                type="button"
                class="mood"
                :class="{ on: mood === m }"
                @click="mood = m"
              >
                {{ m }}
              </button>
            </div>
          </div>
          <textarea
            v-model="text"
            class="input area"
            maxlength="240"
            rows="3"
            placeholder="说点什么…（比如你也想要这样一间房）"
            @keydown.ctrl.enter.prevent="submit"
            @keydown.meta.enter.prevent="submit"
          />
          <div class="form-foot">
            <span class="count" :class="{ warn: remaining < 20 }">还剩 {{ remaining }} 字</span>
            <button type="submit" class="submit" :disabled="!canSubmit">
              {{ submitting ? '发送中…' : '写下留言' }}
            </button>
          </div>
          <p v-if="error" class="error">{{ error }}</p>
        </form>

        <div class="list-head">
          <span>大家的留言</span>
          <span class="badge" :class="{ local: offline }">{{ offline ? '本地模式' : '在线' }}</span>
        </div>

        <div class="list">
          <div v-if="loading" class="empty">加载中…</div>
          <div v-else-if="!messages.length" class="empty">还没有人留言，你可以是第一个 ✨</div>
          <article v-for="m in messages" :key="m.id" class="note">
            <div class="note-head">
              <span class="avatar">{{ m.mood || '✨' }}</span>
              <span class="who">{{ m.name }}</span>
              <span class="time">{{ formatTime(m.createdAt) }}</span>
            </div>
            <p class="note-text">{{ m.text }}</p>
          </article>
        </div>

        <p v-if="offline" class="offline-tip">
          当前是本地模式（留言存在你这台浏览器里）。接上 Cloudflare KV 或 Supabase 后，所有人就能互相看到留言了。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: absolute;
  inset: 0;
  z-index: 45;
  display: grid;
  place-items: center;
  padding: 3vh 3vw;
  background: rgba(5, 7, 13, 0.72);
  backdrop-filter: blur(10px);
  animation: fadein 0.24s ease;
}

@keyframes fadein {
  from { opacity: 0; }
}

.panel {
  width: min(620px, 94vw);
  max-height: min(86vh, 780px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: pop 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  background: rgba(17, 20, 31, 0.95);
}

@keyframes pop {
  from { opacity: 0; transform: scale(0.96) translateY(12px); }
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 22px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

h2 {
  margin: 0;
  font-size: 16px;
  letter-spacing: 0.03em;
}

.sub {
  margin: 5px 0 0;
  font-size: 11.5px;
  color: var(--text-dim);
}

.close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-dim);
  font-size: 12px;
}

.close:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.body {
  padding: 16px 22px 20px;
  overflow-y: auto;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  padding: 10px 12px;
  outline: none;
  transition: border-color 0.18s ease, background 0.18s ease;
}

.input:focus {
  border-color: rgba(255, 158, 199, 0.55);
  background: rgba(255, 255, 255, 0.09);
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.28);
}

.name {
  flex: 1;
}

.moods {
  display: flex;
  gap: 3px;
}

.mood {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  font-size: 14px;
  opacity: 0.45;
  transition: all 0.16s ease;
}

.mood:hover {
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.08);
}

.mood.on {
  opacity: 1;
  background: rgba(255, 158, 199, 0.2);
  box-shadow: inset 0 0 0 1px rgba(255, 158, 199, 0.4);
}

.area {
  resize: vertical;
  min-height: 74px;
  line-height: 1.65;
}

.form-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.count {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.3);
}

.count.warn {
  color: #ffb37a;
}

.submit {
  padding: 9px 22px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: #201225;
  background: linear-gradient(135deg, var(--pink), #c79bff);
  transition: all 0.18s ease;
}

.submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.submit:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(255, 158, 199, 0.35);
}

.error {
  margin: 0;
  font-size: 11.5px;
  color: #ff9a9a;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0 12px;
  font-size: 11.5px;
  color: var(--text-dim);
  letter-spacing: 0.06em;
}

.badge {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 9.5px;
  background: rgba(126, 240, 176, 0.14);
  color: #7ef0b0;
}

.badge.local {
  background: rgba(255, 200, 120, 0.14);
  color: #ffc878;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.empty {
  padding: 26px 0;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

.note {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.note-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.avatar {
  font-size: 13px;
}

.who {
  font-size: 12px;
  font-weight: 600;
  color: #ffd3e6;
}

.time {
  margin-left: auto;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.26);
  font-variant-numeric: tabular-nums;
}

.note-text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.78);
  word-break: break-word;
}

.offline-tip {
  margin: 18px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 200, 120, 0.07);
  border: 1px solid rgba(255, 200, 120, 0.14);
  font-size: 11px;
  line-height: 1.7;
  color: rgba(255, 200, 120, 0.8);
}
</style>
