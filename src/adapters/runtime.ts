export type RuntimeMode = 'real' | 'demo';

export interface RuntimeStatus {
  mode: RuntimeMode;
  provider: string;
  model: string;
  configured: boolean;
  available: boolean;
  message: string;
  selectedRuntimeId?: string;
}

export interface RuntimeConnector {
  id: string;
  label: string;
  provider: string;
  endpoint?: string;
  model: string;
  models?: string[];
  configured: boolean;
  available: boolean;
  kind: 'demo' | 'openai-compatible' | 'ollama' | 'planned';
  message: string;
}

export interface RuntimeScanResult {
  connectors: RuntimeConnector[];
  selectedRuntimeId: string;
}

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

export async function scanRuntimeConnectors(): Promise<RuntimeScanResult> {
  try {
    const response = await fetch('/api/runtime/scan', { headers: { accept: 'application/json' } });
    if (!response.ok) {
      return {
        connectors: [{
          id: 'local-demo',
          label: 'Local demo runtime',
          provider: 'local-demo',
          model: 'demo',
          configured: true,
          available: true,
          kind: 'demo',
          message: 'Built-in deterministic demo runtime.',
        }],
        selectedRuntimeId: 'local-demo',
      };
    }
    return await response.json() as RuntimeScanResult;
  } catch {
    return {
      connectors: [{
        id: 'local-demo',
        label: 'Local demo runtime',
        provider: 'local-demo',
        model: 'demo',
        configured: true,
        available: true,
        kind: 'demo',
        message: 'Built-in deterministic demo runtime.',
      }],
      selectedRuntimeId: 'local-demo',
    };
  }
}

export async function connectRuntime(runtimeId: string): Promise<{ connector: RuntimeConnector; status: RuntimeStatus }> {
  const response = await fetch('/api/runtime/connect', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ runtimeId }),
  });
  const payload = await response.json().catch(() => null) as {
    connector?: RuntimeConnector;
    status?: RuntimeStatus;
    error?: string;
  } | null;

  if (!response.ok) {
    const message = payload?.status?.message ?? payload?.error ?? `Runtime connect failed: ${response.status}`;
    throw new Error(message);
  }
  if (!payload?.connector || !payload.status) {
    throw new Error('Runtime connect returned an invalid response.');
  }
  return { connector: payload.connector, status: payload.status };
}

function readSelectedRuntimeId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem('centaur_loop_runtime_id') ?? undefined;
}

export async function invokeRuntimeModel(prompt: string): Promise<{ text: string; provider: string; model: string; runtimeId?: string }> {
  const response = await fetch('/api/model', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ prompt, runtimeId: readSelectedRuntimeId() }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Runtime request failed: ${response.status}`);
  }

  const payload = await response.json() as { text?: string; provider?: string; model?: string; runtimeId?: string };
  if (!payload.text?.trim()) throw new Error('Runtime returned no text.');
  return {
    text: payload.text.trim(),
    provider: payload.provider ?? 'openai-compatible',
    model: payload.model ?? 'unknown',
    runtimeId: payload.runtimeId,
  };
}
