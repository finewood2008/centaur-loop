/**
 * Centaur Loop Engine — 循环规划器
 */

import { getClientAsync, extractModelText } from '../adapters/ai-client';
import { findTool, TOOL_CATALOG } from '../adapters/tool-registry';
import type {
  CentaurLoopConfig,
  LoopCyclePlan,
  LoopPlanContext,
  LoopPlanResult,
  LoopTask,
} from './types';

function extractJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch { /* fall through */ }

  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch { /* fall through */ }
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch { /* fall through */ }
  }

  return null;
}

function buildPlanPrompt(
  config: CentaurLoopConfig,
  goal: string,
  context: LoopPlanContext,
): string {
  const availableApps: string[] = [];
  for (const phase of config.aiWorkPhases) {
    for (const toolId of phase.appToolIds) {
      const tool = findTool(toolId);
      if (tool) {
        const fields = tool.inputSchema
          .map((f) => `  - ${f.id}（${f.label}${f.required ? '，必填' : ''}）`)
          .join('\n');
        availableApps.push(
          `工具 toolId="${tool.id}" 名称="${tool.name}"\n输入字段：\n${fields}`,
        );
      }
    }
  }

  return [
    context.outputLanguage ? `Output language instruction: ${context.outputLanguage}` : '',
    'Return JSON only. Do not wrap it in markdown.',
    `你是 Centaur Loop Engine 的「${config.name}」闭环规划器。`,
    `闭环定义：${config.description}`,
    `周期：${config.cyclePeriod === 'daily' ? '每天' : config.cyclePeriod === 'weekly' ? '每周' : '每两周'}`,
    '',
    '可调用的 AI 应用：',
    availableApps.length > 0 ? availableApps.join('\n\n') : '（用 prompt 直接生成）',
    '',
    `老板目标：${goal}`,
    context.ownerContext ? `老板偏好：\n${context.ownerContext}` : '',
    context.businessContext ? `企业资料摘要：\n${context.businessContext}` : '',
    context.memories.length > 0 ? `已有记忆：\n${context.memories.join('\n')}` : '',
    context.previousSuggestion ? `上轮复盘建议：${context.previousSuggestion}` : '',
    '',
    '请输出 JSON：',
    '{ "summary": "...", "platforms": [...], "keywords": [...], "tasks": [{ "appToolId": "...", "appName": "...", "artifactType": "...", "inputParams": {...} }] }',
  ].filter(Boolean).join('\n');
}

const VALID_ARTIFACT_TYPES = new Set([
  'article', 'social_post', 'video_script',
  'seo_article', 'geo_content', 'content_plan', 'review_report',
]);

function normalizeTasks(rawTasks: unknown[], configId: string): LoopTask[] {
  const now = Date.now();
  return rawTasks.map((raw, index) => {
    const t = raw as Record<string, unknown>;
    const appToolId = String(t.appToolId ?? '');
    const appName = String(t.appName ?? appToolId);
    const artifactType = VALID_ARTIFACT_TYPES.has(String(t.artifactType ?? ''))
      ? (String(t.artifactType) as LoopTask['artifactType'])
      : 'article';

    const rawParams = (t.inputParams && typeof t.inputParams === 'object')
      ? t.inputParams as Record<string, unknown>
      : {};
    const inputParams: Record<string, string> = {};
    const tool = findTool(appToolId);
    if (tool) {
      const validKeys = new Set(tool.inputSchema.map((f) => f.id));
      for (const [key, value] of Object.entries(rawParams)) {
        if (validKeys.has(key)) inputParams[key] = String(value ?? '');
      }
    } else {
      for (const [key, value] of Object.entries(rawParams)) {
        inputParams[key] = String(value ?? '');
      }
    }

    return {
      id: `${configId}-task-${index}-${now.toString(36)}`,
      cycleId: '',
      appToolId,
      appName,
      artifactType,
      status: 'pending' as const,
      inputParams,
    };
  });
}

export async function planLoop(
  config: CentaurLoopConfig,
  goal: string,
  context: LoopPlanContext,
): Promise<LoopPlanResult> {
  const client = await getClientAsync();
  const prompt = buildPlanPrompt(config, goal, context);

  let raw: unknown;
  try {
    raw = await client.models.invoke({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`闭环规划失败：${message}`);
  }

  const text = extractModelText(raw);
  if (!text) throw new Error('模型未返回文本');

  const parsed = extractJsonObject(text);
  if (!parsed) throw new Error('模型返回的不是有效 JSON');

  const summary = String(parsed.summary ?? goal);
  const platforms = Array.isArray(parsed.platforms) ? (parsed.platforms as unknown[]).map(String) : [];
  const keywords = Array.isArray(parsed.keywords) ? (parsed.keywords as unknown[]).map(String) : undefined;
  const rawTasks = Array.isArray(parsed.tasks) ? (parsed.tasks as unknown[]) : [];
  const tasks = normalizeTasks(rawTasks, config.id);

  const plan: LoopCyclePlan = { summary, taskCount: tasks.length, platforms, keywords };
  return { plan, tasks };
}
