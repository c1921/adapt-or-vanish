<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../game/content'
import { totalGenerations } from '../game/engine'
import type { RunState } from '../game/types'
import GameIcon from './GameIcon.vue'
const props = defineProps<{ state: RunState }>()
defineEmits<{ menu: [] }>()
const total = totalGenerations(content)
const chapter = computed(() => content.environments.findIndex(e => e.id === props.state.environment.environmentId))
</script>
<template>
  <header class="run-header">
    <div class="run-brand"><span class="brand-symbol"><GameIcon name="sprout" :size="21" /></span><span>适者延续<small>ADAPT OR VANISH</small></span></div>
    <div class="header-population"><GameIcon name="population" :size="17" /><strong data-testid="population">{{ state.population }}</strong><span>种群</span></div>
    <button class="icon-button" type="button" aria-label="游戏菜单" @click="$emit('menu')"><GameIcon name="menu" /></button>
    <div class="run-progress"><ol aria-label="环境进程"><li v-for="(environment, i) in content.environments" :key="environment.id" :aria-current="i === chapter ? 'step' : undefined" :class="{ current: i === chapter, complete: i < chapter }"><span class="chapter-dot"><GameIcon v-if="i < chapter" name="check" :size="10" /><template v-else>{{ i + 1 }}</template></span>{{ environment.name }}</li></ol><p><strong>{{ String(state.generation).padStart(2, '0') }}</strong><span> / {{ total }} 代</span></p></div>
  </header>
</template>
