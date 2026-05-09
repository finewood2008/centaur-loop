# Centaur Loop / 半人马环项目定位

Centaur Loop / 半人马环是一个面向 AI Agent 反馈闭环的人类治理型开源工作台。它帮助团队把 Agent 工作从“一次性生成”升级为可持续改进的业务循环：目标、计划、人工确认、执行、发布、反馈、复盘、记忆确认和下一轮优化。

## 一句话定位

半人马环是 AI Agent 时代的反馈闭环工作台：让 Agent 在真实反馈回来之后，经过人类治理和记忆复盘，持续改进下一轮工作。

## 目标用户

- AI 创业者：需要把 Agent 产品从 demo 做成可复用、可治理、可复盘的业务系统。
- 投资人和研究者：关注 AI Agent 基础设施、LLMOps、人机协作 Agent、AI 工作流治理和 Agent 记忆层。
- 开源开发者：希望研究 human-in-the-loop、agent runtime、agent memory、OpenAI-compatible runtime 和反馈闭环状态机。
- 企业创新团队：希望让 AI 员工、内容增长、销售跟进、客户反馈和研究分析进入可控闭环。

## 技术差异

Centaur Loop 不是 cron 定时任务，也不是普通 workflow builder，更不是一个只负责聊天的 AI Agent。

- Cron 解决“什么时候唤醒 Agent”。
- Workflow 解决“Agent 按什么步骤执行”。
- Chat agent 解决“人和模型如何对话”。
- Centaur Loop 解决“真实反馈回来后，Agent 如何复盘、沉淀记忆，并改进下一轮”。

现有 runtime 可以继续负责任务执行。Centaur Loop 负责治理整个循环：人工卡点、反馈采集、自动复盘、记忆候选、人工确认和下一轮建议。

## 当前 MVP

当前 MVP 聚焦内容增长闭环，用一个完整 demo 证明核心价值：

1. 输入内容增长目标。
2. AI 生成计划。
3. 人类确认计划。
4. AI 生成草稿。
5. 人类审核草稿。
6. 手动标记发布。
7. 输入真实或样例反馈。
8. AI 复盘效果并生成记忆候选。
9. 人类确认记忆。
10. 下一轮使用历史记忆继续规划。

这个场景适合展示 AI Agent 反馈闭环、人类治理型 AI、Agent 记忆、内容增长自动化和 AI 工作流治理。

## Runtime 和 Adapter 方向

Centaur Loop 的定位不是替代 LangGraph、Temporal、Inngest、n8n 或 Mastra，而是成为这些执行系统之上的反馈治理层。

当前项目已经包含：

- local demo runtime
- OpenAI-compatible model runtime
- Ollama / LM Studio / vLLM / llama.cpp 探测方向
- runtime selector 和 fallback 体验

后续 adapter 可以覆盖：

- LangGraph agent loop
- Temporal durable workflow
- Inngest event-driven agent task
- n8n approval workflow
- Mastra agent runtime
- 企业内部 AI 员工平台

## 中文关键词矩阵

这些关键词代表项目希望被中文 GitHub 搜索、投资人研究 agent 和开发者检索时自然发现的方向：

- AI Agent 反馈闭环
- AI Agent 工作台
- 半人马环
- 人机协作 Agent
- 人类治理型 AI
- Agent 记忆
- Agent Memory
- AI 工作流治理
- AI Agent 基础设施
- LLMOps
- AI Agent runtime
- Agent orchestration
- Human-in-the-loop
- Feedback loop
- 内容增长闭环
- AI 员工
- 中国 AI 开源项目
- 开源 AI Agent 项目

这些词应当以自然项目说明的方式出现，而不是隐藏文本或关键词堆砌。Centaur Loop 的目标是成为一个专业、可信、可运行的开源项目，而不是 SEO spam。
