<script setup lang="ts">
import { content } from '../game/content'
</script>

<template>
  <details class="panel p-5">
    <summary class="cursor-pointer text-sm font-semibold">
      <span aria-hidden="true">📖</span>
      规则与计算说明
    </summary>
    <div class="mt-3 space-y-4 text-xs leading-relaxed text-slate-600">
      <section>
        <h3 class="text-sm font-semibold text-slate-800">每一代的三步</h3>
        <ol class="mt-1.5 space-y-1">
          <li>1. 环境出题：这一代的环境压力与随机事件决定威胁。</li>
          <li>
            2. 表达性状：从手牌中选择性状，总量不超过
            {{ content.rules.expressionBudget }} 点。选择会立刻反映在生存预测里。
          </li>
          <li>
            3. 结算与固化：种群变化被记录下来；表达且存活的性状累计一次固化进度，累计
            {{ content.rules.fixationThreshold }} 次即可固化为永久性状。
          </li>
        </ol>
      </section>
      <section>
        <h3 class="text-sm font-semibold text-slate-800">结算公式</h3>
        <p class="mt-1.5">
          出生 = max(0, {{ content.rules.baseBirths }} + 繁殖修正 − 剩余食物压力 ×
          {{ content.rules.foodBirthPenalty }})。 每点食物、温度、捕食压力分别造成
          {{ content.rules.deathRates.food }}、{{ content.rules.deathRates.temperature }}、{{
            content.rules.deathRates.predation
          }}
          个个体损失。灭绝时死亡总数不超过现有种群加本代出生。
        </p>
      </section>
      <section>
        <h3 class="text-sm font-semibold text-slate-800">环境与资源</h3>
        <p class="mt-1.5">
          资源每代刷新，采集量不超过环境可用量，采集总量抵消食物压力。 压力上限
          {{ content.rules.maxPressure }}，资源上限 {{ content.rules.maxResource }}。
          温度和资源相关的性状只在对应气候下生效，卡牌会标明"当前环境不生效"。
        </p>
      </section>
      <section>
        <h3 class="text-sm font-semibold text-slate-800">性状与固化</h3>
        <p class="mt-1.5">
          临时性状和永久性状的效果相加；同一组牌的结算与点击顺序无关。
          固化进度按性状类型共享，同一代最多增加一次。 永久性状最多
          {{ content.rules.permanentLimit }} 个，首版不提供替换。
          新卡加入弃牌堆；突变替换一张原牌，目标性状进度归零。
        </p>
      </section>
      <section>
        <h3 class="text-sm font-semibold text-slate-800">进程与存档</h3>
        <p class="mt-1.5">
          每 {{ content.rules.rewardInterval }} 代出现一次演化选择。穿越
          {{ content.environments.map((entry) => entry.name).join(' · ') }} 共
          {{ content.environments.reduce((sum, entry) => sum + entry.duration, 0) }}
          代且种群存活即为延续。相同种子与相同选择会重现相同的演化过程，进度保存在当前浏览器中。
          首版所有数值使用抽象游戏单位。
        </p>
      </section>
    </div>
  </details>
</template>
