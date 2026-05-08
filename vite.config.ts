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

function centaurRuntimeApiPlugin(env: RuntimeEnv): Plugin {
  return {
    name: 'centaur-runtime-api',
    configureServer(server) {
      server.middlewares.use('/api/runtime/status', (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        const config = getModelConfig(env);
        const configured = Boolean(config.apiKey);
        sendJson(res, 200, {
          mode: configured ? 'real' : 'demo',
          provider: configured ? 'openai-compatible' : 'local-demo',
          model: configured ? config.model : 'demo',
          configured,
          available: configured,
          message: configured
            ? 'OpenAI-compatible runtime is configured.'
            : 'No model key configured. Demo runtime will be used.',
        });
      });

      server.middlewares.use('/api/model', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        const config = getModelConfig(env);
        if (!config.apiKey) {
          sendJson(res, 503, { error: 'No model key configured.' });
          return;
        }

        try {
          const body = await readRequestBody(req);
          const parsed = JSON.parse(body || '{}') as { prompt?: string };
          const prompt = parsed.prompt?.trim();
          if (!prompt) {
            sendJson(res, 400, { error: 'Missing prompt.' });
            return;
          }

          const upstream = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${config.apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
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
            provider: 'openai-compatible',
            model: config.model,
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
