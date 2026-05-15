import type { CentaurLoopConfig } from '../types';

export const PRODUCT_ITERATION_LOOP_CONFIG: CentaurLoopConfig = {
  id: 'product-iteration',
  name: '产品迭代闭环',
  icon: '🔄',
  employeeId: 'product-agent',
  description: '从用户反馈中提取需求、生成迭代方案、跟踪上线效果，形成产品改进闭环',
  trigger: { type: 'ai_suggest', description: '每两周汇总用户反馈并推荐迭代方向', scheduleHint: '每两周一' },
  cyclePeriod: 'biweekly',
  aiWorkPhases: [
    { id: 'analyze', name: '反馈分析与需求提取', appToolIds: ['feedback-analyzer'] },
    { id: 'plan', name: '生成迭代方案', appToolIds: ['iteration-plan-writer', 'changelog-generator'] },
    { id: 'review', name: '效果复盘', appToolIds: [] },
  ],
  humanGates: [
    { id: 'confirm-analysis', stage: 'awaiting_plan_review', name: '确认需求分析', description: '审核 AI 从用户反馈中提取的需求优先级', required: true, timeoutAction: 'remind', remindAfterMinutes: 120, maxReminders: 3, notifyChannels: ['spirit_bubble', 'badge', 'home_card'] },
    { id: 'confirm-plan', stage: 'awaiting_review', name: '审核迭代方案', description: '审核 AI 生成的产品迭代方案和 changelog', required: true, timeoutAction: 'remind', remindAfterMinutes: 240, maxReminders: 2, notifyChannels: ['spirit_bubble', 'badge', 'home_card'] },
    { id: 'ship', stage: 'awaiting_publish', name: '标记上线', description: '确认功能已上线或 changelog 已发布', required: true, timeoutAction: 'remind', remindAfterMinutes: 4320, maxReminders: 2, notifyChannels: ['chat_followup'] },
    { id: 'feedback', stage: 'awaiting_feedback', name: '收集上线效果', description: '录入功能上线后的数据表现和用户反馈', required: false, timeoutAction: 'skip', remindAfterMinutes: 10080, maxReminders: 1, notifyChannels: ['chat_followup'] },
    { id: 'confirm-memory', stage: 'awaiting_memory', name: '确认产品经验', description: '确认 AI 提炼的产品迭代经验', required: false, timeoutAction: 'skip', remindAfterMinutes: 120, maxReminders: 1, notifyChannels: ['spirit_bubble'] },
  ],
  artifactTypes: ['content_plan', 'review_report'],
  feedbackMethods: ['quick_form', 'chat_followup', 'screenshot_ocr'],
  memoryCategories: ['用户痛点', '有效功能', '无效尝试', '优先级判断', '发布节奏'],
};
