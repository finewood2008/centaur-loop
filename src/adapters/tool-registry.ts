/**
 * Tool Registry 适配层
 *
 * 替代 centaurai-edge 的 toolCatalog / appCatalog / toolRunner。
 * 在独立产品中：
 * - 工具定义内联（不依赖外部 catalog）
 * - 执行统一走 ai-client 的 models.invoke
 */

// ── 类型定义 ──────────────────────────────────────────────────────

export type AIToolInputType = 'text' | 'textarea' | 'select';

export interface AIToolInputField {
  id: string;
  label: string;
  type: AIToolInputType;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export interface AIToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  inputSchema: AIToolInputField[];
  outputInstruction: string;
}

export type AIToolInputValues = Record<string, string>;

// ── 内置工具定义（Demo 用） ──────────────────────────────────────

export const TOOL_CATALOG: AIToolDefinition[] = [
  {
    id: 'wechat-article-generator',
    name: '写公众号文章',
    description: '生成适合公众号发布的深度文章',
    icon: '📝',
    inputSchema: [
      { id: 'topic', label: '主题', type: 'text', required: true },
      { id: 'keywords', label: '关键词', type: 'text' },
      { id: 'tone', label: '语气', type: 'text', placeholder: '专业/轻松/故事化' },
    ],
    outputInstruction: '输出一篇完整的公众号文章，包含标题、正文、结尾引导。',
  },
  {
    id: 'xiaohongshu-note-generator',
    name: '写小红书笔记',
    description: '生成适合小红书风格的图文笔记',
    icon: '📕',
    inputSchema: [
      { id: 'topic', label: '主题', type: 'text', required: true },
      { id: 'style', label: '风格', type: 'text', placeholder: '干货/种草/测评' },
    ],
    outputInstruction: '输出一篇小红书笔记，包含标题、正文、标签。',
  },
  {
    id: 'seo-article-writer',
    name: 'SEO 长文',
    description: '生成搜索引擎优化的长文章',
    icon: '🔍',
    inputSchema: [
      { id: 'keyword', label: '目标关键词', type: 'text', required: true },
      { id: 'outline', label: '大纲', type: 'textarea' },
    ],
    outputInstruction: '输出一篇2000字以上的SEO优化文章。',
  },
  {
    id: 'short-video-script-generator',
    name: '短视频脚本',
    description: '生成短视频拍摄脚本',
    icon: '🎬',
    inputSchema: [
      { id: 'topic', label: '选题', type: 'text', required: true },
      { id: 'style', label: '风格', type: 'text', placeholder: '教程/vlog/剧情' },
      { id: 'duration', label: '时长', type: 'text', placeholder: '30秒/60秒' },
    ],
    outputInstruction: '输出分镜脚本，包含画面、台词、时长。',
  },
  {
    id: 'geo-content-optimizer',
    name: 'GEO 内容优化',
    description: '优化内容以在AI回答中获得更好的引用',
    icon: '🌐',
    inputSchema: [
      { id: 'content', label: '原始内容', type: 'textarea', required: true },
      { id: 'targetQuestion', label: '目标问题', type: 'text' },
    ],
    outputInstruction: '输出优化后的内容，使其更容易被AI引擎引用。',
  },
];

export function findTool(toolId: string): AIToolDefinition | undefined {
  return TOOL_CATALOG.find((t) => t.id === toolId);
}
