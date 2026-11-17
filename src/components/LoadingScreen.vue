<script setup>
import { computed } from 'vue'

const props = defineProps({
  progress: { type: Number, default: 0 },
  label: { type: String, default: '准备中…' },
  error: { type: String, default: '' },
  canStart: { type: Boolean, default: false },
})
defineEmits(['start', 'retry'])

const percent = computed(() => Math.round(props.progress * 100))
</script>

<template>
  <div class="loading">
    <div class="card glass">
      <div class="emoji">🌙</div>
      <h1>我的动漫小屋</h1>
      <p class="sub">一个可以走进去的 3D 卧室</p>

      <div v-if="error" class="error-box">
        <div class="err-title">加载出错了</div>
        <p class="err-msg">{{ error }}</p>
        <button class="btn primary" @click="$emit('retry')">重试</button>
      </div>

      <template v-else>
        <div class="bar-wrap">
          <div class="bar" :style="{ width: percent + '%' }" />
        </div>
        <div class="status">
          <span>{{ label }}</span>
          <span class="num">{{ percent }}%</span>
        </div>
      </template>

      <div class="tips">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</span>
        <span><kbd>Shift</kbd> 奔跑</span>
        <span><kbd>ESC</kbd> 释放鼠标</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: radial-gradient(ellipse at 50% 40%, #1b2036 0%, #080a12 70%);
}

.card {
  width: min(440px, 86vw);
  padding: 34px 32px 26px;
  text-align: center;
  animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes rise {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
}

.emoji {
  font-size: 42px;
  animation: float 3.2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

h1 {
  margin: 10px 0 4px;
  font-size: 22px;
  letter-spacing: 0.04em;
}

.sub {
  margin: 0 0 26px;
  font-size: 12.5px;
  color: var(--text-dim);
}

.bar-wrap {
  height: 5px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.09);
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--pink), var(--blue));
  transition: width 0.35s ease;
  box-shadow: 0 0 18px rgba(255, 158, 199, 0.6);
}

.status {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--text-dim);
}

.num {
  font-variant-numeric: tabular-nums;
  color: var(--pink);
}

.tips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 16px;
  margin-top: 28px;
  font-size: 11px;
  color: var(--text-dim);
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  margin-right: 2px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-family: inherit;
  font-size: 10px;
}

.error-box {
  padding: 8px 0 0;
}

.err-title {
  font-size: 14px;
  color: #ff9a9a;
  margin-bottom: 6px;
}

.err-msg {
  font-size: 12px;
  color: var(--text-dim);
  word-break: break-all;
  line-height: 1.6;
}

.btn {
  margin-top: 16px;
  padding: 10px 24px;
  border-radius: 999px;
  font-size: 13px;
}

.btn.primary {
  background: linear-gradient(135deg, var(--pink), #c79bff);
  color: #201225;
  font-weight: 600;
}
</style>
