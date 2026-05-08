/**
 * Centaur Loop Engine — 反馈采集器
 */

import { getClientAsync, extractModelText } from '../adapters/ai-client';
import type { ContentFeedback, QuickFeedbackInput } from './types';

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

function generateFeedbackId(taskId: string): string {
  return `fb-${taskId}-${Date.now().toString(36)}`;
}

export function submitQuickFeedback(
  taskId: string,
  _cycleId: string,
  data: QuickFeedbackInput,
): ContentFeedback {
  return {
    id: generateFeedbackId(taskId),
    taskId,
    source: 'quick_form',
    published: data.published,
    platform: data.platform,
    metrics: {
      views: data.views,
      likes: data.likes,
      favorites: data.favorites,
      comments: data.comments,
      shares: data.shares,
      completionRate: data.completionRate,
      followers: data.followers,
    },
    rating: data.rating,
    ownerNote: data.ownerNote,
  };
}

export async function processScreenshotFeedback(
  taskId: string,
  _cycleId: string,
  imageBase64: string,
): Promise<ContentFeedback> {
  const client = await getClientAsync();

  const prompt = [
    '这是一张社交媒体/内容平台的数据截图。',
    '请识别平台类型和数字指标。',
    '输出 JSON：{ "platform": "...", "metrics": { "views": 数字或null, "likes": 数字或null, "favorites": 数字或null, "comments": 数字或null, "shares": 数字或null } }',
    '截图描述：' + imageBase64.slice(0, 200),
  ].join('\n');

  let raw: unknown;
  try {
    raw = await client.models.invoke({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`截图识别失败：${message}`);
  }

  const text = extractModelText(raw);
  if (!text) throw new Error('模型未返回文本');

  const parsed = extractJsonObject(text);
  const metrics = parsed?.metrics as Record<string, unknown> | undefined;

  return {
    id: generateFeedbackId(taskId),
    taskId,
    source: 'screenshot_ocr',
    published: true,
    platform: parsed ? String(parsed.platform ?? '') : undefined,
    metrics: metrics ? {
      views: typeof metrics.views === 'number' ? metrics.views : undefined,
      likes: typeof metrics.likes === 'number' ? metrics.likes : undefined,
      favorites: typeof metrics.favorites === 'number' ? metrics.favorites : undefined,
      comments: typeof metrics.comments === 'number' ? metrics.comments : undefined,
      shares: typeof metrics.shares === 'number' ? metrics.shares : undefined,
    } : undefined,
    rawScreenshot: imageBase64,
  };
}
