<script setup>
defineProps({
  mode: { type: String, default: 'day' },
})
const MODE_META = {
  day: { label: '白天', icon: '☀️' },
  dusk: { label: '黄昏', icon: '🌇' },
  night: { label: '夜晚', icon: '🌙' },
}
const meta = (m) => MODE_META[m] || MODE_META.day
</script>

<template>
  <header class="top">
    <div class="brand glass">
      <div class="logo">🏠</div>
      <div class="titles">
        <div class="title">我的动漫小屋</div>
        <div class="sub">Anime Bedroom · 3D 漫游</div>
      </div>
    </div>
    <div class="mode glass">
      <span class="icon">{{ meta(mode).icon }}</span>
      <span class="label">{{ meta(mode).label }}</span>
      <span class="live" />
    </div>
  </header>
</template>

<style scoped>
.top {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 24;
  pointer-events: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 18px 9px 12px;
  border-radius: 999px;
  pointer-events: auto;
}

.logo {
  font-size: 22px;
  filter: drop-shadow(0 2px 8px rgba(255, 158, 199, 0.5));
}

.titles {
  line-height: 1.25;
}

.title {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.sub {
  font-size: 10.5px;
  color: var(--text-dim);
  letter-spacing: 0.08em;
}

.mode {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  border-radius: 999px;
  font-size: 12.5px;
  pointer-events: auto;
}

.live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7ef0b0;
  box-shadow: 0 0 8px #7ef0b0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@media (max-width: 640px) {
  .sub { display: none; }
  .top { top: 10px; }
}
</style>
