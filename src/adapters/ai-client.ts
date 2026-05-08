/**
 * AI Client 适配层
 *
 * 在独立产品中替代 centaurai-edge 的 qeeclaw SDK。
 * 提供统一的 AI 调用接口，支持多种后端：
 * - openai-compatible: 通过本地 Vite API proxy 调用真实模型
 * - demo: 无 key 或 proxy 不可用时自动降级，返回模拟数据
 */

import { invokeRuntimeModel } from './runtime';

export interface AIClient {
  models: {
    invoke: (params: { prompt: string }) => Promise<unknown>;
  };
}

export type AIClientMode = 'real' | 'demo';

let _lastClientMode: AIClientMode = 'demo';

export function getLastClientMode(): AIClientMode {
  return _lastClientMode;
}

function setLastClientMode(mode: AIClientMode): void {
  _lastClientMode = mode;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('centaur-runtime-mode', { detail: { mode } }));
  }
}

// ── Demo 模拟客户端 ──────────────────────────────────────────────

function wantsEnglish(prompt: string): boolean {
  return /Use clear, concise English|Output language:\s*English|English/i.test(prompt);
}

function createDemoClient(): AIClient {
  return {
    models: {
      invoke: async ({ prompt }: { prompt: string }) => {
        // 模拟延迟
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

        // 根据 prompt 内容返回不同的模拟结果
        if (prompt.includes('闭环规划器') || prompt.includes('规划')) {
          return { text: generateDemoPlanResponse(prompt) };
        }
        if (prompt.includes('闭环复盘') || prompt.includes('复盘')) {
          return { text: generateDemoReviewResponse() };
        }
        if (prompt.includes('截图') || prompt.includes('OCR')) {
          return { text: generateDemoScreenshotResponse() };
        }
        if (prompt.includes('反馈')) {
          return { text: generateDemoFeedbackResponse() };
        }
        // 默认：内容生成
        return { text: generateDemoContentResponse(prompt) };
      },
    },
  };
}

function generateDemoPlanResponse(prompt: string): string {
  const english = wantsEnglish(prompt);
  const isSEO = prompt.includes('SEO') || prompt.includes('seo');

  if (isSEO) {
    if (english) {
      return JSON.stringify({
        summary: 'This week, publish three content assets explaining why agents need feedback loops, not just scheduled runs.',
        platforms: ['Blog', 'LinkedIn', 'GitHub'],
        keywords: ['AI agent feedback loop', 'human-in-the-loop agents', 'agent runtime'],
        tasks: [
          {
            appToolId: 'wechat-article-generator',
            appName: 'Long-form article',
            artifactType: 'article',
            inputParams: {
              topic: 'Why AI agents need feedback loops, not just cron jobs',
              keywords: 'AI agents, feedback loops, human-in-the-loop',
              tone: 'clear and technical',
            },
          },
          {
            appToolId: 'xiaohongshu-note-generator',
            appName: 'Social post',
            artifactType: 'social_post',
            inputParams: {
              topic: 'Cron wakes agents up. Feedback loops make them improve.',
              style: 'developer-focused',
            },
          },
          {
            appToolId: 'seo-article-writer',
            appName: 'SEO article',
            artifactType: 'seo_article',
            inputParams: {
              keyword: 'AI agent feedback loop',
              outline: 'Problem -> Human gates -> Feedback -> Review -> Memory -> Next cycle',
            },
          },
        ],
      });
    }

    return JSON.stringify({
      summary: '本周围绕"本地AI部署"主题，生产3篇深度文章和2条小红书笔记，覆盖搜索和AI回答场景',
      platforms: ['公众号', '小红书', '知乎'],
      keywords: ['本地AI部署', '企业AI员工', 'AI私有化', '数据安全AI'],
      tasks: [
        {
          appToolId: 'wechat-article-generator',
          appName: '写公众号文章',
          artifactType: 'article',
          inputParams: {
            topic: '为什么越来越多企业选择本地部署AI？',
            keywords: '本地AI部署, 数据安全',
          },
        },
        {
          appToolId: 'xiaohongshu-note-generator',
          appName: '写小红书笔记',
          artifactType: 'social_post',
          inputParams: {
            topic: '老板必看：AI员工vs人工的成本对比',
            style: '干货分享',
          },
        },
        {
          appToolId: 'seo-article-writer',
          appName: 'SEO长文',
          artifactType: 'seo_article',
          inputParams: {
            keyword: '企业AI员工',
            outline: '什么是AI员工 → 能做什么 → 怎么部署 → 成本分析',
          },
        },
      ],
    });
  }

  if (english) {
    return JSON.stringify({
      summary: 'This cycle will produce a focused content plan around AI feedback loops.',
      platforms: ['Blog', 'LinkedIn'],
      keywords: ['AI agents'],
      tasks: [
        {
          appToolId: 'wechat-article-generator',
          appName: 'Long-form article',
          artifactType: 'article',
          inputParams: { topic: 'Introducing Centaur Loop' },
        },
      ],
    });
  }

  return JSON.stringify({
    summary: '本周内容计划：围绕核心产品优势产出多平台内容',
    platforms: ['公众号', '小红书'],
    keywords: ['AI产品'],
    tasks: [
      {
        appToolId: 'wechat-article-generator',
        appName: '写公众号文章',
        artifactType: 'article',
        inputParams: { topic: '产品介绍' },
      },
    ],
  });
}

function generateDemoContentResponse(prompt: string): string {
  const english = wantsEnglish(prompt);

  if (english) {
    return `# Why AI Agents Need Feedback Loops, Not Just Cron Jobs

Most AI automation starts with a schedule: every morning, generate a plan; every Friday, write a report; every hour, check a queue. Scheduling is useful, but it only answers one question: when should the agent wake up?

The harder product question is what happens after the work leaves the chat window.

## The Missing Layer

A useful agent needs more than execution. It needs a loop:

1. Plan around a clear goal.
2. Stop at the moments where human judgment matters.
3. Produce work that can be inspected and published.
4. Collect real-world feedback.
5. Review what happened.
6. Turn useful lessons into approved memory.
7. Start the next cycle with that memory.

That is the Centaur Loop pattern.

## Human Gates Are Not a Weakness

For content, sales, support, compliance, and brand-sensitive work, humans should not be treated as an exception handler. Human judgment is part of the operating model.

The agent should move fast where execution is safe and stop where taste, truth, risk, or business context matter.

## Feedback Makes the Agent Improve

Without feedback, an agent is just automation. With feedback and reviewed memory, each cycle can become more precise than the last.

Centaur Loop turns that idea into a workbench: plan, approve, execute, publish, feed back, review, remember, and run again.`;
  }

  return `# 为什么越来越多企业选择本地部署AI？

在数字化转型的浪潮中，AI技术正在深刻改变企业的运营方式。然而，当越来越多企业拥抱AI时，一个关键问题浮出水面：**数据安全**。

## 云端AI的隐忧

将企业核心数据上传到云端AI平台，意味着你的客户信息、商业策略、财务数据都暴露在第三方服务器上。对于注重数据隐私的企业来说，这是一个不可接受的风险。

## 本地部署的三大优势

### 1. 数据不出门
所有AI推理都在你自己的设备上完成，数据永远不会离开你的办公室。

### 2. 成本可控
一次部署，长期使用。不再按API调用次数付费，对于高频使用场景，成本优势明显。

### 3. 定制化更深
本地部署的AI可以深度学习你的企业知识库，理解你的行业术语和业务流程。

## 适合本地部署AI的企业

- 对数据安全有严格要求的金融、医疗企业
- 有大量重复性内容生产需求的营销团队
- 希望AI深度融入工作流的中小企业

---

*想了解更多关于本地AI部署的方案？欢迎联系我们。*`;
}

function generateDemoReviewResponse(): string {
  return generateDemoReviewResponseForLocale(false);
}

function generateDemoReviewResponseForLocale(english: boolean): string {
  if (english) {
    return JSON.stringify({
      summary: 'The cycle validated the core positioning: feedback loops are easier to understand when contrasted with cron jobs and one-shot workflows.',
      effectivePoints: [
        'The "Cron wakes agents up" line creates a clear category distinction.',
        'Human gates made the loop feel practical rather than fully autonomous.',
        'The memory step gave the demo a visible improvement mechanism.',
      ],
      ineffectivePoints: [
        'The first draft was still too abstract for non-technical readers.',
        'The social post needs a sharper visual hook.',
      ],
      dataHighlights: [
        'Blog: 1,240 views, 68 likes',
        'Social post: 42 saves, 16 comments',
        'GitHub: 11 new stars after publishing',
      ],
      memoryCandidates: [
        { content: 'Lead with "Cron wakes agents up. Feedback loops make them improve." when explaining Centaur Loop.', category: 'lesson' },
        { content: 'Developer audiences respond better when Centaur Loop is positioned as a workbench, not another workflow engine.', category: 'lesson' },
        { content: 'Show memory visibly before starting the second cycle.', category: 'preference' },
      ],
      nextSuggestion: 'Next cycle: turn the strongest positioning line into the README hero and create a short demo GIF showing memory being reused.',
    });
  }

  return JSON.stringify({
    summary: '本轮内容表现中等偏上，公众号文章阅读量超预期，小红书互动率有提升空间',
    effectivePoints: [
      '标题使用疑问句式，点击率提升20%',
      '发布时间选在周二上午10点，阅读量峰值明显',
      '结尾CTA引导效果好，私信咨询增加3条',
    ],
    ineffectivePoints: [
      '小红书封面图不够吸引眼球，需要优化视觉',
      '文章篇幅偏长（2800字），完读率偏低',
    ],
    dataHighlights: [
      '公众号阅读量 1200，高于上轮 800',
      '小红书收藏 45，点赞 89',
      '总互动率 3.2%',
    ],
    memoryCandidates: [
      { content: '公众号文章控制在1500字以内，完读率最高', category: 'lesson' },
      { content: '疑问句式标题比陈述句点击率高20%左右', category: 'lesson' },
      { content: '周二上午10点是公众号最佳发布时间', category: 'fact' },
    ],
    nextSuggestion: '下一轮建议：1) 小红书封面图使用对比类图片；2) 文章控制在1500字；3) 尝试在知乎发布长文引流',
  });
}

function generateDemoScreenshotResponse(): string {
  return JSON.stringify({
    platform: '公众号',
    metrics: {
      views: 1200,
      likes: 56,
      favorites: 23,
      comments: 8,
      shares: 12,
    },
  });
}

function generateDemoFeedbackResponse(): string {
  return JSON.stringify({
    published: true,
    platform: '公众号',
    metrics: { views: 800, likes: 34, comments: 5 },
    rating: 'ok',
    ownerNote: '内容方向对了，但篇幅可以更精炼',
  });
}

// ── 客户端管理 ────────────────────────────────────────────────────

let _client: AIClient | null = null;

export async function getClientAsync(): Promise<AIClient> {
  if (!_client) {
    _client = {
      models: {
        invoke: async ({ prompt }: { prompt: string }) => {
          try {
            const result = await invokeRuntimeModel(prompt);
            setLastClientMode('real');
            return result;
          } catch {
            setLastClientMode('demo');
            const demo = createDemoClient();
            if (prompt.includes('闭环复盘') || prompt.includes('review engine')) {
              return { text: generateDemoReviewResponseForLocale(wantsEnglish(prompt)) };
            }
            return demo.models.invoke({ prompt });
          }
        },
      },
    };
  }
  return _client;
}

export function setClient(client: AIClient): void {
  _client = client;
}

export function extractModelText(result: unknown): string {
  if (typeof result === 'string') return result.trim();
  if (!result || typeof result !== 'object') return '';

  const record = result as Record<string, unknown>;
  const directCandidates = [
    record.text, record.content, record.output,
    record.message, record.reply, record.answer,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const nestedKey of ['data', 'result', 'response']) {
    const nested = record[nestedKey];
    const nestedText = extractModelText(nested);
    if (nestedText) return nestedText;
  }

  return '';
}
