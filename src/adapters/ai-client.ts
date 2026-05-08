/**
 * AI Client 适配层
 *
 * 在独立产品中替代 centaurai-edge 的 qeeclaw SDK。
 * 提供统一的 AI 调用接口，支持多种后端：
 * - demo: 返回模拟数据（默认，用于展示）
 * - qeeclaw: 连接 QeeClaw bridge
 * - openai: 直连 OpenAI 兼容接口（TODO）
 */

export interface AIClient {
  models: {
    invoke: (params: { prompt: string }) => Promise<unknown>;
  };
}

// ── Demo 模拟客户端 ──────────────────────────────────────────────

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
  const isSEO = prompt.includes('SEO') || prompt.includes('seo');
  const isVideo = prompt.includes('短视频') || prompt.includes('video');

  if (isVideo) {
    return JSON.stringify({
      summary: '今日选题：用手机演示如何3分钟部署一个本地AI员工，突出"不用写代码"的卖点',
      platforms: ['抖音', '视频号'],
      keywords: ['本地AI', '不用写代码', 'AI员工'],
      tasks: [
        {
          appToolId: 'short-video-script-generator',
          appName: '短视频脚本生成',
          artifactType: 'video_script',
          inputParams: {
            topic: '3分钟部署本地AI员工',
            style: '教程演示',
            duration: '60秒',
          },
        },
      ],
    });
  }

  if (isSEO) {
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
  const isVideo = prompt.includes('视频') || prompt.includes('脚本');
  if (isVideo) {
    return `# 3分钟部署本地AI员工 — 拍摄脚本

## 开场（0-5秒）
【镜头】手持手机，对着电脑屏幕
【台词】"你相信吗？不用写一行代码，3分钟就能拥有一个AI员工。"

## 第一步：安装（5-20秒）
【镜头】屏幕录制，下载安装过程
【台词】"打开官网，下载安装包，双击安装。就像装微信一样简单。"

## 第二步：配置（20-40秒）
【镜头】屏幕录制，填写基本信息
【台词】"填入你的企业名称、行业、主要业务。AI员工需要了解你的公司。"

## 第三步：开始工作（40-55秒）
【镜头】屏幕录制，AI生成内容
【台词】"点击'开始闭环'，看，AI已经在为你规划本周的内容营销方案了。"

## 结尾（55-60秒）
【镜头】面对镜头
【台词】"本地部署，数据安全。想试试的点链接。"

---
**标签**: #AI员工 #本地部署 #不用写代码 #创业工具
**发布时间建议**: 工作日 12:00-13:00`;
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
    _client = createDemoClient();
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
