# 贡献指南

[English](./CONTRIBUTING.md) | 简体中文

Centaur Loop 还处于早期阶段，因此最有价值的贡献是聚焦、具体、可验证的改进。

适合优先贡献的方向：

- 改进核心状态机的可靠性和幂等性。
- 从当前 React demo 中抽离框架无关的 core API。
- 增加 storage、notifier、memory 和 model 适配器。
- 增加销售跟进、客服、研究、内容增长等示例闭环。
- 改进文档和架构图。

如果你准备提交较大的 PR，请先开 issue 说明设计思路和取舍。

## 本地开发

```bash
npm install
npm run typecheck
npm run build
```

## 原则

- 把人类作为一等公民的决策者。
- 把反馈和复盘作为闭环的原生部分。
- 避免自动写入低质量长期记忆。
- 优先使用小而可组合的适配器，避免平台锁定。

