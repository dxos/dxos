//
// Copyright 2026 DXOS.org
//

/**
 * The provider proxy: the browser holds no key.
 *
 * `AnthropicClient.layerConfig({ apiUrl })` points at a URL rather than a provider — EDGE's AI
 * service is one such URL — so this route stands in for it, adding the key the page cannot have.
 * The path mirrors EDGE's (`/provider/anthropic/...`) so the client config differs only in origin.
 */

const ANTHROPIC_API = 'https://api.anthropic.com';

/** Headers a browser sends that the provider must not see, and the ones it must. */
const FORWARDED = ['content-type', 'accept', 'anthropic-version', 'anthropic-beta'];

export type AiEnv = {
  /** `wrangler secret put ANTHROPIC_API_KEY`; absent on a deployment that does not want the assistant. */
  readonly ANTHROPIC_API_KEY?: string;
};

/**
 * Forwards one request to Anthropic, streaming the response back untouched.
 *
 * Nothing here inspects or stores the conversation: it is a key-bearing pipe, so a graph's messages
 * stay between the page and the provider.
 */
export const proxyToAnthropic = async (request: Request, env: AiEnv, path: string): Promise<Response> => {
  if (!env.ANTHROPIC_API_KEY) {
    // Said out loud rather than 404'd: a missing secret is a deployment that has not been given a
    // key, not a wrong URL, and the page shows this text.
    return new Response('The assistant is not configured: this deployment has no ANTHROPIC_API_KEY.', { status: 503 });
  }

  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  headers.set('x-api-key', env.ANTHROPIC_API_KEY);
  headers.set('anthropic-version', request.headers.get('anthropic-version') ?? '2023-06-01');

  const response = await fetch(`${ANTHROPIC_API}${path}`, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    // A streamed completion is the normal case, so the body is passed through rather than buffered.
    ...({ duplex: 'half' } as RequestInit),
  });

  return new Response(response.body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  });
};
