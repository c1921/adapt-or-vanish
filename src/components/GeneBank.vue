<script setup lang="ts">
import { computed, ref } from 'vue'
import { content } from '../game/content'
import { categoryLabels } from '../game/presentation'
import { countTraits, type LibraryZone } from '../game/ui'
import type { RunState } from '../game/types'
import TraitCard from './TraitCard.vue'
import GameIcon from './GameIcon.vue'
const props = withDefaults(defineProps<{ state: RunState | null; initialZone?: LibraryZone }>(), { initialZone: 'owned' })
defineEmits<{ inspect: [traitId: string] }>()
const zone = ref<LibraryZone>(props.initialZone)
const search = ref('')
const category = ref('')
const counts = computed(() => countTraits(props.state, zone.value))
const entries = computed(() => Object.values(content.traits).filter(trait =>
  (zone.value === 'all' || counts.value[trait.id]) && (!category.value || trait.category === category.value) && trait.name.includes(search.value.trim()),
).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')))
const zones: { id: LibraryZone; label: string }[] = [{ id: 'owned', label: '基因库' }, { id: 'hand', label: '手牌' }, { id: 'draw', label: '抽牌' }, { id: 'discard', label: '弃牌' }, { id: 'all', label: '图鉴' }]
</script>
<template>
  <section class="gene-bank" aria-label="牌库与图鉴">
    <div class="segmented-control" aria-label="牌区筛选"><button v-for="tab in zones" :key="tab.id" type="button" :aria-pressed="zone === tab.id" @click="zone = tab.id">{{ tab.label }}</button></div>
    <div class="library-filters"><label class="search-input"><GameIcon name="search" :size="17" /><input v-model="search" type="search" placeholder="查找性状" aria-label="查找性状" /></label><select v-model="category" aria-label="性状分类"><option value="">全部分类</option><option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option></select></div>
    <p class="fine-print library-count">{{ entries.length }} 种性状 <span v-if="zone !== 'all'">· {{ Object.values(counts).reduce((sum, n) => sum + n, 0) }} 张牌</span><span v-if="zone === 'draw'"> · 仅展示构成，不表示抽取顺序</span></p>
    <div class="library-grid"><div v-for="trait in entries" :key="trait.id"><div class="library-card-label"><span>{{ counts[trait.id] ? `持有 ×${counts[trait.id]}` : state?.permanentTraits.some(f => f.traitId === trait.id) ? '已固化' : '未持有' }}</span><span v-if="!trait.rewardPool">分支</span></div><TraitCard :trait="trait" variant="library" :progress="state?.expressionCounts[trait.id] ?? 0" @inspect="$emit('inspect', trait.id)" /></div></div>
    <p v-if="!entries.length" class="empty-state">这里还没有符合条件的性状。</p>
  </section>
</template>
