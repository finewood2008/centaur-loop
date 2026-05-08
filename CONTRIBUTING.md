# Contributing

English | [简体中文](./CONTRIBUTING.zh-CN.md)

Centaur Loop is early, so the most useful contributions are focused and concrete.

Good first areas:

- Improve the core state machine reliability and idempotency.
- Extract framework-neutral core APIs from the current React demo.
- Add storage, notifier, memory, and model adapters.
- Add example loops for sales follow-up, customer support, research, and content growth.
- Improve documentation and diagrams.

Before opening a larger PR, please open an issue describing the design and tradeoffs.

## Local Development

```bash
npm install
npm run typecheck
npm run build
```

## Principles

- Keep humans as first-class decision makers.
- Keep feedback and review native to the loop.
- Avoid writing low-quality memories automatically.
- Prefer small, composable adapters over platform lock-in.
