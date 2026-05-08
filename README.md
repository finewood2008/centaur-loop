# Centaur Loop

English | [简体中文](./README.zh-CN.md)

**The feedback-loop runtime for human-governed AI agents.**

Centaur Loop helps you build agents that plan, pause for human judgment, execute, collect real-world feedback, review outcomes, remember what worked, and improve the next cycle.

```text
Plan -> Approve -> Execute -> Review -> Publish -> Feedback -> Reflect -> Remember -> Next Cycle
```

Most agent systems can schedule work or pause for approval. Centaur Loop treats the full operating loop as the core abstraction: structured cycles, human gates, feedback, review, memory candidates, and next-cycle suggestions.

## Why This Exists

Cron wakes agents up. Workflows move agents through steps. Centaur Loop helps agents learn from what happened after the work left the chat window.

This project is built for AI products where humans remain responsible for judgment, quality, publishing, customer contact, compliance, or brand taste. The first examples focus on content growth loops such as SEO/GEO articles, social posts, and short-video scripts.

## Core Concepts

- **Cycle**: one full business iteration around a goal.
- **Stage**: the current state in the loop lifecycle.
- **Task**: an AI-generated work item inside a cycle.
- **Human Gate**: a first-class checkpoint where a person confirms, rejects, publishes, or submits feedback.
- **Feedback**: real-world outcome data such as views, likes, leads, comments, conversion, ratings, or notes.
- **Review**: an AI-generated retrospective based on tasks and feedback.
- **Memory Candidate**: a proposed long-term lesson that must be confirmed before it becomes memory.

## Current Loop Lifecycle

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

## What Is Included Today

- TypeScript state machine for Centaur Loop cycles.
- React + Zustand demo workspace.
- Chat-first loop protocol for turning stages into messages and actions.
- Human gate configuration and reminder hooks.
- Demo AI client with mock planning, drafting, screenshot parsing, and review output.
- Two starter loop templates:
  - SEO/GEO growth loop
  - Short-video production loop

## Quick Start

```bash
npm install
npm run dev
```

Then open the Vite URL printed in your terminal.

For a production build:

```bash
npm run build
```

## Repository Status

This repository is early. The current codebase is a working prototype and design reference, not a stable library API yet.

Near-term direction:

- Extract `@centaur-loop/core` from the demo UI.
- Add storage, notifier, LLM, and memory adapters.
- Add a runnable content-growth demo with a clean developer API.
- Add integration examples for LangGraph, Mastra, Inngest, Temporal, and n8n-style human approval flows.
- Improve durable execution, idempotency, retries, and checkpoint recovery.

## Design Document

- [Technical Design](./CENTAUR_LOOP_TECHNICAL_DOC_EN.md)
- [技术设计说明](./CENTAUR_LOOP_TECHNICAL_DOC.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Chinese version: [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md).

## License

MIT
