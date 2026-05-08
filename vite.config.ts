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
  configured: boolean;
  available: boolean;
  kind: 'demo' | 'openai-compatible' | 'ollama';
  message: string;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 700): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function scanRuntimeConnectors(env: RuntimeEnv): Promise<RuntimeConnector[]> {
  const config = getModelConfig(env);
  const connectors: RuntimeConnector[] = [
    {
      id: 'local-demo',
      label: 'Local demo runtime',
      provider: 'local-demo',
      model: 'demo',
      configured: true,
      available: true,
      kind: 'demo',
      message: 'Built-in deterministic demo runtime. No API key required.',
    },
    {
      id: 'openai-compatible-env',
      label: 'OpenAI-compatible env',
      provider: 'openai-compatible',
      endpoint: config.baseUrl,
      model: config.model,
      configured: Boolean(config.apiKey),
      available: Boolean(config.apiKey),
      kind: 'openai-compatible',
      message: config.apiKey
        ? 'Configured from CENTAUR_MODEL_* environment variables.'
        : 'Set CENTAUR_MODEL_API_KEY in .env.local to enable this runtime.',
    },
  ];

  const ollama = await fetchJsonWithTimeout('http://127.0.0.1:11434/api/tags');
  const ollamaModels = Array.isArray((ollama as { models?: unknown[] } | null)?.models)
    ? (ollama as { models: Array<{ name?: string }> }).models
    : [];
  const ollamaModel = ollamaModels[0]?.name ?? 'llama3.2';
  connectors.push({
    id: 'ollama-local',
    label: 'Ollama local',
    provider: 'ollama',
    endpoint: 'http://127.0.0.1:11434',
    model: ollamaModel,
    configured: Boolean(ollama),
    available: Boolean(ollama),
    kind: 'ollama',
    message: ollama
      ? `Detected Ollama with ${ollamaModels.length || 1} model(s).`
      : 'Ollama was not detected at 127.0.0.1:11434.',
  });

  const lmStudio = await fetchJsonWithTimeout('http://127.0.0.1:1234/v1/models');
  const lmModels = Array.isArray((lmStudio as { data?: unknown[] } | null)?.data)
    ? (lmStudio as { data: Array<{ id?: string }> }).data
    : [];
  connectors.push({
    id: 'lm-studio-local',
    label: 'LM Studio local server',
    provider: 'openai-compatible',
    endpoint: 'http://127.0.0.1:1234/v1',
    model: lmModels[0]?.id ?? 'local-model',
    configured: Boolean(lmStudio),
    available: Boolean(lmStudio),
    kind: 'openai-compatible',
    message: lmStudio
      ? `Detected LM Studio with ${lmModels.length || 1} model(s).`
      : 'LM Studio OpenAI-compatible server was not detected at 127.0.0.1:1234.',
  });

  connectors.push(
    {
      id: 'langgraph-planned',
      label: 'LangGraph',
      provider: 'langgraph',
      model: 'adapter planned',
      configured: false,
      available: false,
      kind: 'demo',
      message: 'Adapter planned. Not implemented in this MVP.',
    },
    {
      id: 'temporal-planned',
      label: 'Temporal',
      provider: 'temporal',
      model: 'adapter planned',
      configured: false,
      available: false,
      kind: 'demo',
      message: 'Adapter planned. Not implemented in this MVP.',
    },
    {
      id: 'n8n-planned',
      label: 'n8n',
      provider: 'n8n',
      model: 'adapter planned',
      configured: false,
      available: false,
      kind: 'demo',
      message: 'Adapter planned. Not implemented in this MVP.',
    },
  );

  return connectors;
}

function chooseDefaultRuntime(connectors: RuntimeConnector[]): RuntimeConnector {
  return connectors.find((connector) => connector.id === 'openai-compatible-env' && connector.available)
    ?? connectors.find((connector) => connector.id === 'ollama-local' && connector.available)
    ?? connectors.find((connector) => connector.id === 'lm-studio-local' && connector.available)
    ?? connectors[0];
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
          sendJson(res, 200, {
            mode: selected.kind === 'demo' ? 'demo' : 'real',
            provider: selected.provider,
            model: selected.model,
            configured: selected.configured,
            available: selected.available,
            message: selected.message,
            selectedRuntimeId: selected.id,
          });
        });
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
