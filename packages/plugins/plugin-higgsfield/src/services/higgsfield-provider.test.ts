//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MissingCredentialError, ProviderFailureError } from './higgsfield-provider-types.ts';
import { HiggsfieldProvider } from './higgsfield-provider.ts';

type Captured = { url: string; method?: string; authorization: string | null; body?: Record<string, unknown> };

describe('HiggsfieldProvider', () => {
  test('enqueue posts the body to the model path with a Key credential and returns the request id', async ({
    expect,
  }) => {
    let captured: Captured | undefined;
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = {
        url: String(input),
        method: init?.method,
        authorization: new Headers(init?.headers).get('Authorization'),
        body: JSON.parse(String(init?.body)),
      };
      return json({
        status: 'queued',
        request_id: 'req-1',
        status_url: 'https://status.higgsfield.ai/requests/req-1/status',
      });
    };

    const { jobId, statusUrl } = await provider(fetchImpl).enqueue(
      { model: '/higgsfield-ai/soul/v2/standard', body: { prompt: 'a lake at sunrise' } },
      { credential: 'id:secret' },
    );

    expect(jobId).toBe('req-1');
    expect(statusUrl).toBe('https://status.higgsfield.ai/requests/req-1/status');
    expect(captured?.url).toBe('https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard');
    expect(captured?.method).toBe('POST');
    expect(captured?.authorization).toBe('Key id:secret');
    expect(captured?.body).toEqual({ prompt: 'a lake at sunrise' });
  });

  test('enqueue falls back to the documented status endpoint when the response omits status_url', async ({
    expect,
  }) => {
    const fetchImpl: typeof globalThis.fetch = async () => json({ status: 'queued', request_id: 'req-1' });
    const { statusUrl } = await provider(fetchImpl).enqueue(
      { model: 'higgsfield-ai/soul/v2/standard', body: {} },
      { credential: 'id:secret' },
    );
    expect(statusUrl).toBe('https://api.higgsfield.ai/requests/req-1/status');
  });

  test('enqueue requires a credential and a model path', async ({ expect }) => {
    const fetchImpl: typeof globalThis.fetch = async () => json({});
    await expect(
      provider(fetchImpl).enqueue({ model: 'higgsfield-ai/soul/v2/standard', body: {} }, { credential: '' }),
    ).rejects.toBeInstanceOf(MissingCredentialError);
    await expect(
      provider(fetchImpl).enqueue({ model: '  ', body: {} }, { credential: 'id:secret' }),
    ).rejects.toBeInstanceOf(ProviderFailureError);
  });

  test('enqueue surfaces the API detail on a non-2xx', async ({ expect }) => {
    const fetchImpl: typeof globalThis.fetch = async () => json({ detail: 'Not enough credits' }, 403);
    await expect(
      provider(fetchImpl).enqueue({ model: 'higgsfield-ai/soul/v2/standard', body: {} }, { credential: 'id:secret' }),
    ).rejects.toThrow(/403 Not enough credits/);
  });

  test('awaitResult polls the status url verbatim until completed and returns image urls', async ({ expect }) => {
    const statuses: string[] = [];
    let calls = 0;
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL) => {
      calls += 1;
      expect(String(input)).toBe('https://status.higgsfield.ai/requests/req-1/status');
      return calls < 3
        ? json({ status: calls === 1 ? 'queued' : 'in_progress', request_id: 'req-1' })
        : json({
            status: 'completed',
            request_id: 'req-1',
            images: [{ url: 'https://cdn/a.jpg' }, { url: 'https://cdn/b.jpg' }],
          });
    };

    const output = await provider(fetchImpl).awaitResult('https://status.higgsfield.ai/requests/req-1/status', {
      credential: 'id:secret',
      onStatus: (status) => statuses.push(status),
    });
    expect(output).toEqual({ kind: 'image', urls: ['https://cdn/a.jpg', 'https://cdn/b.jpg'] });
    expect(statuses).toEqual(['queued', 'in_progress', 'completed']);
  });

  test('awaitResult resolves a bare request id to the documented status endpoint', async ({ expect }) => {
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('https://api.higgsfield.ai/requests/req-1/status');
      return json({ status: 'completed', request_id: 'req-1', video: { url: 'https://cdn/v.mp4' } });
    };
    await expect(provider(fetchImpl).awaitResult('req-1', { credential: 'id:secret' })).resolves.toEqual({
      kind: 'video',
      url: 'https://cdn/v.mp4',
    });
  });

  test('awaitResult returns a video url for video models', async ({ expect }) => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      json({ status: 'completed', request_id: 'req-1', video: { url: 'https://cdn/v.mp4' } });
    const output = await provider(fetchImpl).awaitResult('req-1', { credential: 'id:secret' });
    expect(output).toEqual({ kind: 'video', url: 'https://cdn/v.mp4' });
  });

  test('awaitResult rejects on failed, nsfw and canceled', async ({ expect }) => {
    const rejects = (body: unknown) =>
      expect(provider(async () => json(body)).awaitResult('req-1', { credential: 'id:secret' })).rejects;
    await rejects({ status: 'failed', request_id: 'req-1', error: 'boom' }).toThrow(/boom/);
    await rejects({ status: 'nsfw', request_id: 'req-1' }).toThrow(/nsfw/);
    await rejects({ status: 'canceled', request_id: 'req-1' }).toThrow(/canceled/);
  });

  test('awaitResult retries a transient 5xx and stops on a 4xx', async ({ expect }) => {
    let calls = 0;
    const flaky: typeof globalThis.fetch = async () => {
      calls += 1;
      return calls === 1
        ? json({ detail: 'upstream' }, 502)
        : json({ status: 'completed', request_id: 'req-1', video: { url: 'https://cdn/v.mp4' } });
    };
    await expect(provider(flaky).awaitResult('req-1', { credential: 'id:secret' })).resolves.toMatchObject({
      kind: 'video',
    });
    expect(calls).toBe(2);

    const missing: typeof globalThis.fetch = async () => json({ detail: 'unknown request' }, 404);
    await expect(provider(missing).awaitResult('req-1', { credential: 'id:secret' })).rejects.toThrow(/404/);
  });

  test('awaitResult aborts between polls when the signal fires', async ({ expect }) => {
    const controller = new AbortController();
    const fetchImpl: typeof globalThis.fetch = async () => {
      controller.abort(new Error('cancelled'));
      return json({ status: 'queued', request_id: 'req-1' });
    };
    await expect(
      provider(fetchImpl).awaitResult('req-1', { credential: 'id:secret', signal: controller.signal }),
    ).rejects.toThrow('cancelled');
  });

  test('awaitResult times out', async ({ expect }) => {
    const fetchImpl: typeof globalThis.fetch = async () => json({ status: 'queued', request_id: 'req-1' });
    const instance = new HiggsfieldProvider({
      fetch: fetchImpl,
      initialPollIntervalMs: 1,
      maxPollIntervalMs: 1,
      timeoutMs: 10,
    });
    await expect(instance.awaitResult('req-1', { credential: 'id:secret' })).rejects.toThrow(/timed out/);
  });

  test('a fetch that never settles is cut off by the request deadline', async ({ expect }) => {
    // Honour the signal the way a real fetch does: reject with its reason once it fires.
    const stalled: typeof globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)));
    const instance = new HiggsfieldProvider({ fetch: stalled, requestTimeoutMs: 10, timeoutMs: 1_000 });
    await expect(
      instance.enqueue({ model: 'higgsfield-ai/soul/v2/standard', body: {} }, { credential: 'id:secret' }),
    ).rejects.toThrow(/timed out/);
    await expect(instance.awaitResult('req-1', { credential: 'id:secret' })).rejects.toThrow(/timed out/);
  });
});

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

const provider = (fetchImpl: typeof globalThis.fetch) =>
  new HiggsfieldProvider({ fetch: fetchImpl, initialPollIntervalMs: 1, maxPollIntervalMs: 2, timeoutMs: 1_000 });
