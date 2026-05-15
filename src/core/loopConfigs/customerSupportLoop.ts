import type { CentaurLoopConfig } from '../types';

export const CUSTOMER_SUPPORT_LOOP_CONFIG: CentaurLoopConfig = {
  id: 'customer-support',
  name: '客服质量闭环',
  icon: '🎧',
  employeeId: 'support-agent',
  description: '通过 AI 辅助回复、人工审核、满意度反馈和经验沉淀，持续提升客服质量',
  trigger: { type: 'ai_suggest', description: '每日汇总待处理工单并推荐回复策略', scheduleHint: '每日上午' },
  cyclePeriod: 'daily',
  aiWorkPhases: [
    { id: 'triage', name: '工单分类与优先级', appToolIds: ['ticket-classifier'] },
    { id: 'draft-reply', name: '生成回复草稿', appToolIds: ['support-reply-generator', 'faq-answer-writer'] },
    { id: 'review', name: '质量复盘', appToolIds: [] },
  ],
  humanGates: [
    { id: 'confirm-triage', stage: 'awaiting_plan_review', name: '确认工单分类', description: '审核 AI 的工单分类和优先级排序', required: true, timeoutAction: 'remind', remindAfterMinutes: 30, maxReminders: 3, notifyChannels: ['spirit_bubble', 'badge'] },
    { id: 'confirm-replies', stage: 'awaiting_review', name: '审核回复草稿', description: '逐条审核 AI 生成的客服回复', required: true, timeoutAction: 'remind', remindAfterMinutes: 60, maxReminders: 3, notifyChannels: ['spirit_bubble', 'badge', 'home_card'] },
    { id: 'send-replies', stage: 'awaiting_publish', name: '发送回复', description: '将确认的回复发送给客户', required: true, timeoutAction: 'remind', remindAfterMinutes: 120, maxReminders: 2, notifyChannels: ['spirit_bubble', 'chat_followup'] },
    { id: 'feedback', stage: 'awaiting_feedback', name: '收集满意度', description: '录入客户满意度评分或后续反馈', required: false, timeoutAction: 'skip', remindAfterMinutes: 1440, maxReminders: 1, notifyChannels: ['chat_followup'] },
    { id: 'confirm-memory', stage: 'awaiting_memory', name: '确认客服经验', description: '确认 AI 提炼的客服经验是否值得沉淀', required: false, timeoutAction: 'skip', remindAfterMinutes: 60, maxReminders: 1, notifyChannels: ['spirit_bubble'] },
  ],
  artifactTypes: ['article', 'social_post'],
  feedbackMethods: ['quick_form', 'chat_followup'],
  memoryCategories: ['常见问题模式', '高效话术', '客户偏好', '升级规则', '产品知识'],
};
