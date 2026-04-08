/**
 * Afterchain Worker
 *
 * Hono-based Cloudflare Worker.
 * - POST /api/parse-will  — proxies plain-English will text to Azure OpenAI
 * - GET  /api/health      — health check
 * - Scheduled cron       — liveness monitor (checks heartbeats, triggers executeWill)
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ScheduledEvent, ExecutionContext, Fetcher } from '@cloudflare/workers-types';

// Define Env interface matching wrangler.jsonc
interface Env {
  ASSETS: Fetcher;
  REGISTRY_ADDRESS: string;
  VITE_ETHERLINK_RPC: string;
  AZURE_OPENAI_KEY?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// CORS — allow same-origin preview and any deployed frontend
// ============================================================================
app.use('/api/*', cors());

// ============================================================================
// Health check
// ============================================================================
app.get('/api/health', (c) => c.json({ ok: true, timestamp: Date.now() }));

// ============================================================================
// POST /api/parse-will
// Body: { input: string }
// Returns: ParsedWill JSON from Azure OpenAI
// ============================================================================
app.post('/api/parse-will', async (c) => {
  let body: { input?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } }, 400);
  }

  const userInput = body.input?.trim();
  if (!userInput) {
    return c.json({ ok: false, error: { code: 'MISSING_INPUT', message: 'input field is required' } }, 400);
  }

  const key = c.env.AZURE_OPENAI_KEY;
  const endpoint = c.env.AZURE_OPENAI_ENDPOINT;
  const deployment = c.env.AZURE_OPENAI_DEPLOYMENT;

  if (!key || !endpoint || !deployment) {
    return c.json(
      { ok: false, error: { code: 'CONFIG_ERROR', message: 'Azure OpenAI credentials not configured' } },
      500
    );
  }

  const azureUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-12-01-preview`;

  const systemPrompt = `You are a will parsing agent for Afterchain, an onchain estate protocol.
Extract beneficiaries, wallet addresses, percentages, and any conditions from the user's plain English input.
Return ONLY valid JSON — no markdown, no preamble, no explanation.

Rules:
- Percentages MUST sum to exactly 100. If they do not, set valid=false and explain in the error field.
- wallet addresses must be valid Ethereum addresses (0x...). If an address is missing or invalid, set valid=false.
- heartbeatIntervalDays defaults to 30 if not specified.
- conditions is an array of plain-English strings describing any special conditions (e.g. "only if I am deceased").
- label is optional human-readable name for the beneficiary (e.g. "wife", "charity", "kids").

Response format (strict):
{
  "valid": true,
  "beneficiaries": [
    { "wallet": "0x...", "percentage": 40, "label": "wife" },
    { "wallet": "0x...", "percentage": 30, "label": "kids" },
    { "wallet": "0x...", "percentage": 30, "label": "charity" }
  ],
  "heartbeatIntervalDays": 30,
  "conditions": [],
  "error": null
}`;

  let azureRes: Response;
  try {
    azureRes = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (err) {
    return c.json(
      { ok: false, error: { code: 'UPSTREAM_ERROR', message: 'Failed to reach Azure OpenAI' } },
      502
    );
  }

  if (!azureRes.ok) {
    const errText = await azureRes.text().catch(() => 'unknown');
    return c.json(
      { ok: false, error: { code: 'AZURE_ERROR', message: `Azure OpenAI returned ${azureRes.status}: ${errText}` } },
      502
    );
  }

  let azureData: { choices?: Array<{ message?: { content?: string } }> };
  try {
    azureData = await azureRes.json() as typeof azureData;
  } catch {
    return c.json(
      { ok: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse Azure OpenAI response' } },
      502
    );
  }

  const content = azureData.choices?.[0]?.message?.content;
  if (!content) {
    return c.json(
      { ok: false, error: { code: 'EMPTY_RESPONSE', message: 'Azure OpenAI returned no content' } },
      502
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return c.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'AI returned malformed JSON' } },
      502
    );
  }

  return c.json({ ok: true, data: parsed });
});

// ============================================================================
// Static Asset Fallback — serves the React app (keep at the bottom)
// ============================================================================
app.get('*', async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw as any);
  const headers: Record<string, string> = {};
  for (const [key, value] of res.headers.entries()) {
    headers[key] = value;
  }
  return new Response(res.body as any, {
    status: res.status,
    headers,
  });
});

// ============================================================================
// Scheduled Cron — Liveness Monitor
// Runs daily: checks all registered wills, triggers executeWill on expired ones
// ============================================================================
async function runLivenessMonitor(env: Env): Promise<void> {
  const rpc = env.VITE_ETHERLINK_RPC || 'https://node.ghostnet.etherlink.com';

  // Helper: eth_call via JSON-RPC
  const ethCall = async (to: string, data: string): Promise<string> => {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to, data }, 'latest'],
        id: 1,
      }),
    });
    const json = await res.json() as { result?: string; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result ?? '0x';
  };

  // Registry address — pulled from environment variable set in wrangler.jsonc
  const REGISTRY = env.REGISTRY_ADDRESS || '';
  if (!REGISTRY || REGISTRY === '0x0000000000000000000000000000000000000000') {
    console.log('[Afterchain Cron] Registry not deployed yet — skipping liveness check');
    return;
  }

  // getAllWills() selector: keccak256("getAllWills()") = 0x4b4e7c62
  let allWillsHex: string;
  try {
    allWillsHex = await ethCall(REGISTRY, '0x4b4e7c62');
  } catch (err) {
    console.error('[Afterchain Cron] Failed to fetch all wills:', err);
    return;
  }

  // Decode address array from ABI-encoded response
  // Skip offset (32 bytes) + length (32 bytes), then read 20-byte addresses
  const raw = allWillsHex.replace('0x', '');
  if (raw.length < 128) {
    console.log('[Afterchain Cron] No wills registered yet');
    return;
  }

  const count = parseInt(raw.slice(64, 128), 16);
  const wills: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = 128 + i * 64 + 24; // skip zero-padding
    wills.push('0x' + raw.slice(start, start + 40));
  }

  console.log(`[Afterchain Cron] Checking ${wills.length} will(s)...`);

  for (const willAddr of wills) {
    try {
      // getWillStatus() selector: keccak256("getWillStatus()") = 0x9b4a6b5e
      const statusHex = await ethCall(willAddr, '0x9b4a6b5e');
      const statusRaw = statusHex.replace('0x', '');

      // Returns: (bool executed, uint256 lastHeartbeat, uint256 daysRemaining)
      const executed = parseInt(statusRaw.slice(0, 64), 16) === 1;
      const lastHeartbeat = parseInt(statusRaw.slice(64, 128), 16);
      const daysRemaining = parseInt(statusRaw.slice(128, 192), 16);

      if (executed) {
        console.log(`[Afterchain Cron] ${willAddr} already executed — skipping`);
        continue;
      }

      if (daysRemaining === 0) {
        console.log(`[Afterchain Cron] ${willAddr} heartbeat expired (last: ${new Date(lastHeartbeat * 1000).toISOString()}) — triggering executeWill`);
        // Note: actual execution requires a funded signer. Log the intent here.
        // In production, use a Cloudflare Worker with a private key or a relayer service.
        console.log(`[Afterchain Cron] ACTION REQUIRED: call executeWill() on ${willAddr}`);
      } else {
        console.log(`[Afterchain Cron] ${willAddr} healthy — ${daysRemaining} day(s) remaining`);
      }
    } catch (err) {
      console.error(`[Afterchain Cron] Error checking ${willAddr}:`, err);
    }
  }
}

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runLivenessMonitor(env);
  },
};