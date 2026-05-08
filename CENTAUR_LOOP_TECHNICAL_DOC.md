# Centaur Loop（半人马闭环）技术设计说明

[English](./CENTAUR_LOOP_TECHNICAL_DOC_EN.md) | 简体中文

> 版本：v0.2.0  
> 最后更新：2026-05-09  
> 项目位置：`centaur-loop-engine/`

---

## 一、设计哲学：为什么需要"闭环"

### 1.1 问题根源

绝大多数 AI 产品停留在「一问一答」的模式：用户给指令 → AI 返回结果 → 交互结束。这种模式有三个致命缺陷：

- AI 不知道上次做的好不好，无法自我进化。
- 用户需要反复从零描述需求，没有累积效应。
- 内容生产变成了"手动拼盘"——AI 生成、人去发布、数据没人看、经验没人记。

### 1.2 半人马闭环的核心思想

Centaur Loop 的设计哲学来自国际象棋中的「半人马」概念——人类的判断力 + AI 的执行力，合体后超越任何一方。

核心公式：

```
AI 自动跑 → 卡在人的节点 → 多渠道提醒 → 人处理 → AI 继续跑 → 复盘 → 记忆 → 循环
```

这不是一个线性流水线，而是一个**螺旋上升的闭环**。每跑一轮，AI 的记忆库就多一层经验沉淀，下一轮的规划就更精准。这就是半人马的进化飞轮。

### 1.3 与传统工作流引擎的区别

| 维度 | 传统工作流 | Centaur Loop |
|------|-----------|--------------|
| 核心抽象 | 节点 + 连线（DAG） | 状态机 + 人工卡点 + 记忆 |
| 人的角色 | 被动审批者 | 有决策权的"上半身" |
| AI 的角色 | 执行节点之一 | 驱动整个循环的引擎 |
| 进化能力 | 无 | 每轮复盘产生记忆，影响下一轮 |
| 交互形态 | 表单 + 看板 | 对话驱动（Chat-First） |

---

## 二、状态机：一轮循环的完整生命周期

Centaur Loop 的核心是一个**九阶段状态机**，定义在 `src/core/types.ts` 的 `LoopStage` 类型中。

### 2.1 状态流转图

```
                    ┌──────────────────────────────────────────────────┐
                    │                                                  │
                    ▼                                                  │
              ┌──────────┐                                             │
              │ planning │ ← AI 调用规划器生成计划                      │
              └────┬─────┘                                             │
                   │                                                   │
                   ▼                                                   │
        ┌──────────────────────┐                                       │
        │ awaiting_plan_review │ ← 🧑 人工卡点：确认计划                │
        └──────────┬───────────┘                                       │
                   │ 人确认                                             │
                   ▼                                                   │
            ┌────────────┐                                             │
            │ generating │ ← AI 逐任务调用执行器生成草稿                │
            └─────┬──────┘                                             │
                  │                                                    │
                  ▼                                                    │
        ┌─────────────────┐                                            │
        │ awaiting_review │ ← 🧑 人工卡点：逐篇审核草稿                │
        └────────┬────────┘                                            │
                 │ 全部审完                                             │
                 ▼                                                     │
       ┌───────────────────┐                                           │
       │ awaiting_publish  │ ← 🧑 人工卡点：手动发布到平台              │
       └────────┬──────────┘                                           │
                │ 标记已发布                                            │
                ▼                                                      │
      ┌────────────────────┐                                           │
      │ awaiting_feedback  │ ← 🧑 人工卡点：回传数据/截图               │
      └────────┬───────────┘                                           │
               │ 提交反馈                                               │
               ▼                                                       │
        ┌───────────────┐                                              │
        │ reviewing_auto│ ← AI 自动复盘，提炼经验记忆                   │
        └───────┬───────┘                                              │
                │                                                      │
                ▼                                                      │
       ┌─────────────────┐                                             │
       │ awaiting_memory │ ← 🧑 人工卡点：确认是否沉淀经验              │
       └────────┬────────┘                                             │
                │                                                      │
                ▼                                                      │
        ┌────────────────┐       下一轮（携带记忆+复盘建议）             │
        │ cycle_complete │ ─────────────────────────────────────────────┘
        └────────────────┘
```

### 2.2 各阶段详解

| 阶段 | 执行者 | 关键动作 | 产出 |
|------|--------|----------|------|
| `planning` | AI | 调用 `loopPlanner.ts`，结合记忆、上轮建议、企业资料生成计划 | `LoopCyclePlan` + `LoopTask[]` |
| `awaiting_plan_review` | 人 | 确认/修改计划 | 人工确认 |
| `generating` | AI | 逐任务调用 `loopExecutor.ts`，调用大模型生成内容草稿 | 每个任务的 `LoopTaskDraft` |
| `awaiting_review` | 人 | 逐篇审核草稿，可通过/退回 | 每篇标记 `confirmed` 或 `rejected` |
| `awaiting_publish` | 人 | 将确认的内容复制到小红书/公众号等平台发布 | 标记 `published` |
| `awaiting_feedback` | 人 | 截图或填写平台数据（阅读量、点赞、评论等） | `ContentFeedback` |
| `reviewing_auto` | AI | 调用 `loopReviewer.ts`，分析数据，提炼经验，给出下一轮建议 | `LoopCycleReview` + `MemoryCandidate[]` |
| `awaiting_memory` | 人 | 确认哪些经验值得长期记住 | 确认的记忆写入存储 |
| `cycle_complete` | — | 本轮结束，等待用户启动下一轮 | `nextSuggestion` 传递给下轮 |

---

## 三、核心模块架构

```
centaur-loop-engine/src/
├── core/                         # 闭环核心逻辑
│   ├── types.ts                  # 全部类型定义（状态机、任务、反馈、记忆等）
│   ├── loopEngine.ts             # 状态机主控：advanceLoop() 驱动整个循环
│   ├── loopPlanner.ts            # 规划器：目标→计划+任务列表
│   ├── loopExecutor.ts           # 执行器：任务→内容草稿
│   ├── loopReviewer.ts           # 复盘器：任务结果+反馈→经验+建议
│   ├── loopNotifier.ts           # 提醒系统：人工卡点的多渠道通知
│   ├── feedbackCollector.ts      # 反馈采集：表单输入、截图OCR
│   ├── loopStore.ts              # Zustand 状态管理（持久化）
│   └── loopConfigs/              # 业务闭环模板
│       ├── seoGrowthLoop.ts      # SEO/GEO 增长闭环配置
│       └── index.ts              # 配置导出
├── protocol/                     # 对话协议层
│   ├── types.ts                  # 消息类型、用户动作类型
│   └── loopChat.ts               # 对话控制器（状态→消息翻译、意图解析）
├── adapters/                     # 外部适配层
│   ├── ai-client.ts              # 大模型调用封装
│   ├── tool-registry.ts          # AI 工具注册表（内容生成工具目录）
│   └── memory.ts                 # 记忆存储适配
└── ui/                           # 前端展示组件
    ├── LoopChatView.tsx           # 对话主界面
    ├── LoopDraftCard.tsx          # 草稿卡片
    ├── LoopFeedbackPanel.tsx      # 反馈面板
    ├── LoopWorkspaceConsole.tsx   # 工作区控制台
    └── ...
```

### 3.1 loopEngine.ts — 状态机主控

这是整个闭环的"心脏"。核心函数 `advanceLoop(cycleId, context)` 通过 `switch(cycle.stage)` 决定下一步做什么。

工作原理：

- 每次被调用时，读取当前 cycle 的 stage。
- 根据 stage 执行对应逻辑（调规划器 / 调执行器 / 创建人工卡点 / 调复盘器）。
- 完成后更新 stage 到下一个阶段。
- 如果下一阶段是 AI 阶段，递归调用自身继续推进。
- 如果下一阶段是人工卡点，停下来等待。

关键设计决策：

- **不用事件驱动**，用显式的 `switch-case` 状态机。理由是闭环阶段是固定顺序的，不需要事件总线的灵活性，switch-case 更容易调试和理解。
- **每个人工卡点自动挂载提醒**。一旦进入 `awaiting_*` 阶段，引擎会创建 `HumanCheckpoint`，通过 `loopNotifier` 按配置的延迟时间和最大次数发送提醒。

### 3.2 loopPlanner.ts — 规划器

职责：拿到老板的目标（goal），结合历史记忆、上轮建议和企业资料，输出一份结构化的内容计划。

输入拼装逻辑：

```
系统角色 + 闭环定义 + 可用工具清单 + 老板目标
+ 老板偏好 + 企业资料 + 已有记忆 + 上轮建议
→ 大模型 → JSON
→ 解析出 plan + tasks
```

关键点：

- 规划器会查阅 `tool-registry` 中的工具目录，把每个工具的输入字段告诉大模型，让模型决定用哪些工具、传什么参数。
- 输出的 tasks 会经过 `normalizeTasks()` 校验，确保 `artifactType` 合法、`inputParams` 的字段名与工具的 `inputSchema` 匹配。
- 上轮的 `nextSuggestion` 会作为上下文传入，实现跨轮进化。

### 3.3 loopExecutor.ts — 执行器

职责：逐任务调用大模型，生成可直接使用的内容草稿。

- 如果任务关联了注册工具（如"写公众号文章"），会使用该工具的 `outputInstruction` 作为生成要求。
- 输出 `LoopTaskDraft`，包含 title、content、preview。
- 生成失败不会中断整个循环，而是把错误信息写入 draft，让老板在审核时看到并决定是否重试。

### 3.4 loopReviewer.ts — 复盘器

职责：一轮结束后，分析所有任务的产出和反馈数据，输出复盘报告。

输出三样东西：

- `LoopCycleReview`：包含 summary（总结）、effectivePoints（有效）、ineffectivePoints（待改进）、dataHighlights（数据亮点）。
- `MemoryCandidate[]`：AI 从本轮经验中提炼出的记忆候选项，每条标注 category（preference/fact/lesson/correction）。
- `nextSuggestion`：对下一轮的建议，会传递给下轮的 `loopPlanner`。

这是闭环进化能力的核心来源。

### 3.5 loopNotifier.ts — 提醒系统

管理人工卡点的通知和超时提醒。

通知渠道（`NotifyChannel`）：

| 渠道 | 说明 |
|------|------|
| `spirit_bubble` | 精灵气泡弹出提醒（Hub OS 桌面端） |
| `badge` | 角标数字（首页待办数） |
| `home_card` | 首页卡片展示待办 |
| `chat_followup` | 在对话中追加提醒消息 |

超时策略由 `HumanGateConfig` 配置：

- `remindAfterMinutes`：多久后第一次提醒。
- `maxReminders`：最多提醒几次。
- `timeoutAction`：超时后是 `remind`（继续提醒）、`skip`（跳过）还是 `pause`（暂停循环）。

### 3.6 feedbackCollector.ts — 反馈采集器

支持两种数据回传方式：

- **quick_form**：用户直接填写数据（阅读量、点赞、评论等），生成 `ContentFeedback`。
- **screenshot_ocr**：用户截图平台数据页面，AI 识别平台类型和数字指标，自动解析为结构化数据。

这两种方式都是为了降低"喂数据"的门槛——老板不需要导出 CSV，截个图或者说句话就行。

### 3.7 loopStore.ts — 状态管理

基于 Zustand + persist 中间件，核心数据结构：

- `loops`：已注册的闭环配置（`Record<id, CentaurLoopConfig>`）。
- `cycles`：所有循环实例（`Record<id, LoopCycle>`）。
- `activeCycleIds`：每个闭环当前活跃的 cycle（`Record<loopConfigId, cycleId>`）。
- `pendingCheckpointCount`：全局待办人工卡点数量（驱动首页角标）。
- `homeCardCheckpoints`：需要在首页展示的待办卡点列表。

状态持久化到 `localStorage`（键名 `centaur_loop_engine`），页面刷新后恢复。

---

## 四、人工卡点（Human Gate）机制

人工卡点是 Centaur Loop 的灵魂设计。它的核心原则是：**AI 能跑的自己跑，必须人决策的才停下来问。**

### 4.1 卡点配置（HumanGateConfig）

每个闭环模板可以配置多个人工卡点，定义在 `humanGates` 数组中：

```typescript
interface HumanGateConfig {
  id: string;                    // 卡点唯一标识
  stage: LoopStage;              // 关联的状态机阶段
  name: string;                  // 卡点名称
  description: string;           // 卡点说明
  required: boolean;             // 是否必须通过（false 表示可跳过）
  timeoutAction: 'remind' | 'skip' | 'pause';  // 超时策略
  remindAfterMinutes: number;    // 首次提醒延迟（分钟）
  maxReminders: number;          // 最大提醒次数
  notifyChannels: NotifyChannel[];  // 通知渠道
}
```

### 4.2 卡点运行时（HumanCheckpoint）

当循环进入人工卡点阶段时，引擎会创建一个 `HumanCheckpoint` 实例：

```typescript
interface HumanCheckpoint {
  id: string;
  cycleId: string;
  gateId: string;                // 关联的 HumanGateConfig
  type: HumanCheckpointType;     // plan_review | draft_review | publish | feedback | confirm_memory
  title: string;
  detail: string;
  status: 'waiting' | 'done' | 'skipped';
  createdAt: string;
  resolvedAt?: string;
  remindCount: number;           // 已提醒次数
  relatedTaskId?: string;        // 关联任务（如审核某篇草稿时）
  relatedMemoryId?: string;      // 关联记忆（如确认某条经验时）
}
```

### 4.3 五类人工卡点

| 类型 | 触发时机 | 人需要做什么 | 是否必须 |
|------|----------|-------------|----------|
| `plan_review` | 规划完成后 | 确认/修改内容计划 | 通常必须 |
| `draft_review` | 草稿生成后 | 逐篇审核，通过或退回 | 必须 |
| `publish` | 草稿确认后 | 手动复制到目标平台发布 | 必须 |
| `feedback` | 发布后（延迟几小时到几天） | 回传平台数据/截图 | 可跳过 |
| `confirm_memory` | 复盘后 | 确认经验是否值得长期记忆 | 可跳过 |

---

## 五、对话协议层（Loop Protocol）

Centaur Loop 的交互不是传统的表单+看板，而是**对话驱动**的。这由 `protocol/` 目录实现。

### 5.1 核心设计：双向翻译

```
┌──────────────────────┐          ┌──────────────────────┐
│   Loop Engine        │          │    对话 UI            │
│   （状态机推进）       │  ◄──►   │  （聊天气泡+卡片）     │
└──────────────────────┘          └──────────────────────┘
           ▲                                ▲
           │         Protocol 层            │
           │    ┌──────────────────┐        │
           └──► │  loopChat.ts     │ ◄──────┘
                │  翻译器+控制器    │
                └──────────────────┘
```

- **阶段→消息**：引擎推进到某个阶段后，`translateStage()` 把它翻译成对话消息（计划卡片、草稿卡片、复盘卡片等）。
- **文本→动作**：用户的文字输入通过 `parseUserIntent()` 解析为结构化的 `UserAction`。

### 5.2 消息类型（AI→人）

| 类型 | 说明 | 场景 |
|------|------|------|
| `text` | 纯文字 | 通用说明 |
| `plan_card` | 计划卡片（含任务列表、关键词、平台） | `awaiting_plan_review` 阶段 |
| `draft_card` | 草稿卡片（可折叠内容，含通过/退回按钮） | `awaiting_review` 阶段 |
| `publish_card` | 发布提示卡片（含复制按钮） | `awaiting_publish` 阶段 |
| `feedback_request` | 反馈请求（引导截图或填数据） | `awaiting_feedback` 阶段 |
| `review_card` | 复盘总结卡片 | `reviewing_auto` 完成后 |
| `memory_card` | 记忆确认卡片 | `awaiting_memory` 阶段 |
| `progress` | 进度更新 | AI 正在工作时 |
| `cycle_complete` | 本轮完成 | 循环结束时 |
| `quick_actions` | 快捷操作按钮组 | 需要快速选择时 |

### 5.3 用户动作（人→AI）

| 动作类型 | 解析方式 | 说明 |
|----------|----------|------|
| `confirm` | "行/好/确认/ok" | 确认计划、草稿或记忆 |
| `reject` | "不行/退回/重做/改一下" | 退回附带修改意见 |
| `approve_all` | "全部通过" | 批量确认所有草稿 |
| `skip` | "跳过/算了/下一步" | 跳过当前卡点 |
| `mark_published` | "已发布/发了" | 标记内容已发布 |
| `submit_feedback` | "800阅读56赞" | 提交数据反馈 |
| `start_loop` | 任意目标文本（无活跃循环时） | 启动新一轮循环 |
| `free_text` | 其他 | 自由文本，按修改意见处理 |

意图解析器 `parseUserIntent()` 通过正则模式匹配用户输入，结合当前阶段上下文判断意图。

### 5.4 对话控制器（LoopChatController）

`LoopChatController` 是连接引擎和 UI 的中间层，职责：

- 管理 `LoopChatSession`（消息列表、会话状态）。
- 用户输入 → `parseUserIntent()` → `handleAction()` → 更新 Store → `advanceLoop()` → `translateStage()` → 推送消息。
- 会话状态：`idle`（待命）→ `running`（AI 工作中）→ `waiting_human`（等人操作）→ `complete`（本轮完成）。

---

## 六、记忆进化系统

记忆系统是 Centaur Loop 的"长期大脑"，让闭环真正具备跨轮进化能力。

### 6.1 记忆流向

```
第 N 轮复盘
    │
    ▼
复盘器提炼 MemoryCandidate[]
    │
    ▼
人确认/拒绝
    │
    ▼ 确认的写入
记忆存储 (memory adapter)
    │
    ▼ 下一轮读取
第 N+1 轮规划器 / 执行器 / 复盘器
```

### 6.2 记忆分类

| 类别 | 说明 | 示例 |
|------|------|------|
| `preference` | 老板偏好 | "标题不要太标题党，偏专业风格" |
| `fact` | 业务事实 | "公众号粉丝主要是25-35岁的技术从业者" |
| `lesson` | 经验教训 | "带数据对比的文章阅读量普遍高30%" |
| `correction` | 纠偏记录 | "不要用'干货'这个词，老板觉得太俗" |

### 6.3 记忆的消费链路

记忆在三个模块中被使用：

- **规划器**：`planLoop()` 在拼装 prompt 时注入 `memories`，让 AI 在选题和平台选择时考虑历史经验。
- **执行器**：`executeTask()` 在生成内容时注入 `memories`，让 AI 在风格和措辞上遵循历史偏好。
- **复盘器**：`reviewCycle()` 在分析数据时注入 `memories`，让 AI 将新发现与旧经验对比。

每次使用时通过 `searchAgentMemory(employeeId, goal, limit)` 检索相关记忆，按内容相关性过滤。

---

## 七、闭环配置模板

Centaur Loop 的通用引擎需要具体的**业务配置**才能运行。每个配置定义了：谁来跑、怎么触发、AI 用什么工具、人在哪里卡、产出什么格式。

### 7.1 CentaurLoopConfig 结构

```typescript
interface CentaurLoopConfig {
  id: string;                     // 闭环唯一标识
  name: string;                   // 显示名称
  icon: string;                   // 图标
  description: string;            // 闭环说明
  employeeId: string;             // 归属数字员工
  trigger: LoopTrigger;           // 触发方式（手动/定时/AI建议）
  aiWorkPhases: AIWorkPhase[];    // AI 工作阶段及可用工具
  humanGates: HumanGateConfig[];  // 人工卡点配置
  artifactTypes: ArtifactType[];  // 可产出的内容类型
  feedbackMethods: FeedbackMethod[];  // 支持的反馈方式
  memoryCategories: string[];     // 记忆分类标签
  cyclePeriod: 'daily' | 'weekly' | 'biweekly';  // 循环周期
}
```

### 7.2 已实现的业务闭环

#### SEO/GEO 增长闭环（seoGrowthLoop.ts）

- 周期：每周一轮
- 触发：AI 每周一主动推荐本周增长计划
- AI 工具：写公众号文章、写小红书笔记、SEO 长文、GEO 内容优化
- 人工卡点：确认计划（1h 提醒）→ 审核草稿（2h 提醒）→ 手动发布（24h 提醒）→ 回传反馈（72h 提醒，可跳过）→ 确认记忆（1h 提醒，可跳过）
- 记忆类别：有效选题、标题模式、平台偏好、关键词进展、内容长度偏好

### 7.3 后续新增闭环的方式

1. 在 `src/core/loopConfigs/` 下创建新文件，导出 `CentaurLoopConfig` 对象。
2. 在 `src/core/loopConfigs/index.ts` 中导入并加入 `ALL_LOOP_CONFIGS` 数组。
3. 如果需要新的 AI 工具，在 `src/adapters/tool-registry.ts` 的 `TOOL_CATALOG` 中注册。
4. 启动应用后，`App.tsx` 会自动 `registerLoop()` 注册配置。

---

## 八、AI 工具注册表

闭环中 AI 能使用的"工具"定义在 `tool-registry.ts`。每个工具不是传统的 Function Calling，而是一个**内容生成模板**。

### 8.1 工具定义结构

```typescript
interface AIToolDefinition {
  id: string;                    // 工具唯一标识
  name: string;                  // 显示名称
  description: string;           // 功能说明
  icon: string;                  // 图标
  inputSchema: AIToolInputField[];  // 输入字段定义
  outputInstruction: string;     // 输出格式要求（注入大模型 prompt）
}
```

### 8.2 当前注册的工具

| 工具 | 输入 | 输出 |
|------|------|------|
| 写公众号文章 | 主题、关键词、语气 | 完整公众号文章（标题+正文+引导） |
| 写小红书笔记 | 主题、风格 | 小红书笔记（标题+正文+标签） |
| SEO 长文 | 目标关键词、大纲 | 2000字以上 SEO 优化文章 |
| GEO 内容优化 | 原始内容、目标问题 | 优化后内容（更易被 AI 引擎引用） |

### 8.3 工具与规划器的关系

规划器在生成计划时，会遍历当前闭环配置的 `aiWorkPhases[].appToolIds`，从 `TOOL_CATALOG` 中查找每个工具的完整定义（包括输入字段），拼装进 prompt 让大模型决定：用哪些工具、填什么参数。

---

## 九、数据模型关系

```
CentaurLoopConfig (闭环模板)
    │
    │ 1:N
    ▼
LoopCycle (循环实例)
    ├── plan: LoopCyclePlan          (1:1 本轮计划)
    ├── tasks: LoopTask[]            (1:N 任务列表)
    │       ├── draft: LoopTaskDraft          (1:1 草稿)
    │       ├── confirmation: LoopTaskConfirmation  (1:1 确认结果)
    │       ├── publish: LoopTaskPublish      (1:1 发布状态)
    │       └── feedback: ContentFeedback     (1:1 数据反馈)
    ├── review: LoopCycleReview      (1:1 复盘报告)
    ├── memoryCandidates: MemoryCandidate[]   (1:N 记忆候选)
    ├── checkpoints: HumanCheckpoint[]        (1:N 人工卡点实例)
    └── nextSuggestion: string       (传递给下一轮)
```

---

## 十、闭环模板扩展方向

当前 MVP 只保留内容增长闭环，用它验证 Centaur Loop 的核心价值：计划、人工卡点、发布标记、反馈、复盘、记忆确认和下一轮改进。后续可以在这个基础上增加更多业务闭环，例如线索跟进、客服质量、研究报告、产品反馈或多周期内容运营。

多周期编排仍是后续方向：例如把周级策略闭环和日级执行闭环连接起来，让执行闭环沉淀的数据进入策略复盘，再由策略复盘影响下一轮执行。

---

## 十一、与 Hub OS 的集成点

Centaur Loop Engine 作为独立模块，与 Hub OS 生态的集成点如下：

| 集成点 | 对接方式 | 说明 |
|--------|----------|------|
| 数字员工 | `employeeId` 字段 | 每个闭环归属一个数字员工（如 Spark） |
| 精灵气泡 | `pushBubble()` 回调 | 人工卡点提醒通过气泡弹出 |
| 大模型调用 | `ai-client.ts` 适配层 | 走 QeeClaw SDK → bridge_server → 云端模型 |
| 记忆存储 | `memory.ts` 适配层 | 当前用 localStorage，后续对接 QeeClaw 向量库 |
| 首页待办 | `pendingCheckpointCount` + `homeCardCheckpoints` | 驱动首页的待办角标和卡片展示 |
| 企业资料 | `businessContext` 参数 | 规划/执行/复盘时注入 BRAND.md 等企业上下文 |
| 工作台 | UI 组件 | 对话视图嵌入工作区右侧面板 |

---

## 十二、技术栈

| 层级 | 技术 |
|------|------|
| 语言 | TypeScript（严格模式） |
| 框架 | React 18 |
| 状态管理 | Zustand + persist |
| 构建 | Vite |
| 样式 | Tailwind CSS |
| 大模型 | 通过 QeeClaw SDK 调用（OpenAI / Claude / DeepSeek 等） |
| 持久化 | localStorage（当前）→ QeeClaw 向量库（规划） |

---

## 十三、后续演进方向

1. **退回重生成**：当前退回操作仅记录意见传递给下一轮，后续应支持即时重生成草稿。
2. **多周期编排器**：实现日级、周级或月级闭环之间的数据聚合和策略联动逻辑。
3. **记忆存储升级**：从 localStorage 迁移到 QeeClaw 向量数据库，支持语义检索。
4. **多渠道发布**：对接企微/钉钉/公众号 API，实现半自动或全自动发布。
5. **截图 OCR 增强**：接入多模态模型，提升平台数据截图的识别准确率。
6. **A/B 测试闭环**：支持同一选题生成多个版本，根据数据反馈自动择优。
7. **跨闭环记忆共享**：不同业务闭环的经验可选择性共享。
8. **Hub OS 深度集成**：员工卡片上直接展示闭环进度、首页驾驶舱汇总所有闭环数据。
