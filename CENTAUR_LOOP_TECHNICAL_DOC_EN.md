# Centaur Loop Technical Design

English | [简体中文](./CENTAUR_LOOP_TECHNICAL_DOC.md)

> Version: v0.2.0  
> Last updated: 2026-05-09  
> Project path: `centaur-loop-engine/`

---

## 1. Design Philosophy: Why a Loop Is Needed

Most AI products still operate as one-shot conversations: the user gives an instruction, the AI returns an answer, and the interaction ends. This model has three structural problems:

- The AI does not know whether the previous result worked.
- Users repeatedly describe needs from scratch, with little accumulation.
- Production becomes manual assembly: AI generates, humans publish, data is ignored, and lessons are not retained.

Centaur Loop borrows the "centaur" idea from chess: human judgment plus AI execution. The core formula is:

```text
AI runs automatically -> pauses at human gates -> notifies across channels
-> human acts -> AI continues -> review -> memory -> next cycle
```

This is not a linear pipeline. It is a self-improving loop. Each cycle leaves behind reviewed experience that can improve the next cycle.

## 2. State Machine: One Complete Cycle

The current runtime uses a nine-stage state machine, represented by `LoopStage` in `src/core/types.ts`.

```text
planning
  -> awaiting_plan_review
  -> generating
  -> awaiting_review
  -> awaiting_publish
  -> awaiting_feedback
  -> reviewing_auto
  -> awaiting_memory
  -> cycle_complete
```

| Stage | Actor | Key action | Output |
| --- | --- | --- | --- |
| `planning` | AI | Calls `loopPlanner.ts` using the goal, memory, suggestions, and business context | `LoopCyclePlan` + `LoopTask[]` |
| `awaiting_plan_review` | Human | Confirms or modifies the plan | Human decision |
| `generating` | AI | Calls `loopExecutor.ts` for each task | `LoopTaskDraft` |
| `awaiting_review` | Human | Reviews drafts and approves or rejects them | Task confirmations |
| `awaiting_publish` | Human | Publishes approved content manually | Publish status |
| `awaiting_feedback` | Human | Provides metrics, notes, or screenshots | `ContentFeedback` |
| `reviewing_auto` | AI | Calls `loopReviewer.ts` to analyze outcomes | `LoopCycleReview` + `MemoryCandidate[]` |
| `awaiting_memory` | Human | Confirms which lessons should become long-term memory | Confirmed memory |
| `cycle_complete` | Runtime | Ends the cycle and carries suggestions forward | `nextSuggestion` |

## 3. Core Architecture

```text
centaur-loop-engine/src/
├── core/
│   ├── types.ts
│   ├── loopEngine.ts
│   ├── loopPlanner.ts
│   ├── loopExecutor.ts
│   ├── loopReviewer.ts
│   ├── loopNotifier.ts
│   ├── feedbackCollector.ts
│   ├── loopStore.ts
│   └── loopConfigs/
├── protocol/
│   ├── types.ts
│   └── loopChat.ts
├── adapters/
│   ├── ai-client.ts
│   ├── tool-registry.ts
│   └── memory.ts
└── ui/
```

### `loopEngine.ts`: State Machine Runtime

`advanceLoop(cycleId, context)` is the central runtime function. It reads the current cycle stage, executes the corresponding behavior, updates the stage, and either continues automatically or stops at a human gate.

Key decisions:

- Use an explicit `switch` state machine rather than a general event bus. The loop order is fixed, so a direct state machine is easier to inspect and debug.
- Attach human checkpoints whenever the cycle enters an `awaiting_*` stage.
- Use `loopNotifier` to trigger configured notification channels and reminders.

### `loopPlanner.ts`: Planner

The planner turns an owner goal into a structured plan and task list. It combines:

```text
system role + loop definition + available tools + owner goal
+ owner preferences + business context + memories + previous suggestion
-> model output -> JSON -> plan + tasks
```

It reads the tool registry, exposes tool input schemas to the model, and validates normalized tasks.

### `loopExecutor.ts`: Executor

The executor turns each task into a usable draft. If a task references a registered tool, the tool's `outputInstruction` guides generation. Failures are written into the draft rather than terminating the entire cycle, so the human can review and decide what to do next.

### `loopReviewer.ts`: Reviewer

The reviewer analyzes outputs and feedback after a cycle. It produces:

- `LoopCycleReview`: summary, effective points, ineffective points, and data highlights.
- `MemoryCandidate[]`: proposed long-term lessons categorized as preference, fact, lesson, or correction.
- `nextSuggestion`: planning guidance for the next cycle.

This is the main source of loop improvement.

### `loopNotifier.ts`: Human Gate Notifications

Notification channels:

| Channel | Meaning |
| --- | --- |
| `spirit_bubble` | Desktop bubble notification |
| `badge` | Home badge count |
| `home_card` | Home-page pending task card |
| `chat_followup` | Follow-up message in chat |

Each `HumanGateConfig` controls reminder delay, maximum reminders, and timeout behavior.

### `feedbackCollector.ts`: Feedback Collection

Supported feedback methods:

- `quick_form`: user fills in metrics such as views, likes, comments, and rating.
- `screenshot_ocr`: user uploads a screenshot and the system extracts platform metrics.

The goal is to lower the cost of feeding real-world results back into the loop.

### `loopStore.ts`: State Management

The prototype uses Zustand with persistence. Main state:

- `loops`: registered loop configurations.
- `cycles`: all cycle instances.
- `activeCycleIds`: active cycle per loop config.
- `pendingCheckpointCount`: global pending human checkpoint count.
- `homeCardCheckpoints`: checkpoints shown on the home page.

## 4. Human Gate Mechanism

Human gates are a core design element. The principle is simple: AI should run where it can, and stop only where human judgment is required.

```ts
interface HumanGateConfig {
  id: string;
  stage: LoopStage;
  name: string;
  description: string;
  required: boolean;
  timeoutAction: 'remind' | 'skip' | 'pause';
  remindAfterMinutes: number;
  maxReminders: number;
  notifyChannels: NotifyChannel[];
}
```

Runtime checkpoints are represented by `HumanCheckpoint`. They track status, reminders, timestamps, and optional task or memory references.

| Type | Trigger | Human action | Usually required |
| --- | --- | --- | --- |
| `plan_review` | After planning | Confirm or modify plan | Yes |
| `draft_review` | After draft generation | Approve or reject drafts | Yes |
| `publish` | After approval | Publish manually | Yes |
| `feedback` | After publishing | Submit metrics or screenshots | Optional in some loops |
| `confirm_memory` | After review | Confirm useful lessons | Optional |

## 5. Loop Protocol

The interaction model is chat-first. The protocol layer translates both directions:

```text
Loop Engine state -> chat messages and cards
Human text/clicks -> structured UserAction
```

AI-to-human message types include:

- `text`
- `plan_card`
- `draft_card`
- `publish_card`
- `feedback_request`
- `review_card`
- `memory_card`
- `progress`
- `cycle_complete`
- `quick_actions`

Human-to-AI actions include:

- `confirm`
- `reject`
- `approve_all`
- `skip`
- `mark_published`
- `submit_feedback`
- `start_loop`
- `free_text`

`LoopChatController` connects the store, state machine, intent parser, and UI message stream.

## 6. Memory Evolution

Memory is how the loop improves across cycles.

```text
Cycle N review
  -> MemoryCandidate[]
  -> human confirmation
  -> memory adapter
  -> consumed by cycle N+1 planning, execution, and review
```

Memory categories:

| Category | Meaning | Example |
| --- | --- | --- |
| `preference` | Owner preference | "Use a professional tone, avoid clickbait." |
| `fact` | Business fact | "The audience is mostly 25-35 year-old technical workers." |
| `lesson` | Performance lesson | "Posts with data comparisons perform better." |
| `correction` | Correction record | "Do not use this phrase in titles." |

The planner, executor, and reviewer all consume relevant memories through `searchAgentMemory(employeeId, goal, limit)`.

## 7. Loop Configuration Templates

Each loop config describes ownership, trigger, available AI tools, human gates, feedback methods, memory categories, and cycle period.

Implemented templates:

### SEO/GEO Growth Loop

- Weekly cycle.
- AI recommends a weekly growth plan.
- Tools: WeChat article, Xiaohongshu note, SEO long article, GEO optimization.
- Human gates: plan review, draft review, publishing, feedback, memory confirmation.

### Short-Video Production Loop

- Daily cycle.
- AI recommends today's topic.
- Tool: short-video script generator.
- Human gates: topic confirmation, script confirmation, shoot/publish, feedback, memory confirmation.
- Supports the fast-loop / slow-loop idea through `hasFastLoop` and `hasSlowLoop`.

## 8. AI Tool Registry

The tool registry is a catalog of content-generation templates rather than function-calling tools.

```ts
interface AIToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  inputSchema: AIToolInputField[];
  outputInstruction: string;
}
```

Current tools:

- WeChat article generator
- Xiaohongshu note generator
- SEO article writer
- Short-video script generator
- GEO content optimizer

The planner reads tool definitions and lets the model choose tools and input parameters for the cycle tasks.

## 9. Data Model

```text
CentaurLoopConfig
  -> LoopCycle
     -> LoopCyclePlan
     -> LoopTask[]
        -> LoopTaskDraft
        -> LoopTaskConfirmation
        -> LoopTaskPublish
        -> ContentFeedback
     -> LoopCycleReview
     -> MemoryCandidate[]
     -> HumanCheckpoint[]
     -> nextSuggestion
```

## 10. Fast and Slow Loops

The short-video loop introduces two rhythms:

- **Fast loop**: daily execution around a single video.
- **Slow loop**: weekly strategy review across multiple fast loops.

Fast-loop memory feeds slow-loop strategy, and slow-loop strategy guides future fast-loop topics. The current implementation includes flags for this design; full orchestration is planned.

## 11. Hub OS Integration Points

The prototype was designed to integrate with Hub OS through:

- `employeeId` for digital employee ownership.
- Bubble notifications for human gates.
- `ai-client.ts` for model calls.
- `memory.ts` for memory storage.
- pending checkpoint counts and home cards.
- business context injection.
- workspace UI components.

## 12. Technology Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript |
| UI | React 18 |
| State | Zustand + persist |
| Build | Vite |
| Styling | Tailwind CSS |
| Model access | Adapter-based AI client |
| Persistence | localStorage now, vector memory later |

## 13. Roadmap

- Regenerate drafts immediately after rejection.
- Implement full fast-loop / slow-loop orchestration.
- Move memory from localStorage to vector storage.
- Add publishing adapters for more channels.
- Improve screenshot OCR with multimodal models.
- Add A/B testing loops.
- Support selective memory sharing across loops.
- Deepen Hub OS integration.

