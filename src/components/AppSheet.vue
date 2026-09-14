<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import GameIcon from './GameIcon.vue'
const props = withDefaults(defineProps<{ title: string; eyebrow?: string; back?: boolean }>(), { eyebrow: '', back: false })
const emit = defineEmits<{ close: []; back: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const heading = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)
const titleId = useId()
let previousFocus: HTMLElement | null = null
let previousOverflow = ''
onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  document.body.style.overflow = previousOverflow
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
})
watch(() => props.title, async () => {
  await nextTick()
  body.value?.scrollTo({ top: 0 })
  heading.value?.focus({ preventScroll: true })
})
</script>
<template>
  <Teleport to="body">
    <dialog ref="dialog" class="app-sheet" :aria-labelledby="titleId" @cancel.prevent="emit('close')" @click="($event.target === dialog) && emit('close')">
      <div class="sheet-surface">
        <header class="sheet-header">
          <button v-if="back" type="button" class="icon-button" aria-label="返回上一面板" @click="emit('back')"><GameIcon name="back" /></button>
          <div class="sheet-heading"><p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p><h2 :id="titleId" ref="heading" tabindex="-1">{{ title }}</h2></div>
          <button type="button" class="icon-button" aria-label="关闭面板" @click="emit('close')"><GameIcon name="close" /></button>
        </header>
        <div ref="body" class="sheet-body"><slot /></div>
        <footer v-if="$slots.footer" class="sheet-footer"><slot name="footer" /></footer>
      </div>
    </dialog>
  </Teleport>
</template>
