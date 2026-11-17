<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  photo: { type: Object, required: true },
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
    <div class="frame">
      <div class="photo-wrap">
        <img v-if="photo.image" :src="photo.image" :alt="photo.title" class="photo" />
        <div v-else class="placeholder">
          <span>🖼️</span>
          <p>把照片放到 <code>public/images/</code>，<br />然后在 Blender 里贴到画框面上</p>
        </div>
      </div>
      <div class="caption glass">
        <div class="row">
          <h3>{{ photo.title }}</h3>
          <button class="close" @click="emit('close')">✕</button>
        </div>
        <p v-if="photo.caption" class="desc">{{ photo.caption }}</p>
        <div class="meta">点击空白处或按 ESC 关闭</div>
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
  padding: 4vh 4vw;
  background: rgba(5, 7, 13, 0.72);
  backdrop-filter: blur(10px);
  animation: fadein 0.26s ease;
}

@keyframes fadein {
  from { opacity: 0; }
}

.frame {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 92vh;
  animation: pop 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes pop {
  from { opacity: 0; transform: scale(0.94) translateY(10px); }
}

.photo-wrap {
  border-radius: 14px;
  overflow: hidden;
  background: #11141d;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: grid;
  place-items: center;
}

.photo {
  display: block;
  max-width: min(78vw, 720px);
  max-height: 64vh;
  object-fit: contain;
}

.placeholder {
  width: min(78vw, 520px);
  height: 300px;
  display: grid;
  place-items: center;
  color: var(--text-dim);
  text-align: center;
  font-size: 12.5px;
  line-height: 1.8;
}

.placeholder span {
  font-size: 40px;
}

.placeholder code {
  color: var(--blue);
  font-size: 11.5px;
}

.caption {
  padding: 14px 18px;
  border-radius: 14px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

h3 {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.03em;
}

.close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 12px;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.07);
  transition: all 0.16s ease;
}

.close:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.desc {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.72);
}

.meta {
  margin-top: 8px;
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.32);
}
</style>
