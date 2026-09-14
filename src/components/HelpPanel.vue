<script setup lang="ts">
import { content } from '../game/content'
import { totalGenerations } from '../game/engine'
</script>
<template>
  <div class="help-panel">
    <p class="body-copy">你的目标是让一条物种谱系穿过森林、草原与干旱，存活 {{ totalGenerations(content) }} 个世代。</p>
    <ol class="help-steps">
      <li><span>01</span><div><h3>观察环境</h3><p>每代先公开事件。食物、温度和捕食压力越高，损失越大。环境数字右侧是搭配手牌后的剩余压力。</p></div></li>
      <li><span>02</span><div><h3>搭配手牌</h3><p>每代抽 {{ content.rules.handSize }} 张牌，有 {{ content.rules.expressionBudget }} 点表达额度。点按选中，再点撤销；点 ⓘ 或长按查看详情。底部实时预测种群变化。</p></div></li>
      <li><span>03</span><div><h3>留下适应</h3><p>表达且存活累计 {{ content.rules.fixationThreshold }} 代即可固化。最多 {{ content.rules.permanentLimit }} 个永久性状，自动生效，也永久保留代价。固化无法撤销。</p></div></li>
      <li><span>04</span><div><h3>选择演化</h3><p>每 {{ content.rules.rewardInterval }} 代获得新牌或分支突变，也可以跳过。新牌进入弃牌堆；突变只替换一个副本，目标性状进度归零。</p></div></li>
    </ol>
    <details class="rule-details"><summary>资源与结算规则</summary><div class="body-copy"><p>三类资源的采集总量抵消食物压力，采集不超过可用量。资源每代刷新，不跨代储存。</p><p>出生 = max(0, {{ content.rules.baseBirths }} + 繁殖修正 − 剩余食物压力 × {{ content.rules.foodBirthPenalty }})。</p><p>每点食物、温度、捕食压力分别损失 {{ content.rules.deathRates.food }}、{{ content.rules.deathRates.temperature }}、{{ content.rules.deathRates.predation }} 个体。种群归零即灭绝。</p><p>同名性状共享进度，同代最多计一次；种群下降但仍存活也计次。固化移除全部同名牌，下代起生效。</p></div></details>
    <p class="fine-print">进度自动保存到当前浏览器。键盘可使用 Tab 切换、空格或 Enter 操作、Esc 关闭面板。</p>
  </div>
</template>
