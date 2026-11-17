<script setup>
defineProps({
  music: { type: Boolean, default: false },
  touring: { type: Boolean, default: false },
  mode: { type: String, default: 'day' },
})
defineEmits(['time', 'music', 'home', 'tour', 'guestbook', 'help'])

const MODE_ICON = { day: '☀️', dusk: '🌇', night: '🌙' }
</script>

<template>
  <nav class="hud glass">
    <button class="item" :class="{ on: touring }" @click="$emit('tour')">
      <span class="ico">{{ touring ? '⏹' : '🎬' }}</span>
      <span class="txt">{{ touring ? '停止' : '巡游' }}</span>
    </button>

    <span class="sep" />

    <button class="item" @click="$emit('time')">
      <span class="ico">{{ MODE_ICON[mode] }}</span>
      <span class="txt">昼夜</span>
    </button>

    <button class="item" :class="{ on: music }" @click="$emit('music')">
      <span class="ico">{{ music ? '🔊' : '🎵' }}</span>
      <span class="txt">音乐</span>
      <span v-if="music" class="eq"><i /><i /><i /></span>
    </button>

    <button class="item" @click="$emit('guestbook')">
      <span class="ico">📖</span>
      <span class="txt">留言板</span>
    </button>

    <span class="sep" />

    <button class="item" @click="$emit('home')">
      <span class="ico">🏠</span>
      <span class="txt">回起点</span>
    </button>

    <button class="item" @click="$emit('help')">
      <span class="ico">❔</span>
      <span class="txt">帮助</span>
    </button>
  </nav>
</template>

<style scoped>
.hud {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 7px 10px;
  border-radius: 999px;
  z-index: 24;
  pointer-events: auto;
}

.item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  color: var(--text-dim);
  transition: all 0.18s ease;
}

.item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
  transform: translateY(-1px);
}

.item.on {
  background: rgba(255, 158, 199, 0.16);
  color: #ffd3e6;
  box-shadow: inset 0 0 0 1px rgba(255, 158, 199, 0.28);
}

.ico {
  font-size: 15px;
  line-height: 1;
}

.sep {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 11px;
  margin-left: -2px;
}

.eq i {
  width: 2px;
  background: var(--pink);
  border-radius: 2px;
  animation: bounce 0.9s ease-in-out infinite;
}

.eq i:nth-child(1) { height: 5px; animation-delay: 0s; }
.eq i:nth-child(2) { height: 10px; animation-delay: 0.18s; }
.eq i:nth-child(3) { height: 7px; animation-delay: 0.36s; }

@keyframes bounce {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

@media (max-width: 720px) {
  .txt { display: none; }
  .item { padding: 10px 12px; }
  .ico { font-size: 17px; }
}
</style>
