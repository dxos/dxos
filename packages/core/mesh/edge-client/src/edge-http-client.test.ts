//
// Copyright 2025 DXOS.org
//

import { afterEach, describe, it, test, vi } from 'vitest';

import { Context } from '@dxos/context';
import { type Presentation } from '@dxos/protocols/proto/dxos/halo/credentials';

import { createEphemeralEdgeIdentity } from './auth';
import { EdgeHttpClient } from './edge-http-client';
import { type EdgeIdentity } from './edge-identity';

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
      Context.default(),
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

  test('drops inherited traceparent and sets headers from ctx', async ({ expect }) => {
    const fetchMock = vi.fn(async (input: any, _init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      if (url.endsWith('/auth')) {
        return new Response(null, { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    // Effect's HttpClient stamps traceparent for fiber spans that are never exported;
    // it must not leak through to the edge request.
    await client.anthropicAiRequest(
      Context.default(),
      new Request('http://edge/v1/messages', {
        method: 'POST',
        headers: { traceparent: '00-11111111111111111111111111111111-2222222222222222-01' },
        body: JSON.stringify({ model: 'claude' }),
      }),
    );

    const targetCall = fetchMock.mock.calls.find((call) => !String(call[0]).endsWith('/auth'));
    expect(targetCall).toBeDefined();
    const headers = new Headers(targetCall![1]?.headers);
    expect(headers.get('traceparent')).toBeNull();
    expect(headers.get('tracestate')).toBeNull();
  });
});

describe('EdgeHttpClient blobs', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('getBlobUrl URL-encodes the key', ({ expect }) => {
    const client = new EdgeHttpClient('https://edge.example.com');
    expect(client.getBlobUrl('abc123').toString()).toBe('https://edge.example.com/api/file/abc123');
    expect(client.getBlobUrl('a/b/../c').toString()).toBe('https://edge.example.com/api/file/a%2Fb%2F..%2Fc');
  });

  test('putBlob sends a raw POST body and pre-fetches /auth', async ({ expect }) => {
    const fetchMock = vi.fn(async (input: any, _init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      if (url.endsWith('/auth')) {
        return new Response(null, { status: 200 });
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    const bytes = new Uint8Array([1, 2, 3]);
    await client.putBlob(Context.default(), 'abc123', bytes, { contentType: 'application/octet-stream' });

    const authCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/auth'));
    expect(authCall).toBeDefined();

    const putCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/api/file/abc123'));
    expect(putCall).toBeDefined();
    expect(String(putCall![0])).toBe('https://edge.example.com/api/file/abc123');
    expect(putCall![1]?.method).toBe('POST');
    expect(putCall![1]?.body).toBe(bytes);
    expect((putCall![1]?.headers as Record<string, string>)['Content-Type']).toBe('application/octet-stream');
  });

  test('putBlob retries with an auth header after a 401 challenge', async ({ expect }) => {
    const identity: EdgeIdentity = {
      peerKey: 'peer-key',
      identityDid: 'did:halo:test',
      presentCredentials: async (): Promise<Presentation> => ({}),
    };

    const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      if (url.endsWith('/auth')) {
        return new Response(null, { status: 200 });
      }
      const headers = init?.headers as Record<string, string> | undefined;
      if (!headers?.Authorization) {
        return new Response(null, {
          status: 401,
          headers: { 'WWW-Authenticate': 'VerifiablePresentation challenge=Y2hhbGxlbmdl' },
        });
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    client.setIdentity(identity);
    await client.putBlob(Context.default(), 'abc123', new Uint8Array([1, 2, 3]));

    const fileCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/api/file/abc123'));
    expect(fileCalls.length).toBe(2);
    expect((fileCalls[1][1]?.headers as Record<string, string>).Authorization).toMatch(/^VerifiablePresentation/);
  });

  test('getBlob returns bytes on success', async ({ expect }) => {
    const fetchMock = vi.fn(async (input: any) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      expect(url).toBe('https://edge.example.com/api/file/abc123');
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    const bytes = await client.getBlob(Context.default(), 'abc123');
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  test('getBlob returns undefined on 404', async ({ expect }) => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    const bytes = await client.getBlob(Context.default(), 'missing');
    expect(bytes).toBeUndefined();
  });

  test('hasBlob sends a HEAD request and reflects 404 as false', async ({ expect }) => {
    const fetchMock = vi.fn(async (_input: any, init?: RequestInit) => {
      expect(init?.method).toBe('HEAD');
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    expect(await client.hasBlob(Context.default(), 'missing')).toBe(false);
  });

  test('deleteBlob sends a DELETE request', async ({ expect }) => {
    const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {
      expect(String(input instanceof URL ? input : (input.url ?? input))).toBe(
        'https://edge.example.com/api/file/abc123',
      );
      expect(init?.method).toBe('DELETE');
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    await client.deleteBlob(Context.default(), 'abc123');
    expect(fetchMock).toHaveBeenCalled();
  });
});
