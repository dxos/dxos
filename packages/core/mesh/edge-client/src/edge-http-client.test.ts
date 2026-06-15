//
// Copyright 2025 DXOS.org
//

import { afterEach, describe, it, test, vi } from 'vitest';

import { createEphemeralEdgeIdentity } from './auth';
import { EdgeHttpClient } from './edge-http-client';

// TODO(burdon): Factor out config.
const DEV_SERVER = 'https://edge.dxos.workers.dev';

describe.skipIf(process.env.CI)('EdgeHttpClient', () => {
  it.skip('should get status', async ({ expect }) => {
    const client = new EdgeHttpClient(DEV_SERVER);
    const identity = await createEphemeralEdgeIdentity();
    client.setIdentity(identity);

    const { Context } = await import('@dxos/context');
    const result = await client.getStatus(Context.default());
    expect(result).toBeDefined();
  });
});

describe('EdgeHttpClient.anthropicAiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('re-bases the request path onto the EDGE /ai/generate/anthropic route', async ({ expect }) => {
    const fetchMock = vi.fn(async (input: any, _init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      // `/auth` preflight: respond non-401 so no auth header is attached.
      if (url.endsWith('/auth')) {
        return new Response(null, { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    const response = await client.anthropicAiRequest(
      new Request('http://edge/v1/messages?beta=true', {
        method: 'POST',
        body: JSON.stringify({ model: 'claude' }),
      }),
    );

    expect(response.status).toBe(200);

    const targetCall = fetchMock.mock.calls.find((call) => !String(call[0]).endsWith('/auth'));
    expect(targetCall).toBeDefined();
    expect(String(targetCall![0])).toBe('https://edge.example.com/ai/generate/anthropic/v1/messages?beta=true');
    expect(targetCall![1]?.method).toBe('POST');
  });
});
