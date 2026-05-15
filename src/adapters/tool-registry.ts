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

// ── 客服闭环工具 ──────────────────────────────────────────────────

const SUPPORT_TOOLS: AIToolDefinition[] = [
  {
    id: 'ticket-classifier',
    name: '工单分类',
    description: '对客服工单进行分类和优先级排序',
    icon: '🏷️',
    inputSchema: [
      { id: 'tickets', label: '工单内容', type: 'textarea', required: true },
      { id: 'categories', label: '分类标签', type: 'text', placeholder: '技术问题/账号问题/功能建议' },
    ],
    outputInstruction: '输出 JSON，包含每条工单的分类、优先级和建议处理策略。',
  },
  {
    id: 'support-reply-generator',
    name: '客服回复生成',
    description: '根据工单内容生成专业的客服回复',
    icon: '💬',
    inputSchema: [
      { id: 'ticket', label: '客户问题', type: 'textarea', required: true },
      { id: 'context', label: '背景信息', type: 'textarea' },
      { id: 'tone', label: '语气', type: 'text', placeholder: '专业/亲切/简洁' },
    ],
    outputInstruction: '输出一条可直接发送的客服回复。',
  },
  {
    id: 'faq-answer-writer',
    name: 'FAQ 回答生成',
    description: '根据常见问题生成标准化回答',
    icon: '📋',
    inputSchema: [
      { id: 'question', label: '问题', type: 'text', required: true },
      { id: 'product', label: '产品/功能', type: 'text' },
    ],
    outputInstruction: '输出一条清晰、准确的 FAQ 回答。',
  },
];

// ── 产品迭代闭环工具 ──────────────────────────────────────────────

const PRODUCT_TOOLS: AIToolDefinition[] = [
  {
    id: 'feedback-analyzer',
    name: '反馈分析',
    description: '从用户反馈中提取需求和痛点',
    icon: '📊',
    inputSchema: [
      { id: 'feedback', label: '用户反馈', type: 'textarea', required: true },
      { id: 'product', label: '产品名称', type: 'text' },
    ],
    outputInstruction: '输出 JSON，包含提取的需求列表、优先级和分类。',
  },
  {
    id: 'iteration-plan-writer',
    name: '迭代方案',
    description: '根据需求分析生成产品迭代方案',
    icon: '📐',
    inputSchema: [
      { id: 'requirements', label: '需求列表', type: 'textarea', required: true },
      { id: 'constraints', label: '约束条件', type: 'textarea' },
    ],
    outputInstruction: '输出一份产品迭代方案，包含目标、范围、优先级和里程碑。',
  },
  {
    id: 'changelog-generator',
    name: 'Changelog 生成',
    description: '根据迭代内容生成用户可读的更新日志',
    icon: '📝',
    inputSchema: [
      { id: 'changes', label: '变更内容', type: 'textarea', required: true },
      { id: 'audience', label: '目标读者', type: 'text', placeholder: '用户/开发者/内部' },
    ],
    outputInstruction: '输出一份结构清晰的 changelog。',
  },
];

const ALL_TOOLS = [...TOOL_CATALOG, ...SUPPORT_TOOLS, ...PRODUCT_TOOLS];

export function findTool(toolId: string): AIToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.id === toolId);
}
