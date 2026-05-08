/**
 * Centaur Loop Engine — 标准模型类型定义
 *
 * 半人马闭环的核心数据结构：
 * AI 自动跑 → 卡在人的节点 → 多渠道提醒 → 人处理 → AI 继续跑 → 循环
 */

import type { MemoryCategory } from '../adapters/memory';

// ─── 循环阶段状态机 ───────────────────────────────────────────

export type LoopStage =
  | 'planning'
  | 'generating'
  | 'reviewing_auto'
  | 'awaiting_plan_review'
  | 'awaiting_review'
  | 'awaiting_publish'
  | 'awaiting_feedback'
  | 'awaiting_memory'
  | 'cycle_complete';

// ─── 循环模板配置 ─────────────────────────────────────────────

export interface LoopTrigger {
  type: 'manual' | 'scheduled' | 'ai_suggest';
  description: string;
  scheduleHint?: string;
}

export interface AIWorkPhase {
  id: string;
  name: string;
  appToolIds: string[];
}

export type NotifyChannel = 'spirit_bubble' | 'badge' | 'home_card' | 'chat_followup';

export interface HumanGateConfig {
  id: string;
  stage: LoopStage;
  name: string;
  description: string;
  required: boolean;
  timeoutAction: 'remind' | 'skip' | 'pause';
  remindAfterMinutes: number;
  maxReminders: number;
  notifyChannels: NotifyChannel[];
}

export type ArtifactType =
  | 'article' | 'social_post' | 'video_script'
  | 'seo_article' | 'geo_content' | 'content_plan' | 'review_report';

export type FeedbackMethod = 'quick_form' | 'chat_followup' | 'screenshot_ocr' | 'browser_clip';

export interface CentaurLoopConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  employeeId: string;
  trigger: LoopTrigger;
  aiWorkPhases: AIWorkPhase[];
  humanGates: HumanGateConfig[];
  artifactTypes: ArtifactType[];
  feedbackMethods: FeedbackMethod[];
  memoryCategories: string[];
  cyclePeriod: 'daily' | 'weekly' | 'biweekly';
  hasFastLoop?: boolean;
  hasSlowLoop?: boolean;
}

// ─── 循环任务 ─────────────────────────────────────────────────

export interface LoopTaskDraft {
  title: string;
  content: string;
  preview: string;
  fields?: Record<string, string | string[]>;
  generatedAt: string;
}

export interface LoopTaskConfirmation {
  status: 'approved' | 'rejected';
  note?: string;
  confirmedAt: string;
}

export interface LoopTaskPublish {
  published: boolean;
  platform?: string;
  publishedAt?: string;
}

export type LoopTaskStatus =
  | 'pending' | 'running' | 'draft_ready'
  | 'confirmed' | 'rejected' | 'published' | 'feedback_done';

export interface LoopTask {
  id: string;
  cycleId: string;
  appToolId: string;
  appName: string;
  artifactType: ArtifactType;
  status: LoopTaskStatus;
  inputParams: Record<string, string>;
  draft?: LoopTaskDraft;
  confirmation?: LoopTaskConfirmation;
  publish?: LoopTaskPublish;
  feedback?: ContentFeedback;
}

// ─── 内容反馈 ──────────────────────────────────────────────────

export interface FeedbackMetrics {
  views?: number;
  likes?: number;
  favorites?: number;
  comments?: number;
  shares?: number;
  leads?: number;
  completionRate?: number;
  followers?: number;
}

export interface ContentFeedback {
  id: string;
  taskId: string;
  source: FeedbackMethod;
  published: boolean;
  publishedAt?: string;
  platform?: string;
  metrics?: FeedbackMetrics;
  rating?: 'good' | 'ok' | 'bad';
  ownerNote?: string;
  rawScreenshot?: string;
  reviewSummary?: string;
  memoryCandidate?: string;
  nextSuggestion?: string;
}

// ─── 记忆候选 ──────────────────────────────────────────────────

export interface MemoryCandidate {
  id: string;
  cycleId: string;
  content: string;
  category: MemoryCategory;
  source: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

// ─── 人工卡点运行时状态 ────────────────────────────────────────

export type HumanCheckpointType = 'plan_review' | 'draft_review' | 'publish' | 'feedback' | 'confirm_memory';

export interface HumanCheckpoint {
  id: string;
  cycleId: string;
  gateId: string;
  type: HumanCheckpointType;
  title: string;
  detail: string;
  status: 'waiting' | 'done' | 'skipped';
  createdAt: string;
  resolvedAt?: string;
  remindCount: number;
  relatedTaskId?: string;
  relatedMemoryId?: string;
}

// ─── 一轮循环实例 ──────────────────────────────────────────────

export interface LoopCyclePlan {
  summary: string;
  taskCount: number;
  platforms: string[];
  keywords?: string[];
}

export interface LoopCycleReview {
  summary: string;
  effectivePoints: string[];
  ineffectivePoints: string[];
  dataHighlights: string[];
}

export interface LoopCycle {
  id: string;
  loopConfigId: string;
  employeeId: string;
  stage: LoopStage;
  cycleNumber: number;
  goal: string;
  goalSource: 'manual' | 'ai_suggest';
  plan?: LoopCyclePlan;
  tasks: LoopTask[];
  review?: LoopCycleReview;
  memoryCandidates: MemoryCandidate[];
  nextSuggestion?: string;
  checkpoints: HumanCheckpoint[];
  createdAt: string;
  completedAt?: string;
}

// ─── 快速反馈表单输入 ──────────────────────────────────────────

export interface QuickFeedbackInput {
  published: boolean;
  platform?: string;
  rating?: 'good' | 'ok' | 'bad';
  views?: number;
  likes?: number;
  favorites?: number;
  comments?: number;
  shares?: number;
  completionRate?: number;
  followers?: number;
  ownerNote?: string;
}

// ─── 辅助类型 ──────────────────────────────────────────────────

export interface SpiritBubblePayload {
  text: string;
  priority: 'low' | 'normal' | 'high';
  emotion: 'neutral' | 'excited' | 'concerned' | 'proud';
  duration: number;
}

export interface LoopAdvanceContext {
  connected: boolean;
  ownerContext: string;
  businessContext: string;
  pushBubble: (bubble: SpiritBubblePayload) => void;
}

export interface LoopPlanContext {
  ownerContext: string;
  businessContext: string;
  memories: string[];
  previousSuggestion?: string;
  recentFeedbacks?: string[];
}

export interface LoopExecuteContext {
  connected: boolean;
  ownerContext: string;
  businessContext: string;
  memories: string[];
}

export interface LoopReviewContext {
  ownerContext: string;
  businessContext: string;
  memories: string[];
}

export interface LoopReviewResult {
  review: LoopCycleReview;
  memoryCandidates: MemoryCandidate[];
  nextSuggestion: string;
}

export interface LoopPlanResult {
  plan: LoopCyclePlan;
  tasks: LoopTask[];
}

// ─── Store 类型 ─────────────────────────────────────────────────

export interface LoopStoreState {
  loops: Record<string, CentaurLoopConfig>;
  cycles: Record<string, LoopCycle>;
  activeCycleIds: Record<string, string>;
  pendingCheckpointCount: number;
  homeCardCheckpoints: HumanCheckpoint[];
}

export interface LoopStoreActions {
  registerLoop: (config: CentaurLoopConfig) => void;
  startCycle: (loopConfigId: string, goal: string, goalSource: 'manual' | 'ai_suggest') => string;
  updateCycle: (cycleId: string, updates: Partial<LoopCycle>) => void;
  updateTask: (cycleId: string, taskId: string, updates: Partial<LoopTask>) => void;
  addTask: (cycleId: string, task: LoopTask) => void;
  addCheckpoint: (cycleId: string, checkpoint: HumanCheckpoint) => void;
  resolveCheckpoint: (cycleId: string, checkpointId: string) => void;
  addMemoryCandidate: (cycleId: string, candidate: MemoryCandidate) => void;
  confirmMemory: (cycleId: string, candidateId: string) => void;
  rejectMemory: (cycleId: string, candidateId: string) => void;
  getActiveCycle: (loopConfigId: string) => LoopCycle | null;
  getCycleHistory: (loopConfigId: string) => LoopCycle[];
  recalcPendingCount: () => void;
}

export type LoopStore = LoopStoreState & LoopStoreActions;
