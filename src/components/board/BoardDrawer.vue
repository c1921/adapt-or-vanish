<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  panel.value?.querySelector<HTMLElement>('button, [href], input, summary')?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
void props
</script>

<template>
  <div class="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
  <aside ref="panel" class="drawer board" role="dialog" aria-modal="true" :aria-label="title">
    <div class="drawer-head">
      <h2 class="board-title">{{ title }}</h2>
      <button type="button" class="btn-board-quiet" @click="emit('close')">
        关闭 <span class="text-ink-dim">Esc</span>
      </button>
    </div>
    <div class="drawer-body">
      <slot />
    </div>
  </aside>
</template>
