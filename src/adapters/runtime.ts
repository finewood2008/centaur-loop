export type RuntimeMode = 'real' | 'demo';

export interface RuntimeStatus {
  mode: RuntimeMode;
  provider: string;
  model: string;
  configured: boolean;
  available: boolean;
  message: string;
}

export const RUNTIME_CONNECTORS = [
  { id: 'local-demo', label: 'Local demo', status: 'available' },
  { id: 'openai-compatible', label: 'OpenAI-compatible', status: 'available' },
  { id: 'langgraph', label: 'LangGraph', status: 'planned' },
  { id: 'temporal', label: 'Temporal', status: 'planned' },
  { id: 'inngest', label: 'Inngest', status: 'planned' },
  { id: 'n8n', label: 'n8n', status: 'planned' },
] as const;

const DEMO_STATUS: RuntimeStatus = {
  mode: 'demo',
  provider: 'local-demo',
  model: 'demo',
  configured: false,
  available: true,
  message: 'Demo runtime is active.',
};

export async function fetchRuntimeStatus(): Promise<RuntimeStatus> {
  try {
    const response = await fetch('/api/runtime/status', { headers: { accept: 'application/json' } });
    if (!response.ok) return DEMO_STATUS;
    const status = await response.json() as RuntimeStatus;
    return { ...DEMO_STATUS, ...status };
  } catch {
    return DEMO_STATUS;
  }
}

export async function invokeRuntimeModel(prompt: string): Promise<{ text: string; provider: string; model: string }> {
  const response = await fetch('/api/model', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Runtime request failed: ${response.status}`);
  }

  const payload = await response.json() as { text?: string; provider?: string; model?: string };
  if (!payload.text?.trim()) throw new Error('Runtime returned no text.');
  return {
    text: payload.text.trim(),
    provider: payload.provider ?? 'openai-compatible',
    model: payload.model ?? 'unknown',
  };
}

