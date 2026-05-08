# Lovable Prompt: Centaur Loop Official Website

Build a premium English-first official website for an open-source GitHub project called **Centaur Loop**.

Centaur Loop is **the open-source workbench for human-governed AI feedback loops**. It helps teams run AI agents in accountable business cycles where AI can plan and execute, but humans keep judgment authority at explicit checkpoints. The website should feel like a high-quality open-source infrastructure / AI developer tool that could earn strong GitHub attention.

## Product Positioning

Centaur Loop is not a cron scheduler, not a generic workflow builder, not a publishing bot, and not a replacement for LangGraph, Temporal, Inngest, n8n, or Mastra. It is the missing feedback layer around agent work.

Core line:

> The workbench for human-governed AI loops.

Supporting explanation:

> Centaur Loop turns agent work into a full operating cycle: plan, approve, execute, review, publish, collect feedback, reflect, remember, and improve the next run.

## Required Page Structure

Create a single-page marketing homepage with these sections:

1. **Sticky top nav**
   - Brand: Centaur Loop
   - Nav links: Why, Lifecycle, Architecture, Use cases
   - Primary button: Star on GitHub

2. **Hero**
   - English-first, developer-tool tone
   - H1: `The workbench for human-governed AI loops.`
   - Lead: `Centaur Loop turns agent work into a full operating cycle: plan, approve, execute, review, publish, collect feedback, reflect, remember, and improve the next run.`
   - CTAs: `View GitHub`, `Read the design`
   - Include a product-like visual that looks like a control plane / terminal / lifecycle dashboard, not a generic AI illustration.
   - Show stack tags: TypeScript, React 18, Vite, Zustand, OpenAI-compatible runtime.

3. **What's different**
   - Title: `Not another scheduler. Not another workflow canvas.`
   - Three feature blocks:
     - `The loop is the product`: models the whole business iteration around agent work.
     - `Human gates are explicit`: AI runs where it can, pauses where humans own taste, compliance, publishing, and final judgment.
     - `Feedback becomes memory`: real outcomes, screenshots, notes, and metrics become memory candidates for future cycles.

4. **Lifecycle**
   - Title: `A state machine built for accountable agent work.`
   - Show the complete lifecycle:
     - planning
     - awaiting plan review
     - generating
     - awaiting review
     - awaiting publish
     - awaiting feedback
     - reviewing auto
     - awaiting memory
     - cycle complete
   - Include a visual flow with compact state cards.

5. **Architecture**
   - Title: `Small enough to inspect. Structured enough to extend.`
   - Mention that it is a working React workbench plus TypeScript loop runtime.
   - Include this flow as a code-like line:
     `Plan -> Approve -> Execute -> Review -> Publish -> Feedback -> Reflect -> Remember -> Next Cycle`
   - Show modules:
     - `loopEngine.ts`: explicit state machine that advances cycles and stops at human gates.
     - `loopPlanner.ts`: turns goals, memory, business context, and tools into a structured plan.
     - `loopExecutor.ts`: generates reviewable drafts and keeps failures inside the cycle record.
     - `loopReviewer.ts`: converts feedback into retrospectives, lessons, and next-cycle suggestions.
     - `loopChat.ts`: maps runtime state to chat messages, cards, and user actions.
     - `adapters/*`: OpenAI-compatible model access, tool registry, and memory boundaries.

6. **MVP focus / use cases**
   - Cards:
     - `Content Growth Loop` with WeChat articles, Xiaohongshu notes, SEO and GEO content.
     - `Runtime Connector Layer` with OpenAI-compatible endpoints, Ollama, LM Studio, vLLM, and llama.cpp.
     - `Agent Runtime Integrations` with LangGraph, Mastra, Temporal, Inngest, and n8n-style approvals as roadmap items.

7. **Positioning comparison**
   - Table comparing:
     - Cron / schedules: wake a job at a time; Centaur Loop governs before and after the job.
     - Workflow engines: move tasks through steps; Centaur Loop makes review, feedback, and memory part of the product surface.
     - Agent frameworks: plan and execute; Centaur Loop adds human gates, business outcomes, and next-cycle improvement.
     - Publishing bots: push output somewhere; Centaur Loop keeps publishing accountable and learns from real-world response.

8. **Final CTA**
   - Title: `Build AI systems that improve after the work leaves chat.`
   - CTAs: Star on GitHub, Open issues
   - Footer text: `Human judgment + AI execution + real feedback.`

## Visual Direction

Use a premium open-source infrastructure aesthetic:

- Warm ivory/parchment background, near-black text, muted olive-gray secondary text.
- Accent color: terracotta / muted clay.
- Secondary supporting colors: sage green, warm amber, sand.
- Use serif display typography for large headlines and a clean sans-serif for body text.
- Use monospace for lifecycle states, module names, code snippets, and labels.
- Keep the layout sharp, editorial, and technical. Avoid cartoon AI imagery, generic gradients, decorative blobs, and startup cliche illustrations.
- Buttons and cards should have small radii, around 8px.
- The page should feel dense enough for developers but still polished and readable.
- Make the hero visual inspectable: terminal/control-plane UI, lifecycle rows, state names, commands.

## Tone

Use confident, precise English. Do not sound like generic SaaS marketing. This is a serious early open-source project.

Keywords to naturally include:

- open source
- human-in-the-loop
- AI agents
- feedback loop
- state machine
- human gates
- memory candidates
- OpenAI-compatible runtime
- TypeScript
- React

## GitHub Links

Use this repository URL for CTAs:

`https://github.com/finewood2008/centaur-loop`

Issues URL:

`https://github.com/finewood2008/centaur-loop/issues`
