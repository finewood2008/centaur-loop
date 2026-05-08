import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function readRequestBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res: import('http').ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

type RuntimeEnv = Record<string, string>;

function getModelConfig(env: RuntimeEnv) {
  const apiKey = (env.CENTAUR_MODEL_API_KEY || process.env.CENTAUR_MODEL_API_KEY || '').trim();
  const baseUrl = (env.CENTAUR_MODEL_BASE_URL || process.env.CENTAUR_MODEL_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/$/, '');
  const model = (env.CENTAUR_MODEL_NAME || process.env.CENTAUR_MODEL_NAME || 'gpt-4o-mini').trim();
  return { apiKey, baseUrl, model };
}

interface RuntimeConnector {
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

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = 900,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: unknown | null; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let data: unknown | null = null;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    return { ok: response.ok, status: response.status, data, error: response.ok ? undefined : text };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Connection failed.' };
  } finally {
    clearTimeout(timer);
  }
}

function extractOpenAIModelIds(data: unknown): string[] {
  const records = Array.isArray((data as { data?: unknown[] } | null)?.data)
    ? (data as { data: Array<{ id?: string }> }).data
    : [];
  return records.map((item) => item.id).filter(Boolean) as string[];
}

function pickModel(preferred: string, models: string[], fallback: string): string {
  if (preferred && models.includes(preferred)) return preferred;
  return models[0] ?? preferred ?? fallback;
}

async function scanOpenAICompatibleRuntime(params: {
  id: string;
  label: string;
  endpoint: string;
  provider?: string;
  preferredModel: string;
  apiKey?: string;
  configured: boolean;
  unavailableMessage: string;
  detectedMessage: (modelCount: number) => string;
}): Promise<RuntimeConnector> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (params.apiKey) headers.authorization = `Bearer ${params.apiKey}`;

  if (!params.configured) {
    return {
      id: params.id,
      label: params.label,
      provider: params.provider ?? 'openai-compatible',
      endpoint: params.endpoint,
      model: params.preferredModel,
      models: [],
      configured: false,
      available: false,
      kind: 'openai-compatible',
      message: params.unavailableMessage,
    };
  }

  const response = await fetchJsonWithTimeout(`${params.endpoint}/models`, 1200, { headers });
  const models = response.ok ? extractOpenAIModelIds(response.data) : [];
  const model = pickModel(params.preferredModel, models, params.preferredModel || 'local-model');

  return {
    id: params.id,
    label: params.label,
    provider: params.provider ?? 'openai-compatible',
    endpoint: params.endpoint,
    model,
    models,
    configured: true,
    available: response.ok,
    kind: 'openai-compatible',
    message: response.ok
      ? params.detectedMessage(models.length)
      : response.status === 401 || response.status === 403
        ? 'Runtime responded, but authentication failed. Check the API key.'
        : params.unavailableMessage,
  };
}

async function scanRuntimeConnectors(env: RuntimeEnv): Promise<RuntimeConnector[]> {
  const config = getModelConfig(env);
  const connectors: RuntimeConnector[] = [
    {
      id: 'local-demo',
      label: 'Local demo runtime',
      provider: 'local-demo',
      model: 'demo',
      models: ['demo'],
      configured: true,
      available: true,
      kind: 'demo',
      message: 'Built-in deterministic demo runtime. No API key required.',
    },
  ];

  connectors.push(await scanOpenAICompatibleRuntime({
    id: 'openai-compatible-env',
    label: 'OpenAI-compatible env',
    provider: 'openai-compatible',
    endpoint: config.baseUrl,
    preferredModel: config.model,
    apiKey: config.apiKey,
    configured: Boolean(config.apiKey),
    unavailableMessage: config.apiKey
      ? `Could not reach ${config.baseUrl}/models. The runtime is configured but not connected.`
      : 'Set CENTAUR_MODEL_API_KEY in .env.local to enable this runtime.',
    detectedMessage: (count) => `Connected through CENTAUR_MODEL_* environment variables. ${count || 1} model(s) visible.`,
  }));

  const ollama = await fetchJsonWithTimeout('http://127.0.0.1:11434/api/tags');
  const ollamaModels = ollama.ok && Array.isArray((ollama.data as { models?: unknown[] } | null)?.models)
    ? (ollama.data as { models: Array<{ name?: string }> }).models
    : [];
  const ollamaModel = ollamaModels[0]?.name ?? 'llama3.2';
  connectors.push({
    id: 'ollama-local',
    label: 'Ollama local',
    provider: 'ollama',
    endpoint: 'http://127.0.0.1:11434',
    model: ollamaModel,
    models: ollamaModels.map((item) => item.name).filter(Boolean) as string[],
    configured: ollama.ok,
    available: ollama.ok,
    kind: 'ollama',
    message: ollama.ok
      ? `Detected Ollama with ${ollamaModels.length || 1} model(s).`
      : 'Ollama was not detected at 127.0.0.1:11434.',
  });

  connectors.push(await scanOpenAICompatibleRuntime({
    id: 'lm-studio-local',
    label: 'LM Studio local server',
    provider: 'openai-compatible',
    endpoint: 'http://127.0.0.1:1234/v1',
    preferredModel: 'local-model',
    configured: true,
    unavailableMessage: 'LM Studio OpenAI-compatible server was not detected at 127.0.0.1:1234.',
    detectedMessage: (count) => `Detected LM Studio with ${count || 1} model(s).`,
  }));

  connectors.push(await scanOpenAICompatibleRuntime({
    id: 'vllm-local',
    label: 'vLLM local server',
    provider: 'openai-compatible',
    endpoint: 'http://127.0.0.1:8000/v1',
    preferredModel: 'local-model',
    configured: true,
    unavailableMessage: 'vLLM OpenAI-compatible server was not detected at 127.0.0.1:8000.',
    detectedMessage: (count) => `Detected vLLM with ${count || 1} model(s).`,
  }));

  connectors.push(await scanOpenAICompatibleRuntime({
    id: 'llamacpp-local',
    label: 'llama.cpp local server',
    provider: 'openai-compatible',
    endpoint: 'http://127.0.0.1:8080/v1',
    preferredModel: 'local-model',
    configured: true,
    unavailableMessage: 'llama.cpp OpenAI-compatible server was not detected at 127.0.0.1:8080.',
    detectedMessage: (count) => `Detected llama.cpp server with ${count || 1} model(s).`,
  }));

  connectors.push(
    {
      id: 'langgraph-planned',
      label: 'LangGraph',
      provider: 'langgraph',
      model: 'adapter planned',
      configured: false,
      available: false,
      kind: 'planned',
      message: 'Adapter planned. Not implemented in this MVP.',
    },
    {
      id: 'temporal-planned',
      label: 'Temporal',
      provider: 'temporal',
      model: 'adapter planned',
      configured: false,
      available: false,
      kind: 'planned',
      message: 'Adapter planned. Not implemented in this MVP.',
    },
    {
      id: 'n8n-planned',
      label: 'n8n',
      provider: 'n8n',
      model: 'adapter planned',
      configured: false,
      available: false,
      kind: 'planned',
      message: 'Adapter planned. Not implemented in this MVP.',
    },
  );

  return connectors;
}

function chooseDefaultRuntime(connectors: RuntimeConnector[]): RuntimeConnector {
  return connectors.find((connector) => connector.id === 'openai-compatible-env' && connector.available)
    ?? connectors.find((connector) => connector.id === 'ollama-local' && connector.available)
    ?? connectors.find((connector) => connector.id === 'lm-studio-local' && connector.available)
    ?? connectors.find((connector) => connector.kind !== 'demo' && connector.available)
    ?? connectors[0];
}

function connectorStatus(connector: RuntimeConnector) {
  return {
    mode: connector.kind === 'demo' ? 'demo' : 'real',
    provider: connector.provider,
    model: connector.model,
    configured: connector.configured,
    available: connector.available,
    message: connector.message,
    selectedRuntimeId: connector.id,
  };
}

async function verifyRuntimeConnector(connector: RuntimeConnector, env: RuntimeEnv): Promise<RuntimeConnector> {
  if (connector.kind === 'demo') return connector;
  if (!connector.available) return connector;

  if (connector.kind === 'ollama') {
    const response = await fetchJsonWithTimeout(`${connector.endpoint}/api/tags`, 1200);
    return {
      ...connector,
      available: response.ok,
      configured: response.ok,
      message: response.ok
        ? `Connected to Ollama model ${connector.model}.`
        : 'Ollama is no longer reachable.',
    };
  }

  if (connector.kind === 'openai-compatible') {
    const config = getModelConfig(env);
    const headers: Record<string, string> = { accept: 'application/json' };
    if (connector.id === 'openai-compatible-env' && config.apiKey) {
      headers.authorization = `Bearer ${config.apiKey}`;
    }
    const response = await fetchJsonWithTimeout(`${connector.endpoint}/models`, 1200, { headers });
    const models = response.ok ? extractOpenAIModelIds(response.data) : [];
    return {
      ...connector,
      available: response.ok,
      configured: response.ok,
      models,
      model: pickModel(connector.model, models, connector.model),
      message: response.ok
        ? `Connected to ${connector.label}. ${models.length || 1} model(s) visible.`
        : response.status === 401 || response.status === 403
          ? 'Runtime responded, but authentication failed. Check the API key.'
          : `${connector.label} is no longer reachable.`,
    };
  }

  return connector;
}

function centaurRuntimeApiPlugin(env: RuntimeEnv): Plugin {
  return {
    name: 'centaur-runtime-api',
    configureServer(server) {
      server.middlewares.use('/api/runtime/scan', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        const connectors = await scanRuntimeConnectors(env);
        sendJson(res, 200, { connectors, selectedRuntimeId: chooseDefaultRuntime(connectors).id });
      });

      server.middlewares.use('/api/runtime/status', (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        void scanRuntimeConnectors(env).then((connectors) => {
          const selected = chooseDefaultRuntime(connectors);
          sendJson(res, 200, connectorStatus(selected));
        });
      });

      server.middlewares.use('/api/runtime/connect', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readRequestBody(req);
          const parsed = JSON.parse(body || '{}') as { runtimeId?: string };
          const connectors = await scanRuntimeConnectors(env);
          const selected = connectors.find((connector) => connector.id === parsed.runtimeId);
          if (!selected) {
            sendJson(res, 404, { error: 'Runtime not found.' });
            return;
          }

          const verified = await verifyRuntimeConnector(selected, env);
          if (!verified.available) {
            sendJson(res, 409, { connector: verified, status: connectorStatus(verified) });
            return;
          }

          sendJson(res, 200, { connector: verified, status: connectorStatus(verified) });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sendJson(res, 500, { error: message });
        }
      });

      server.middlewares.use('/api/model', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readRequestBody(req);
          const parsed = JSON.parse(body || '{}') as { prompt?: string; runtimeId?: string };
          const prompt = parsed.prompt?.trim();
          if (!prompt) {
            sendJson(res, 400, { error: 'Missing prompt.' });
            return;
          }

          const connectors = await scanRuntimeConnectors(env);
          const selected = connectors.find((connector) => connector.id === parsed.runtimeId)
            ?? chooseDefaultRuntime(connectors);

          if (!selected.available || selected.kind === 'demo') {
            sendJson(res, 503, { error: `${selected.label} is not available for model execution.` });
            return;
          }
          if (selected.kind === 'planned') {
            sendJson(res, 501, { error: `${selected.label} adapter is planned, but not implemented in this MVP.` });
            return;
          }

          if (selected.kind === 'ollama') {
            const upstream = await fetch(`${selected.endpoint}/api/chat`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                model: selected.model,
                messages: [{ role: 'user', content: prompt }],
                stream: false,
              }),
            });

            if (!upstream.ok) {
              const text = await upstream.text();
              sendJson(res, upstream.status, { error: text || 'Ollama request failed.' });
              return;
            }

            const payload = await upstream.json() as { message?: { content?: string }, response?: string };
            sendJson(res, 200, {
              text: payload.message?.content ?? payload.response ?? '',
              provider: selected.provider,
              model: selected.model,
              runtimeId: selected.id,
            });
            return;
          }

          const config = getModelConfig(env);
          const baseUrl = selected.id === 'openai-compatible-env'
            ? config.baseUrl
            : selected.endpoint ?? '';
          const apiKey = selected.id === 'openai-compatible-env'
            ? config.apiKey
            : '';
          const model = selected.id === 'openai-compatible-env'
            ? config.model
            : selected.model;

          if (!baseUrl) {
            sendJson(res, 503, { error: 'Selected runtime has no endpoint.' });
            return;
          }

          const headers: Record<string, string> = { 'content-type': 'application/json' };
          if (apiKey) headers.authorization = `Bearer ${apiKey}`;

          const upstream = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text();
            sendJson(res, upstream.status, { error: text || 'Model request failed.' });
            return;
          }

          const payload = await upstream.json() as {
            choices?: Array<{ message?: { content?: string }, text?: string }>;
          };
          const text = payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text ?? '';
          sendJson(res, 200, {
            text,
            provider: selected.provider,
            model,
            runtimeId: selected.id,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sendJson(res, 500, { error: message });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), centaurRuntimeApiPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5180,
    },
  };
});
