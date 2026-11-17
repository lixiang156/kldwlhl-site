<script setup>
defineProps({
  hint: { type: String, default: '' },
})
</script>

<template>
  <div class="crosshair-wrap">
    <div class="crosshair" :class="{ active: !!hint }">
      <span class="dot" />
      <span class="ring" />
    </div>
    <Transition name="fade">
      <div v-if="hint" class="hint glass">{{ hint }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.crosshair-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 22;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.crosshair {
  position: relative;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  transition: transform 0.18s ease;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
  transition: all 0.18s ease;
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.28);
  transition: all 0.22s ease;
}

.crosshair.active .dot {
  width: 7px;
  height: 7px;
  background: #ffd9ec;
  box-shadow: 0 0 14px rgba(255, 158, 199, 0.9);
}

.crosshair.active .ring {
  transform: scale(1.35);
  border-color: rgba(255, 158, 199, 0.75);
}

.hint {
  position: absolute;
  top: 44px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  background: rgba(16, 19, 30, 0.82);
}
</style>
