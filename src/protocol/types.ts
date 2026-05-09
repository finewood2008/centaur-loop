/**
 * Loop Protocol — 对话驱动闭环的消息协议
 *
 * 核心思想：Loop Engine 的每一步推进都翻译成一条"消息"，
 * 用户的每一句回复都解析成一个"动作"。
 *
 * 这个协议层是 Loop Engine 和任何对话 UI（管家、微信、飞书）之间的桥梁。
 */

// ─── 消息类型（AI → 人）──────────────────────────────────────

export type LoopMessageRole = 'ai' | 'human' | 'system';

export type LoopMessageType =
  | 'text'              // 纯文字
  | 'plan_card'         // 计划卡片（含任务列表）
  | 'draft_card'        // 草稿卡片（可折叠内容）
  | 'publish_card'      // 发布提示卡片（含复制按钮）
  | 'feedback_request'  // 反馈请求
  | 'review_card'       // 复盘总结卡片
  | 'memory_card'       // 记忆确认卡片
  | 'progress'          // 进度更新（AI 正在工作）
  | 'cycle_complete'    // 本轮完成
  | 'quick_actions';    // 快捷操作按钮组

export interface LoopMessage {
  id: string;
  role: LoopMessageRole;
  type: LoopMessageType;
  text: string;                         // 主文本（对话气泡内容）
  timestamp: string;
  metadata?: LoopMessageMetadata;
}

export interface LoopMessageMetadata {
  // 计划卡片
  plan?: {
    summary: string;
    platforms: string[];
    keywords?: string[];
    tasks: { appName: string; artifactType: string }[];
  };
  // 草稿卡片
  draft?: {
    taskId: string;
    title: string;
    content: string;
    appName: string;
    artifactType: string;
  };
  // 发布卡片
  publish?: {
    taskId: string;
    title: string;
    content: string;
    platform?: string;
  };
  // 复盘卡片
  review?: {
    summary: string;
    effectivePoints: string[];
    ineffectivePoints: string[];
    dataHighlights: string[];
    nextSuggestion: string;
  };
  // 记忆卡片
  memories?: {
    id: string;
    content: string;
    category: string;
  }[];
  // 快捷操作
  actions?: QuickAction[];
  // 关联的 cycleId
  cycleId?: string;
  // 进度信息
  progressStage?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  variant: 'primary' | 'ghost' | 'danger';
  action: UserAction;
}

// ─── 用户动作（人 → AI）──────────────────────────────────────

export type UserActionType =
  | 'confirm'           // 确认（计划/草稿/记忆）
  | 'reject'            // 退回（附带修改意见）
  | 'modify'            // 修改指令（自由文本）
  | 'approve_all'       // 全部确认
  | 'skip'              // 跳过
  | 'mark_published'    // 标记已发布
  | 'submit_feedback'   // 提交反馈数据
  | 'start_loop'        // 启动闭环
  | 'free_text';        // 自由文本（AI 自行判断意图）

export interface UserAction {
  type: UserActionType;
  payload?: {
    goal?: string;                      // start_loop
    taskId?: string;                    // 针对具体任务
    note?: string;                      // reject / modify
    platform?: string;                  // mark_published
    feedback?: {                        // submit_feedback
      views?: number;
      likes?: number;
      favorites?: number;
      comments?: number;
      rating?: 'good' | 'ok' | 'bad';
      note?: string;
    };
    text?: string;                      // free_text
    memoryIds?: string[];               // confirm memories
  };
}

// ─── 对话会话 ────────────────────────────────────────────────

export interface LoopChatSession {
  id: string;
  loopConfigId: string;
  cycleId: string | null;
  messages: LoopMessage[];
  status: 'idle' | 'running' | 'waiting_human' | 'complete';
}
