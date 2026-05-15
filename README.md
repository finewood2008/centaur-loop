# Centaur Loop / 半人马环

[![MIT License](https://img.shields.io/badge/license-MIT-111111.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![CI](https://github.com/finewood2008/centaur-loop/actions/workflows/ci.yml/badge.svg)](https://github.com/finewood2008/centaur-loop/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/finewood2008/centaur-loop/actions/workflows/pages.yml/badge.svg)](https://github.com/finewood2008/centaur-loop/actions/workflows/pages.yml)

English + 中文 | [简体中文](./README.zh-CN.md) | [Website](https://www.centaurloop.com) | [Technical Design](./CENTAUR_LOOP_TECHNICAL_DOC_EN.md) | [项目定位](./docs/PROJECT_POSITIONING.zh-CN.md)

**Centaur Loop Studio is the open-source workbench for human-governed AI feedback loops.**

**面向 AI Agent 反馈闭环的人类治理型开源工作台。**

Centaur Loop helps teams run AI agents as accountable operating cycles. Agents can plan and execute, but humans keep judgment authority at explicit gates; real-world feedback becomes reviewed memory for the next run.

半人马环关注 AI Agent 在真实业务中的反馈闭环：人类治理、人工卡点、效果反馈、复盘记忆，以及下一轮持续改进。

Related terms / 相关术语：AI Agent 反馈闭环、AI Agent 工作台、人机协作 Agent、Agent 记忆、AI 工作流治理、AI Agent 基础设施、LLMOps。

The current repository is the open-source core of **Centaur Loop Studio**. It is early, but the product direction is complete: a place to create loops, choose a runtime, approve plans, review outputs, capture feedback, confirm memory, and start the next cycle with context.

当前仓库是 **Centaur Loop Studio** 的开源核心。它还不是完整云产品，但已经展示了完整产品路径：创建闭环、选择 runtime、确认计划、审核产出、收集反馈、确认记忆，并带着历史经验进入下一轮。

```text
Plan -> Approve -> Execute -> Review -> Publish -> Feedback -> Reflect -> Remember -> Next Cycle
```

> Cron wakes agents up. Workflows move agents through steps. Centaur Loop helps agents improve after feedback comes back.

## Demo

![Centaur Loop content growth loop demo](./docs/assets/centaur-loop-demo.gif)

This demo shows the current MVP running a full content growth loop: AI planning, human gates, draft review, manual publish marking, sample feedback, retrospective review, memory confirmation, and a completed cycle with confirmed memory ready for the next run.

The flagship demo is **Content Growth Loop**. It is not the whole product; it is the first concrete loop used to prove the Studio pattern end to end.

旗舰 demo 是 **内容增长闭环**。它不是产品的全部，而是第一个用于证明 Studio 模式的真实场景。

## Product Shape

Centaur Loop is best understood as three layers:

| Layer | Status | Role |
| --- | --- | --- |
| **Centaur Loop Studio** | Product direction | The full workbench for designing, driving, and observing AI feedback loops. |
| **Open-source Workbench** | Current repo | The working local app, loop state machine, runtime connector layer, human gates, feedback, and memory flow. |
| **Content Growth Loop** | Flagship demo | The first end-to-end loop that proves planning, review, publishing, feedback, retrospective memory, and next-cycle improvement. |

中文说明：Centaur Loop 现在不是一个完整 SaaS，但它已经不是散装 demo。这个 repo 是完整产品方向的开源核心，Content Growth Loop 是第一个旗舰场景。

## Why It Matters

Most agent systems optimize the moment before output: prompting, tool use, scheduling, orchestration. The hard product problem often starts after output leaves the chat window: Was it approved? Was it published? Did it work? What should the agent remember next time?

Centaur Loop makes that whole cycle the product surface: stage state, human gates, feedback capture, retrospective review, memory candidates, and next-cycle suggestions.

中文说明：很多 Agent 系统只处理“生成之前”的问题，Centaur Loop 更关心生成之后的业务闭环：谁来确认，真实效果如何，哪些经验应该进入记忆，下一轮如何变得更好。

## What It Is

- A chat-first Studio experience for designing and driving AI feedback loops.
- A TypeScript state machine for explicit loop stages and human checkpoints.
- A local runtime connector layer for OpenAI-compatible models, Ollama, LM Studio, vLLM, and llama.cpp.
- A demoable content growth loop that proves planning, draft review, publishing, feedback, review, memory, and improvement.
- A design reference for building human-governed AI products.

中文说明：它是一个 AI Agent 反馈闭环工作台，把计划、人工确认、执行、反馈、复盘、记忆和下一轮建议放在同一个可观察界面里。

## What It Is Not

- Not a cron scheduler.
- Not a generic workflow canvas.
- Not a publishing bot.
- Not a replacement for LangGraph, Temporal, Inngest, n8n, Mastra, or agent frameworks.

Existing runtimes execute tasks. Centaur Loop governs the feedback loop around those tasks.

中文说明：执行层可以继续使用 LangGraph、Temporal、Inngest、n8n 或其他 agent runtime；Centaur Loop 负责治理任务周围的人类判断、结果反馈和记忆沉淀。

## MVP Experience

The current MVP includes three built-in loop templates:

当前 MVP 包含三个内置闭环模板：

| Loop | Cycle | Description |
| --- | --- | --- |
| **SEO/GEO Content Growth** | Weekly | Grow search and AI-answer visibility through planned content, feedback, review, and memory. |
| **Customer Support Quality** | Daily | Improve support quality through AI-assisted replies, human review, satisfaction feedback, and experience memory. |
| **Product Iteration** | Biweekly | Extract requirements from user feedback, generate iteration plans, track launch outcomes, and build product memory. |

1. Start with a weekly growth goal.
2. AI proposes a structured plan.
3. Human approves or changes the plan.
4. AI generates reviewable drafts.
5. Human approves drafts and marks publishing.
6. Human submits outcome feedback.
7. AI reviews results and proposes memory candidates.
8. Human confirms which lessons become memory.
9. The next cycle starts with prior memory in context.

## Studio Workflow

The intended product workflow is:

1. **Create loop**: define a goal, scenario, and human checkpoints.
2. **Choose runtime**: use demo mode, OpenAI-compatible APIs, or local runtimes.
3. **Approve plan**: keep judgment authority at the right gates.
4. **Review output**: inspect drafts or task results before publishing or acting.
5. **Add feedback**: capture metrics, notes, screenshots, and outcome signals.
6. **Save memory**: confirm which lessons become reusable context.
7. **Run next cycle**: start again with reviewed memory and next-cycle suggestions.

中文说明：完整产品体验不是“点一下生成内容”，而是驾驶一个可治理的 Agent 闭环，从目标到反馈再到记忆和下一轮改进。

## Core Lifecycle

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

## Architecture

| Layer | Role |
| --- | --- |
| `src/core/loopEngine.ts` | Explicit state machine that advances cycles and stops at human gates. |
| `src/core/loopPlanner.ts` | Turns goals, memory, business context, and tools into structured plans. |
| `src/core/loopExecutor.ts` | Generates reviewable drafts and keeps failures inside the cycle record. |
| `src/core/loopReviewer.ts` | Converts feedback into retrospectives, lessons, and next-cycle suggestions. |
| `src/protocol/loopChat.ts` | Maps runtime state to chat messages, cards, and user actions. |
| `src/adapters/*` | Runtime, tool, feedback, and memory boundaries. |
| `src/ui/*` | Chat-first workbench, embedded action cards, runtime dropdown, feedback and memory surfaces. |

## Runtime Connectors

Centaur Loop runs without an API key through the deterministic demo runtime. For real models, the browser only calls the local Vite proxy; API keys never enter the frontend bundle.

Supported runtime paths today:

- `local-demo`: built-in deterministic demo runtime.
- `openai-compatible-env`: any OpenAI-compatible `/chat/completions` endpoint configured through environment variables.
- `ollama-local`: detected through `127.0.0.1:11434/api/tags` and called through `/api/chat`.
- `lm-studio-local`: detected through `127.0.0.1:1234/v1/models`.
- `vllm-local`: detected through `127.0.0.1:8000/v1/models`.
- `llamacpp-local`: detected through `127.0.0.1:8080/v1/models`.

Planned adapter examples are shown for LangGraph, Temporal, and n8n-style approval flows.

## Quick Start

```bash
npm install
npm run dev
```

Open the Vite URL printed in your terminal. The app works immediately with the demo runtime.

## Real Model Setup

Create `.env.local`:

```bash
cp .env.example .env.local
```

Configure an OpenAI-compatible endpoint:

```bash
CENTAUR_MODEL_BASE_URL=https://api.openai.com/v1
CENTAUR_MODEL_API_KEY=your_key_here
CENTAUR_MODEL_NAME=gpt-4o-mini
```

Then restart the dev server and select the runtime from the floating runtime menu.

## Development

```bash
npm run typecheck
npm run build
```

## Roadmap

- **Open-source Workbench**: refine the local Studio experience, loop cards, runtime selector, feedback forms, and memory panels.
- **Core package**: extract `@centaur-loop/core` from the demo workbench.
- **Adapter ecosystem**: add storage, notifier, model, memory, LangGraph, Mastra, Inngest, Temporal, and n8n-style adapters.
- **Team workspace**: add persistent projects, shared loop history, team review, and organization memory.
- **Centaur Loop Cloud**: hosted runtime management, durable execution, observability, loop analytics, and managed memory.
- **Memory layer**: semantic relevance scoring, tags, expiry, and access-frequency ranking beyond the current local prototype.

## Project Status

Centaur Loop is early. The current codebase is a working MVP and product design reference, not a stable library API yet. The goal is to make the feedback layer around agent work concrete, inspectable, and easy to extend while pointing toward a full Studio and Cloud product.

中文说明：当前版本是可运行的开源工作台 MVP；长期方向是 AI Agent 反馈闭环的 Studio、控制台和治理层。

## Contributing

Focused issues and small PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) before opening larger design changes.

## License

MIT
