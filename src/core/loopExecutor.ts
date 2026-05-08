/**
 * Centaur Loop Engine — 任务执行器
 */

import { getClientAsync, extractModelText } from '../adapters/ai-client';
import { findTool } from '../adapters/tool-registry';
import type { LoopExecuteContext, LoopTask, LoopTaskDraft } from './types';

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

function extractTitle(text: string, appName: string): string {
  const firstLine = text.split('\n').find((l) => l.trim().length > 0);
  if (firstLine) {
    const cleaned = firstLine.replace(/^#+\s*/, '').replace(/^\*+\s*/, '').trim();
    if (cleaned.length > 0 && cleaned.length < 80) return cleaned;
  }
  return `${appName} · 草稿`;
}

function formatInputs(tool: { inputSchema: { id: string; label: string }[] }, input: Record<string, string>): string {
  return tool.inputSchema
    .map((field) => {
      const value = input[field.id]?.trim();
      return `${field.label}：${value || '未填写'}`;
    })
    .join('\n');
}

export async function executeTask(
  task: LoopTask,
  context: LoopExecuteContext,
): Promise<LoopTaskDraft> {
  const tool = findTool(task.appToolId);

  const client = await getClientAsync();

  const prompt = [
    '你是 Centaur Loop Engine 的内容生成引擎。',
    `应用名称：${task.appName}`,
    tool ? `应用说明：${tool.description}` : '',
    context.ownerContext ? `老板偏好：\n${context.ownerContext}` : '',
    context.businessContext ? `企业资料摘要：\n${context.businessContext}` : '',
    context.memories.length > 0 ? `已有记忆：\n${context.memories.join('\n')}` : '',
    tool ? `用户输入：\n${formatInputs(tool, task.inputParams)}` : `用户输入：\n${JSON.stringify(task.inputParams)}`,
    tool ? `输出要求：${tool.outputInstruction}` : '请生成可直接使用的内容。',
  ].filter(Boolean).join('\n\n');

  let raw: unknown;
  try {
    raw = await client.models.invoke({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`内容生成失败：${message}`);
  }

  const content = extractModelText(raw);
  if (!content) throw new Error('模型未返回文本');

  const title = extractTitle(content, task.appName);

  return {
    title,
    content,
    preview: truncate(content, 200),
    generatedAt: new Date().toISOString(),
  };
}
