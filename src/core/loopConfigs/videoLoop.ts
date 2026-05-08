import type { CentaurLoopConfig } from '../types';

export const VIDEO_PRODUCTION_LOOP_CONFIG: CentaurLoopConfig = {
  id: 'video-production',
  name: '短视频生产闭环',
  icon: '🎬',
  employeeId: 'spark',
  description: '每天产出一条有策略的短视频，根据数据反馈持续优化选题和表达',
  trigger: { type: 'ai_suggest', description: '每天早上火花推荐今日选题', scheduleHint: '每天' },
  cyclePeriod: 'daily',
  hasFastLoop: true,
  hasSlowLoop: true,
  aiWorkPhases: [
    { id: 'topic', name: '选题推荐', appToolIds: [] },
    { id: 'script', name: '脚本生成', appToolIds: ['short-video-script-generator'] },
    { id: 'daily-review', name: '每日快速复盘', appToolIds: [] },
  ],
  humanGates: [
    { id: 'confirm-topic', stage: 'awaiting_plan_review', name: '确认今日选题', description: '确认今日短视频选题和拍摄方向', required: true, timeoutAction: 'remind', remindAfterMinutes: 30, maxReminders: 2, notifyChannels: ['spirit_bubble', 'badge'] },
    { id: 'confirm-script', stage: 'awaiting_review', name: '确认拍摄脚本', description: '审核 AI 生成的拍摄脚本', required: true, timeoutAction: 'remind', remindAfterMinutes: 60, maxReminders: 2, notifyChannels: ['spirit_bubble', 'badge', 'home_card'] },
    { id: 'publish', stage: 'awaiting_publish', name: '拍摄并发布', description: '按脚本拍摄并发布到目标平台', required: true, timeoutAction: 'remind', remindAfterMinutes: 480, maxReminders: 2, notifyChannels: ['chat_followup'] },
    { id: 'feedback', stage: 'awaiting_feedback', name: '回传数据', description: '截图或填写播放、点赞、评论等数据', required: true, timeoutAction: 'remind', remindAfterMinutes: 240, maxReminders: 3, notifyChannels: ['chat_followup', 'spirit_bubble'] },
    { id: 'confirm-memory', stage: 'awaiting_memory', name: '确认经验', description: '确认 AI 提炼的经验', required: false, timeoutAction: 'skip', remindAfterMinutes: 30, maxReminders: 1, notifyChannels: ['spirit_bubble'] },
  ],
  artifactTypes: ['video_script'],
  feedbackMethods: ['screenshot_ocr', 'quick_form', 'chat_followup'],
  memoryCategories: ['有效钩子', '最佳时长', '热门话题', '发布时间', '平台偏好', '评论洞察'],
};
