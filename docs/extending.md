# 扩展指南

## 分层与入口

`src/game/types.ts` 定义领域类型，`content.ts` 提供内容包，`engine.ts` 提供纯函数入口：

```ts
createRun(seed, content) // RunState
previewGeneration(state, content, selectedCardIds?) // GenerationResult
reduceGame(state, action, content) // { state, error }
```

引擎接受显式内容包，可为测试或未来不同起源注入新配置。所有公开操作保持输入状态不变；无效动作返回原状态和中文错误，不消耗随机数。

状态保存卡牌实例、三个牌区、共享表达进度、永久性状、环境快照和随机流。界面只展示结果并派发 `GameAction`，不要在组件中计算第二套游戏规则。Zod 仅用于持久化边界，不进入规则层。

## 添加普通卡牌

在 `src/game/content.ts` 的 `traits` 数组中添加定义。辅助函数封装了类型化效果，避免每张牌写专用逻辑：

```ts
trait(
  'efficient-kidneys',
  '高效肾脏',
  'physiology',
  1,
  ['efficient', 'cooling'],
  '在炎热环境中节省维持成本，但挤占繁殖投入。',
  [pressure('temperature', -3, hot), pressure('food', -1), births(-1)],
  '节水生理',
  [pressure('temperature', -2, hot), births(-1)],
)
```

- ID 是稳定引用；名称仅用于展示。费用、效果量和配置值使用整数。
- `rewardPool: true` 的牌自动进入普通奖励池，无需修改组件。
- 永久效果单独配置。代价必须是实际效果，不能仅写在描述里。
- 温度条件支持 `cold/hot`；标签条件要求所有标签同时存在于本代已表达或永久性状中。
- 新标签的中文显示名放在 `src/game/presentation.ts` 的 `tagLabels`，无需逐个改界面。
- 更新 `content.version`，运行内容校验、规则与存档测试；新增内容数量变化时同步调整内容数量测试。

## 添加环境或突变

环境定义包含 ID、名称、温度方向、持续世代、按本地世代排序的 `stages`，以及可用事件 ID。首个阶段从 1 开始；每个阶段同时定义三类压力和三类资源。总世代与转场由环境数组自动推导。

事件通过 `pressures/resources` 的增量修改环境。当需要新的事件时，在事件表添加定义，再加入目标环境的 `eventIds`。确保文案与增量一致。

新增突变示例：

```ts
{ id: 'limbs-specialized', from: 'forelimbs', to: 'new-trait-id', description: '说明生态方向与代价。' }
```

先定义目标性状，分支专属目标通常设为 `rewardPool: false`。引擎自动检查源牌、目标是否已持有或固化，并把合法分支纳入演化候选。

## 添加效果或规则

当前通用效果为 `pressure`、`harvest` 和 `births`。效果先按条件过滤并汇总，再一次性应用。新增效果类型时依次更新：

1. `Effect` 的判别联合与 `effects.ts` 中的处理器。
2. 若需要新结算字段，扩展 `GenerationResult` 和唯一的 `previewGeneration` 计算路径。
3. `describeEffect` 的展示文案与正负效果判断。
4. 覆盖顺序无关、预览一致和持久化恢复的测试。

不要在卡牌定义内存函数、临时闭包或 Vue 对象。不要在引擎中调用 `Math.random()`、时间或存储 API；随机行为必须使用 `rngState` 并推进可序列化随机流。

## 存档演进

`src/persistence/save.ts` 是浏览器存档边界，使用 `StoragePort` 方便替换为其他存储。它校验结构、牌区唯一性、内容引用、合法阶段、环境快照、奖励与种群历史。

首版使用 `SAVE_VERSION = 1` 与内容包版本双重检查。只要卡牌数值、ID、环境、随机消费顺序或规则语义发生不兼容变化，就提高内容版本；改变状态形状时同时提高存档版本并更新 schema。

目前对旧版本友好拒绝，不隐式迁移。需要兼容旧进度时，应增加明确的迁移函数与旧存档夹具，而不是直接放松版本或结构校验。

## 测试与调参

`tests/helpers.ts` 中的两种策略会枚举五张可见手牌的合法组合，并偏好不同构筑。它们用于固定种子回归，不是玩家 AI 或自动获胜保证。

调整数值后运行 `npm test`，检查至少两种构筑、忽视压力导致灭绝、不同温度下的适应代价，以及完整单局逐步保存恢复。运行 `npm run build` 和 `npm run format:check` 后，在浏览器检查选择／取消、固化、突变、续玩及窄屏布局。

首版独立于框架的规则层可继续承载地图或多物种系统；当前无需预先引入复杂事件总线、插件加载器或完整生态模拟。
