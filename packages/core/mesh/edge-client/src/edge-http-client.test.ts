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
const DEV_SERVER = 'https://dev.dxos.network';

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

describe('EdgeHttpClient auth refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const identity = {
    peerKey: 'peer-key',
    identityDid: 'did:halo:test',
    presentCredentials: async (): Promise<Presentation> => ({}),
  };

  const makeFetchMock = (authData: Record<string, unknown>) =>
    vi.fn(async (input: any, _init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      if (url.endsWith('/auth')) {
        return new Response(JSON.stringify({ success: true, data: authData }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 200 });
    });

  const authCalls = (fetchMock: { mock: { calls: unknown[][] } }) =>
    fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/auth')).length;

  // `presentCredentials` throws on a device with no HALO chain (`invariant(chain)` in `auth.ts`,
  // reachable mid-invitation). The prefetch is documented as best-effort, so that must leave the
  // request unauthenticated rather than failing it -- the behaviour before `auth: true` was set.
  test('a signing failure during prefetch does not fail the request', async ({ expect }) => {
    const fetchMock = makeFetchMock({ challenge: 'Y2hhbGxlbmdl', expiresInMs: 300_000 });
    vi.stubGlobal('fetch', fetchMock);

    const presentCredentials = vi.fn(async (): Promise<Presentation> => {
      throw new Error('chain is required');
    });
    const chainless: EdgeIdentity = {
      peerKey: 'peer-key',
      identityDid: 'did:halo:test',
      presentCredentials,
    };

    const client = new EdgeHttpClient('https://edge.example.com');
    client.setIdentity(chainless);

    await client.putBlob(Context.default(), 'one', new Uint8Array([1]), { contentType: 'application/octet-stream' });

    // Assert the throw actually happened: without this the test would also pass if the prefetch
    // were skipped entirely, which is a different behaviour from recovering from it.
    expect(presentCredentials).toHaveBeenCalledTimes(1);
    const targetCall = fetchMock.mock.calls.find((call) => !String(call[0]).endsWith('/auth'));
    expect(targetCall).toBeDefined();
    expect((targetCall![1] as RequestInit | undefined)?.headers).not.toHaveProperty('Authorization');
  });

  test('re-authenticates via /auth before the advertised TTL elapses', async ({ expect }) => {
    vi.useFakeTimers();
    const fetchMock = makeFetchMock({ challenge: 'Y2hhbGxlbmdl', expiresInMs: 300_000 });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    client.setIdentity(identity);

    await client.putBlob(Context.default(), 'one', new Uint8Array([1]), { contentType: 'application/octet-stream' });
    expect(authCalls(fetchMock)).toBe(1);

    // Inside the window the cached header is reused.
    vi.advanceTimersByTime(60_000);
    await client.putBlob(Context.default(), 'two', new Uint8Array([2]), { contentType: 'application/octet-stream' });
    expect(authCalls(fetchMock)).toBe(1);

    // Past the refresh point (TTL minus margin) a fresh challenge is fetched — no 401 involved.
    vi.advanceTimersByTime(300_000);
    await client.putBlob(Context.default(), 'three', new Uint8Array([3]), { contentType: 'application/octet-stream' });
    expect(authCalls(fetchMock)).toBe(2);
  });

  test('an identity swap mid-prefetch discards the stale header', async ({ expect }) => {
    let releaseAuth = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseAuth = resolve;
    });
    let signalAuthStarted = () => {};
    const authStarted = new Promise<void>((resolve) => {
      signalAuthStarted = resolve;
    });
    const fetchMock = vi.fn(async (input: any, _init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      if (url.endsWith('/auth')) {
        signalAuthStarted();
        await gate;
        return new Response(JSON.stringify({ success: true, data: { challenge: 'Y2hhbGxlbmdl' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    client.setIdentity(identity);
    const inFlight = client.putBlob(Context.default(), 'one', new Uint8Array([1]), {
      contentType: 'application/octet-stream',
    });
    // Swap identities only once the prefetch is provably parked inside the gated /auth round trip.
    await authStarted;
    client.setIdentity({ ...identity, identityDid: 'did:halo:other' });
    releaseAuth();
    await inFlight;

    // The stale presentation was discarded: the request went out without it.
    const putCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/blob/file/one'));
    expect((putCall![1]?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  test('getAuthHeader withholds a header minted for a different identity', async ({ expect }) => {
    // The stale prefetch never commits (`_prefetchAuthHeaderOnce` checks first), so reproducing this
    // needs a SECOND prefetch to commit the new identity's header while the first caller is parked.
    let releaseFirstAuth = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseFirstAuth = resolve;
    });
    let signalAuthStarted = () => {};
    const authStarted = new Promise<void>((resolve) => {
      signalAuthStarted = resolve;
    });
    let authCallCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input instanceof URL ? input : typeof input === 'string' ? input : (input.url ?? input));
      if (url.endsWith('/auth')) {
        if (authCallCount++ === 0) {
          signalAuthStarted();
          await gate;
        }
        return new Response(
          JSON.stringify({ success: true, data: { challenge: 'Y2hhbGxlbmdl', expiresInMs: 300_000 } }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    client.setIdentity(identity);
    const header = client.getAuthHeader();
    await authStarted;

    // Swap, then let a second caller mint and commit a header for the NEW identity.
    client.setIdentity({ ...identity, identityDid: 'did:halo:other' });
    const otherHeader = await client.getAuthHeader();
    expect(otherHeader).toBeDefined();

    releaseFirstAuth();

    // The first caller asked on behalf of the original identity; what is cached is not its header.
    await expect(header).resolves.toBeUndefined();
  });

  test('a settling prefetch does not clear a newer single-flight guard', async ({ expect }) => {
    // Both of the first two `/auth` round trips are parked, so the FIRST can settle while the
    // SECOND is still in flight — the only ordering in which a stale `finally` can clear a live
    // guard. Releasing them in the other order (as a naive test does) never reproduces it.
    const releases: Array<() => void> = [];
    const started: Array<Promise<void>> = [];
    const startSignals: Array<() => void> = [];
    for (let authRequestIndex = 0; authRequestIndex < 2; authRequestIndex++) {
      started.push(new Promise<void>((resolve) => startSignals.push(resolve)));
    }
    let authCallCount = 0;
    const fetchMock = vi.fn(async (input: any, _init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      if (url.endsWith('/auth')) {
        const index = authCallCount++;
        if (index < 2) {
          startSignals[index]();
          await new Promise<void>((resolve) => releases.push(resolve));
        }
        return new Response(JSON.stringify({ success: true, data: { challenge: 'Y2hhbGxlbmdl' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    client.setIdentity(identity);
    const first = client.putBlob(Context.default(), 'one', new Uint8Array([1]), {
      contentType: 'application/octet-stream',
    });
    await started[0];

    // `setIdentity` drops the in-flight guard, so this second call installs its own.
    client.setIdentity({ ...identity, identityDid: 'did:halo:other' });
    const second = client.putBlob(Context.default(), 'two', new Uint8Array([2]), {
      contentType: 'application/octet-stream',
    });
    await started[1];

    // Settle the FIRST while the second is still parked. Without the identity check in `finally`,
    // this clears the guard the second prefetch owns.
    releases[0]();
    await first;

    // A third caller must join the second prefetch, not start its own.
    const third = client.putBlob(Context.default(), 'three', new Uint8Array([3]), {
      contentType: 'application/octet-stream',
    });
    releases[1]();
    await Promise.all([second, third]);

    expect(authCallCount).toBe(2);
  });

  test('no advertised TTL means no proactive refresh', async ({ expect }) => {
    vi.useFakeTimers();
    const fetchMock = makeFetchMock({ challenge: 'Y2hhbGxlbmdl' });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    client.setIdentity(identity);

    await client.putBlob(Context.default(), 'one', new Uint8Array([1]), { contentType: 'application/octet-stream' });
    vi.advanceTimersByTime(3_600_000);
    await client.putBlob(Context.default(), 'two', new Uint8Array([2]), { contentType: 'application/octet-stream' });
    expect(authCalls(fetchMock)).toBe(1);
  });
});

describe('EdgeHttpClient blobs', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('getBlobUrl URL-encodes the key', ({ expect }) => {
    const client = new EdgeHttpClient('https://edge.example.com');
    expect(client.getBlobUrl('abc123').toString()).toBe('https://edge.example.com/blob/file/abc123');
    expect(client.getBlobUrl('a/b/../c').toString()).toBe('https://edge.example.com/blob/file/a%2Fb%2F..%2Fc');
  });

  test('putBlob sends a raw POST body and pre-fetches /auth', async ({ expect }) => {
    const fetchMock = vi.fn(async (input: any, _init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      if (url.endsWith('/auth')) {
        return new Response(JSON.stringify({ success: true, data: { challenge: 'Y2hhbGxlbmdl' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com');
    client.setIdentity({
      peerKey: 'peer-key',
      identityDid: 'did:halo:test',
      presentCredentials: async (): Promise<Presentation> => ({}),
    });
    const bytes = new Uint8Array([1, 2, 3]);
    await client.putBlob(Context.default(), 'abc123', bytes, { contentType: 'application/octet-stream' });

    const authCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/auth'));
    expect(authCall).toBeDefined();

    const putCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/blob/file/abc123'));
    expect(putCall).toBeDefined();
    expect(String(putCall![0])).toBe('https://edge.example.com/blob/file/abc123');
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

    const fileCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/blob/file/abc123'));
    expect(fileCalls.length).toBe(2);
    expect((fileCalls[1][1]?.headers as Record<string, string>).Authorization).toMatch(/^VerifiablePresentation/);
  });

  // A 401 whose `WWW-Authenticate` yields nothing signable must surface as itself. Gating on
  // header presence alone sent these through the auth path, where the missing challenge threw and
  // was rewrapped as a generic 'Error processing request.', hiding the actual status.
  for (const { name, header } of [
    { name: 'an unrelated scheme', header: 'Bearer realm="upstream"' },
    // Edge emits this when its server keypair is unconfigured.
    { name: 'an empty VP challenge', header: 'VerifiablePresentation challenge=""' },
  ]) {
    test(`a 401 carrying ${name} is not retried through the auth path`, async ({ expect }) => {
      const identity: EdgeIdentity = {
        peerKey: 'peer-key',
        identityDid: 'did:halo:test',
        presentCredentials: async (): Promise<Presentation> => ({}),
      };

      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        if (requestUrl(input).endsWith('/auth')) {
          return new Response(null, { status: 404 });
        }
        return new Response(null, { status: 401, headers: { 'WWW-Authenticate': header } });
      });
      vi.stubGlobal('fetch', fetchMock);

      const client = new EdgeHttpClient('https://edge.example.com');
      client.setIdentity(identity);

      await expect(client.getBlob(Context.default(), 'abc123')).rejects.toThrow(/HTTP code 401/);

      // Exactly one attempt at the resource: no auth retry.
      const fileCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/blob/file/abc123'));
      expect(fileCalls.length).toBe(1);
    });
  }

  test('getBlob returns bytes on success', async ({ expect }) => {
    const fetchMock = vi.fn(async (input: any) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      expect(url).toBe('https://edge.example.com/blob/file/abc123');
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
        'https://edge.example.com/blob/file/abc123',
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

describe('EdgeHttpClient api key', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('uploadPluginBundle sends the key as a Bearer header without the /auth prefetch', async ({ expect }) => {
    const fetchMock = vi.fn(
      async (_input: any, _init?: RequestInit) =>
        new Response(JSON.stringify({ success: true, data: { moduleUrl: 'url' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com', { apiKey: 'secret-key' });
    // Mirror uploadBundleDirect's call shape: VP auth off, so the api key is the only credential.
    await client.uploadPluginBundle(Context.default(), { slug: 'x', version: '1', files: [] }, { auth: false });

    const authCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/auth'));
    expect(authCall).toBeUndefined();
    const uploadCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/registry/upload'));
    expect((uploadCall![1]?.headers as Record<string, string>).Authorization).toBe('Bearer secret-key');
  });

  test('a rejected api key is terminal — no retry on the auth 401', async ({ expect }) => {
    const fetchMock = vi.fn(
      async (_input: any, _init?: RequestInit) =>
        new Response(null, {
          status: 401,
          headers: { 'WWW-Authenticate': 'VerifiablePresentation challenge=Y2hhbGxlbmdl' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com', { apiKey: 'rejected-key' });
    await expect(
      client.uploadPluginBundle(Context.default(), { slug: 'x', version: '1', files: [] }),
    ).rejects.toMatchObject({ isRetryable: false });
    expect(fetchMock.mock.calls.length).toBe(1);
  });

  test('putBlob sends the key as a Bearer header without the /auth prefetch', async ({ expect }) => {
    const fetchMock = vi.fn(async (_input: any, _init?: RequestInit) => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new EdgeHttpClient('https://edge.example.com', { apiKey: 'secret-key' });
    await client.putBlob(Context.default(), 'abc123', new Uint8Array([1, 2, 3]));

    const authCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/auth'));
    expect(authCall).toBeUndefined();
    const putCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/blob/file/abc123'));
    expect((putCall![1]?.headers as Record<string, string>).Authorization).toBe('Bearer secret-key');
  });
});

/** Narrow a `fetch` input to its URL string, covering all three shapes the contract allows. */
const requestUrl = (input: RequestInfo | URL): string =>
  input instanceof URL ? input.toString() : typeof input === 'string' ? input : input.url;
