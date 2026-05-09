# Centaur Loop / 半人马环

[![MIT License](https://img.shields.io/badge/license-MIT-111111.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![CI](https://github.com/finewood2008/centaur-loop/actions/workflows/ci.yml/badge.svg)](https://github.com/finewood2008/centaur-loop/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/finewood2008/centaur-loop/actions/workflows/pages.yml/badge.svg)](https://github.com/finewood2008/centaur-loop/actions/workflows/pages.yml)

[English](./README.md) | 简体中文 | [官网](https://www.centaurloop.com) | [技术设计](./CENTAUR_LOOP_TECHNICAL_DOC.md) | [项目定位](./docs/PROJECT_POSITIONING.zh-CN.md)

**面向人类治理型 AI 反馈闭环的开源工作台。**

Centaur Loop 帮助团队把 AI Agent 运行在可治理的业务循环里：Agent 可以规划和执行，但人类在关键节点保留判断权；真实世界反馈会被复盘，并在人工确认后成为下一轮可用的记忆。

半人马环关注 AI Agent 反馈闭环、人机协作 Agent、Agent 记忆、AI 工作流治理和 LLMOps。它希望让 Agent 不只是被定时唤醒或按 workflow 执行，而是在真实反馈回来之后持续进化。

```text
规划 -> 确认 -> 执行 -> 审核 -> 发布 -> 反馈 -> 复盘 -> 记忆 -> 下一轮
```

> Cron 让 Agent 醒来。Workflow 让 Agent 按步骤执行。Centaur Loop 让 Agent 在真实反馈回来之后持续进化。

## Demo

![Centaur Loop 内容增长闭环演示](./docs/assets/centaur-loop-demo.gif)

这个 demo 展示了当前 MVP 的完整内容增长闭环：AI 规划、人工卡点、草稿审核、手动标记发布、样例反馈、复盘、记忆确认，以及完成后可用于下一轮的已确认记忆。

## 项目定位

Centaur Loop / 半人马环不是一个普通的 AI chat agent，也不是又一个 workflow builder。它是一个用于设计、驾驶和观察 AI Agent 反馈闭环的开源工作台：现有 runtime 负责任务执行，Centaur Loop 负责治理执行之后发生的事情，包括人工卡点、反馈采集、复盘、记忆确认和下一轮改进。

相关术语：AI Agent 反馈闭环、AI Agent 工作台、人机协作 Agent、Agent 记忆、AI 工作流治理、AI Agent 基础设施、LLMOps。

## 为什么投资人 / AI 创业者应该关注

AI Agent 真正进入企业场景后，难点不只是“会不会调用工具”，而是工作结果如何被人审核、如何收集真实反馈、如何把经验沉淀为可控记忆，以及下一轮如何变得更好。Centaur Loop 把这些环节做成可见、可审计、可扩展的产品界面。

这意味着它更接近 Agent 时代的治理层和操作系统层：上接 LangGraph、Temporal、Inngest、n8n、Mastra 等执行 runtime，下接内容增长、销售跟进、客户反馈、研究分析等业务闭环。当前 MVP 先用内容增长闭环证明产品形态，后续可以扩展为更多 AI Agent 工作场景的 feedback loop workbench。

## 为什么需要它

很多 Agent 系统优化的是输出之前的部分：提示词、工具调用、调度、编排。但真正难的产品问题通常发生在输出离开聊天窗口之后：是否被审核？是否被发布？效果如何？下一轮应该记住什么？

Centaur Loop 把这整个循环变成产品界面：阶段状态、人工卡点、反馈采集、复盘、记忆候选和下一轮建议。

## 它是什么

- 一个 chat-first 的 React 工作台，可以端到端驾驶 AI 反馈闭环。
- 一个 TypeScript 状态机，用于表达明确的循环阶段和人工 checkpoint。
- 一个本地 runtime connector 层，支持 OpenAI-compatible 模型、Ollama、LM Studio、vLLM、llama.cpp。
- 一个可直接演示的内容增长闭环，用来证明规划、草稿审核、发布、反馈、复盘、记忆和改进。
- 一个用于构建人类治理型 AI 产品的设计参考。

## 它不是什么

- 不是 cron 定时任务系统。
- 不是通用 workflow 画布。
- 不是发布机器人。
- 不是 LangGraph、Temporal、Inngest、n8n、Mastra 或 Agent 框架的替代品。

现有 runtime 负责任务执行。Centaur Loop 负责治理任务周围的反馈闭环。

## MVP 体验

当前 MVP 聚焦一个场景：**内容增长闭环**。

1. 输入本周增长目标。
2. AI 提出结构化计划。
3. 人类确认或调整计划。
4. AI 生成可审核草稿。
5. 人类审核草稿并标记发布。
6. 人类提交真实效果反馈。
7. AI 复盘结果并提出记忆候选。
8. 人类确认哪些经验进入长期记忆。
9. 下一轮带着历史记忆继续运行。

## 核心生命周期

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

## 架构

| 层级 | 作用 |
| --- | --- |
| `src/core/loopEngine.ts` | 显式状态机，推进循环并停在人工卡点。 |
| `src/core/loopPlanner.ts` | 把目标、记忆、业务上下文和工具转换成结构化计划。 |
| `src/core/loopExecutor.ts` | 生成可审核草稿，并把失败保留在循环记录内。 |
| `src/core/loopReviewer.ts` | 把反馈转换成复盘、经验和下一轮建议。 |
| `src/protocol/loopChat.ts` | 把 runtime 状态映射成对话消息、卡片和用户动作。 |
| `src/adapters/*` | Runtime、工具、反馈和记忆边界。 |
| `src/ui/*` | Chat-first 工作台、内嵌交互卡片、runtime 下拉、反馈和记忆面板。 |

## Runtime Connectors

不配置 API key 时，Centaur Loop 会使用内置 deterministic demo runtime。使用真实模型时，浏览器只调用本地 Vite proxy，API key 不会进入前端包。

当前支持的 runtime 路径：

- `local-demo`：内置 deterministic demo runtime。
- `openai-compatible-env`：通过环境变量配置任意 OpenAI-compatible `/chat/completions` endpoint。
- `ollama-local`：通过 `127.0.0.1:11434/api/tags` 探测，并通过 `/api/chat` 调用。
- `lm-studio-local`：通过 `127.0.0.1:1234/v1/models` 探测。
- `vllm-local`：通过 `127.0.0.1:8000/v1/models` 探测。
- `llamacpp-local`：通过 `127.0.0.1:8080/v1/models` 探测。

LangGraph、Temporal、n8n 风格审批流目前作为 planned adapter 示例展示。

## 快速开始

```bash
npm install
npm run dev
```

打开终端里 Vite 输出的 URL。不配置任何 key 时，应用会自动使用 demo runtime。

## 真实模型配置

创建 `.env.local`：

```bash
cp .env.example .env.local
```

配置 OpenAI-compatible endpoint：

```bash
CENTAUR_MODEL_BASE_URL=https://api.openai.com/v1
CENTAUR_MODEL_API_KEY=your_key_here
CENTAUR_MODEL_NAME=gpt-4o-mini
```

然后重启 dev server，在右下角 runtime 菜单中选择对应 runtime。

## 开发

```bash
npm run typecheck
npm run build
```

## 路线图

- 从 demo 工作台中抽离 `@centaur-loop/core`。
- 增加 durable storage、notifier、model、memory adapters。
- 为被退回的草稿增加重新生成和修订流程。
- 增加 LangGraph、Mastra、Inngest、Temporal、n8n 风格审批流示例。
- 改进 durable execution、幂等、重试和 checkpoint 恢复。
- 增强语义记忆检索能力。

## 项目状态

Centaur Loop 还处于早期阶段。当前代码是可运行 MVP 和产品设计参考，还不是稳定的库 API。目标是把 Agent 工作周围的反馈层变得具体、可检查、可扩展。

## 贡献

欢迎提交聚焦的问题和小 PR。较大的设计变更请先阅读 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md) 并开 issue 讨论。

## 许可证

MIT
