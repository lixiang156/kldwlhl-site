<script setup>
defineProps({
  toasts: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="toast-layer">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast glass">
        <span class="icon">{{ t.icon || '✨' }}</span>
        <span class="text">{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-layer {
  position: absolute;
  left: 50%;
  bottom: 108px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 60;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 13.5px;
  white-space: nowrap;
  background: rgba(16, 19, 30, 0.88);
}

.icon {
  font-size: 15px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.94);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}
</style>
