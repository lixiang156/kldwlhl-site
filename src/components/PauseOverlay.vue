<script setup>
defineProps({
  touring: { type: Boolean, default: false },
})
defineEmits(['start'])
</script>

<template>
  <div class="pause" @click="$emit('start')">
    <div class="card glass" @click.stop="$emit('start')">
      <div class="mask-icon">{{ touring ? '🎬' : '🚪' }}</div>
      <h2>{{ touring ? '正在自动巡游…' : '点击进入小屋' }}</h2>
      <p class="desc">
        {{ touring ? '镜头会自己逛一圈，按 T 或点击卡片停止。' : '鼠标控制视角，WASD 走路，ESC 随时退出。' }}
      </p>
      <div class="actions">
        <button class="btn primary">{{ touring ? '停止巡游' : '开始漫游' }}</button>
      </div>
      <div class="hints">
        <span><b>WASD</b> 移动</span>
        <span><b>Shift</b> 奔跑</span>
        <span><b>T</b> 巡游</span>
        <span><b>1 / 2 / 3</b> 时间</span>
        <span><b>M</b> 音乐</span>
      </div>
      <div class="mobile-tip">💡 第一人称漫游需要桌面浏览器的鼠标锁定</div>
    </div>
  </div>
</template>

<style scoped>
.pause {
  position: absolute;
  inset: 0;
  z-index: 16;
  display: grid;
  place-items: center;
  background: rgba(6, 8, 15, 0.45);
  backdrop-filter: blur(2px);
  cursor: pointer;
}

.card {
  width: min(400px, 86vw);
  padding: 32px 30px 24px;
  text-align: center;
  cursor: pointer;
  animation: pop 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes pop {
  from { opacity: 0; transform: translateY(14px) scale(0.96); }
}

.mask-icon {
  font-size: 38px;
  margin-bottom: 8px;
}

h2 {
  margin: 0 0 8px;
  font-size: 18px;
  letter-spacing: 0.03em;
}

.desc {
  margin: 0 0 22px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-dim);
}

.actions {
  display: flex;
  justify-content: center;
}

.btn {
  padding: 11px 32px;
  border-radius: 999px;
  font-size: 13.5px;
  letter-spacing: 0.06em;
}

.btn.primary {
  background: linear-gradient(135deg, var(--pink), #c79bff);
  color: #201225;
  font-weight: 600;
  box-shadow: 0 10px 26px rgba(255, 158, 199, 0.32);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(255, 158, 199, 0.45);
}

.hints {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 14px;
  margin-top: 22px;
  font-size: 10.5px;
  color: var(--text-dim);
}

.hints b {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.mobile-tip {
  margin-top: 14px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.34);
}
</style>
