# Centaur Loop

[English](./README.md) | 简体中文

**面向人类治理型 AI Agent 的反馈闭环运行时。**

Centaur Loop 帮助你构建这样的 Agent：它们会规划任务，在关键节点暂停等待人类判断，继续执行，收集真实世界反馈，复盘结果，记住有效经验，并改进下一轮循环。

```text
规划 -> 确认 -> 执行 -> 审核 -> 发布 -> 反馈 -> 复盘 -> 记忆 -> 下一轮
```

大多数 Agent 系统可以定时运行，也可以在审批点暂停。Centaur Loop 把完整运营闭环作为核心抽象：结构化循环、人工卡点、反馈、复盘、记忆候选，以及下一轮建议。

## 为什么需要它

Cron 让 Agent 醒来。Workflow 让 Agent 按步骤执行。Centaur Loop 让 Agent 从工作离开聊天窗口之后发生的真实结果中学习。

这个项目面向这样的 AI 产品：人类仍然要对判断、质量、发布、客户触达、合规或品牌调性负责。当前示例优先聚焦内容增长闭环，例如 SEO/GEO 文章、社交媒体帖子和短视频脚本。

## 核心概念

- **Cycle（循环）**：围绕一个目标完成的一整轮业务迭代。
- **Stage（阶段）**：循环生命周期中的当前状态。
- **Task（任务）**：一轮循环中的 AI 工作项。
- **Human Gate（人工卡点）**：一等公民式的人工节点，人可以确认、退回、发布或提交反馈。
- **Feedback（反馈）**：真实世界结果数据，例如阅读量、点赞、线索、评论、转化、评分或人工备注。
- **Review（复盘）**：基于任务和反馈生成的 AI 复盘。
- **Memory Candidate（记忆候选）**：AI 提出的长期经验，必须经人确认后才会进入记忆。

## 当前循环生命周期

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

## 当前包含什么

- Centaur Loop 循环的 TypeScript 状态机。
- React + Zustand 演示工作台。
- Chat-first 对话协议，可把阶段翻译成消息和动作。
- 人工卡点配置和提醒钩子。
- Demo AI client，包含模拟规划、生成、截图解析和复盘输出。
- 两个初始闭环模板：
  - SEO/GEO 增长闭环
  - 短视频生产闭环

## 快速开始

```bash
npm install
npm run dev
```

然后打开终端里 Vite 输出的 URL。

生产构建：

```bash
npm run build
```

## 仓库状态

这个项目还处于早期阶段。当前代码是可运行原型和设计参考，还不是稳定的库 API。

近期方向：

- 从演示 UI 中抽离 `@centaur-loop/core`。
- 增加 storage、notifier、LLM、memory 适配器。
- 增加一个可直接运行的 content-growth demo，并提供清晰的开发者 API。
- 增加 LangGraph、Mastra、Inngest、Temporal 和 n8n 风格人工审批流程的集成示例。
- 改进持久执行、幂等性、重试和 checkpoint 恢复。

## 设计文档

- [Technical Design](./CENTAUR_LOOP_TECHNICAL_DOC_EN.md)
- [技术设计说明](./CENTAUR_LOOP_TECHNICAL_DOC.md)

## 贡献

见 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md)。英文版：[CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

MIT

