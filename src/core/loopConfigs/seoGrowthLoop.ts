import type { CentaurLoopConfig } from '../types';

export const SEO_GROWTH_LOOP_CONFIG: CentaurLoopConfig = {
  id: 'seo-geo-growth',
  name: 'SEO/GEO 增长闭环',
  icon: '📈',
  employeeId: 'spark',
  description: '系统性占领搜索引擎和AI回答中的位置，通过定期内容生产、发布和数据复盘持续提升可见度',
  trigger: { type: 'ai_suggest', description: '每周火花主动推荐本周增长计划', scheduleHint: '每周一' },
  cyclePeriod: 'weekly',
  aiWorkPhases: [
    { id: 'diagnose', name: '增长诊断与选题规划', appToolIds: ['wechat-article-generator', 'seo-article-writer'] },
    { id: 'generate', name: '批量生成内容', appToolIds: ['wechat-article-generator', 'xiaohongshu-note-generator', 'seo-article-writer', 'geo-content-optimizer'] },
    { id: 'review', name: '增长复盘', appToolIds: [] },
  ],
  humanGates: [
    { id: 'confirm-plan', stage: 'awaiting_plan_review', name: '确认本周计划', description: '审核本周内容增长计划', required: true, timeoutAction: 'remind', remindAfterMinutes: 60, maxReminders: 3, notifyChannels: ['spirit_bubble', 'badge', 'home_card'] },
    { id: 'confirm-drafts', stage: 'awaiting_review', name: '审核内容草稿', description: '逐篇审核 AI 生成的草稿内容', required: true, timeoutAction: 'remind', remindAfterMinutes: 120, maxReminders: 3, notifyChannels: ['spirit_bubble', 'badge', 'home_card'] },
    { id: 'publish', stage: 'awaiting_publish', name: '手动发布内容', description: '将确认的内容复制到目标平台发布', required: true, timeoutAction: 'remind', remindAfterMinutes: 1440, maxReminders: 2, notifyChannels: ['spirit_bubble', 'chat_followup'] },
    { id: 'feedback', stage: 'awaiting_feedback', name: '补充效果反馈', description: '截图或手动填写各平台数据表现', required: false, timeoutAction: 'skip', remindAfterMinutes: 4320, maxReminders: 2, notifyChannels: ['chat_followup'] },
    { id: 'confirm-memory', stage: 'awaiting_memory', name: '确认增长经验', description: '确认 AI 提炼的经验是否值得沉淀', required: false, timeoutAction: 'skip', remindAfterMinutes: 60, maxReminders: 1, notifyChannels: ['spirit_bubble'] },
  ],
  artifactTypes: ['article', 'social_post', 'seo_article', 'geo_content', 'content_plan'],
  feedbackMethods: ['quick_form', 'chat_followup', 'screenshot_ocr'],
  memoryCategories: ['有效选题', '标题模式', '平台偏好', '关键词进展', '内容长度偏好'],
};
