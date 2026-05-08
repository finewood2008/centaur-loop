/**
 * Centaur Loop Engine — 自动复盘器
 */

import { getClientAsync, extractModelText } from '../adapters/ai-client';
import type { MemoryCategory } from '../adapters/memory';
import type {
  CentaurLoopConfig,
  LoopCycle,
  LoopCycleReview,
  LoopReviewContext,
  LoopReviewResult,
  MemoryCandidate,
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

const VALID_CATEGORIES = new Set<string>(['preference', 'fact', 'lesson', 'correction']);

function normalizeCategory(raw: unknown): MemoryCategory {
  const str = String(raw ?? 'lesson').toLowerCase();
  if (VALID_CATEGORIES.has(str)) return str as MemoryCategory;
  return 'lesson';
}

function buildReviewPrompt(
  cycle: LoopCycle,
  config: CentaurLoopConfig,
  context: LoopReviewContext,
): string {
  const taskSummaries = cycle.tasks.map((task, i) => {
    const fb = task.feedback;
    const metricsStr = fb?.metrics
      ? Object.entries(fb.metrics)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      : '无数据';
    return `任务 ${i + 1}：${task.appName}（${task.artifactType}）
  标题：${task.draft?.title ?? '未生成'}
  数据：${metricsStr}
  评价：${fb?.rating ?? '未评价'}`;
  }).join('\n\n');

  return [
    context.outputLanguage ? `Output language instruction: ${context.outputLanguage}` : '',
    'Return JSON only. Do not wrap it in markdown.',
    '你是 Centaur Loop Engine 的闭环复盘引擎。',
    `闭环名称：${config.name}`,
    `本轮目标：${cycle.goal}`,
    `计划摘要：${cycle.plan?.summary ?? '无'}`,
    '',
    '本轮产出与反馈：',
    taskSummaries,
    '',
    context.memories.length > 0 ? `已有记忆：\n${context.memories.join('\n')}` : '',
    '',
    '请输出 JSON：',
    '{ "summary": "...", "effectivePoints": [...], "ineffectivePoints": [...], "dataHighlights": [...], "memoryCandidates": [{ "content": "...", "category": "lesson" }], "nextSuggestion": "..." }',
  ].filter(Boolean).join('\n');
}

export async function reviewCycle(
  cycle: LoopCycle,
  config: CentaurLoopConfig,
  context: LoopReviewContext,
): Promise<LoopReviewResult> {
  const client = await getClientAsync();
  const prompt = buildReviewPrompt(cycle, config, context);

  let raw: unknown;
  try {
    raw = await client.models.invoke({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`闭环复盘失败：${message}`);
  }

  const text = extractModelText(raw);
  if (!text) throw new Error('模型未返回文本');

  const parsed = extractJsonObject(text);
  if (!parsed) throw new Error('模型返回的不是有效 JSON');

  const review: LoopCycleReview = {
    summary: String(parsed.summary ?? '本轮复盘完成'),
    effectivePoints: Array.isArray(parsed.effectivePoints)
      ? (parsed.effectivePoints as unknown[]).map(String) : [],
    ineffectivePoints: Array.isArray(parsed.ineffectivePoints)
      ? (parsed.ineffectivePoints as unknown[]).map(String) : [],
    dataHighlights: Array.isArray(parsed.dataHighlights)
      ? (parsed.dataHighlights as unknown[]).map(String) : [],
  };

  const rawCandidates = Array.isArray(parsed.memoryCandidates)
    ? (parsed.memoryCandidates as unknown[]) : [];

  const memoryCandidates: MemoryCandidate[] = rawCandidates.map((raw, index) => {
    const c = raw as Record<string, unknown>;
    return {
      id: `${cycle.id}-mem-${index}-${Date.now().toString(36)}`,
      cycleId: cycle.id,
      content: String(c.content ?? ''),
      category: normalizeCategory(c.category),
      source: `来自第${cycle.cycleNumber}轮 ${config.name} 复盘`,
      status: 'pending' as const,
    };
  }).filter((c) => c.content.trim().length > 0);

  const nextSuggestion = String(parsed.nextSuggestion ?? '');
  return { review, memoryCandidates, nextSuggestion };
}
