<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  info: { type: Object, required: true },
})
const emit = defineEmits(['close'])

const onKey = (e) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="modal" @click.self="emit('close')">
    <div class="card glass">
      <div class="icon">{{ info.icon || '💡' }}</div>
      <h3>{{ info.title }}</h3>
      <p class="text">{{ info.text }}</p>
      <ul v-if="info.list" class="list">
        <li v-for="(row, i) in info.list" :key="i">
          <span v-if="row.k" class="k">{{ row.k }}</span>
          <span class="v">{{ row.v }}</span>
        </li>
      </ul>
      <button class="close" @click="emit('close')">知道了</button>
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
  padding: 4vh 4vw;
  background: rgba(5, 7, 13, 0.72);
  backdrop-filter: blur(10px);
  animation: fadein 0.24s ease;
}

@keyframes fadein {
  from { opacity: 0; }
}

.card {
  width: min(460px, 92vw);
  max-height: 84vh;
  overflow-y: auto;
  padding: 28px 26px 22px;
  text-align: center;
  background: rgba(17, 20, 31, 0.95);
  animation: pop 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes pop {
  from { opacity: 0; transform: scale(0.96) translateY(12px); }
}

.icon {
  font-size: 34px;
  margin-bottom: 6px;
}

h3 {
  margin: 0 0 10px;
  font-size: 16px;
  letter-spacing: 0.03em;
}

.text {
  margin: 0 0 16px;
  font-size: 12.5px;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.7);
  white-space: pre-line;
}

.list {
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 7px;
  text-align: left;
}

.list li {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.045);
  font-size: 11.5px;
}

.k {
  min-width: 92px;
  color: #8ad7ff;
  flex-shrink: 0;
}

.v {
  color: rgba(255, 255, 255, 0.72);
}

.close {
  padding: 9px 26px;
  border-radius: 999px;
  font-size: 12.5px;
  background: rgba(255, 255, 255, 0.09);
  color: var(--text);
  transition: background 0.16s ease;
}

.close:hover {
  background: rgba(255, 255, 255, 0.16);
}
</style>
