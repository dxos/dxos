//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';
import { describe, test } from 'vitest';

import { HIGGSFIELD_DEFAULT_IMAGE_MODEL } from '../constants.ts';
import { HiggsfieldProvider } from './higgsfield-provider.ts';
import { makeHiggsfieldImageService, makeHiggsfieldVideoService, toVariants } from './higgsfield-service.ts';

const json = (value: unknown) => new Response(JSON.stringify(value));

describe('Higgsfield generation services', () => {
  test('image service defaults the model and forwards the prompt', async ({ expect }) => {
    let captured: { url: string; body: Record<string, unknown> } | undefined;
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(input), body: JSON.parse(String(init?.body)) };
      return json({ status: 'queued', request_id: 'req-1' });
    };
    const service = makeHiggsfieldImageService(new HiggsfieldProvider({ fetch: fetchImpl }));
    expect(service.kind).toBe('image');
    expect(service.defaultRequest).toEqual({ model: HIGGSFIELD_DEFAULT_IMAGE_MODEL });

    const { enqueue } = service;
    expect(enqueue).toBeDefined();
    if (!enqueue) {
      return;
    }
    const { jobId } = await enqueue(
      { ...service.defaultRequest, prompt: 'hello', count: 2 },
      { apiKey: Redacted.make('id:secret') },
    );
    expect(jobId).toBe('req-1');
    expect(captured?.url).toContain(`/${HIGGSFIELD_DEFAULT_IMAGE_MODEL}`);
    expect(captured?.body).toEqual({ prompt: 'hello' });
  });

  test('video service generates a still, then animates it, and returns the animation job', async ({ expect }) => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') {
        calls.push({ url, body: JSON.parse(String(init.body)) });
        return json({ status: 'queued', request_id: url.includes('/dop/') ? 'video-1' : 'still-1' });
      }
      // The still's status poll completes at once with an image.
      return json({ status: 'completed', request_id: 'still-1', images: [{ url: 'https://cdn/still.jpg' }] });
    };
    const service = makeHiggsfieldVideoService(
      new HiggsfieldProvider({ fetch: fetchImpl, initialPollIntervalMs: 1, maxPollIntervalMs: 1 }),
    );
    expect(service.kind).toBe('video');
    const { enqueue } = service;
    expect(enqueue).toBeDefined();
    if (!enqueue) {
      return;
    }
    const statuses: (string | undefined)[] = [];
    const { jobId } = await enqueue(
      { ...service.defaultRequest, prompt: 'slow dolly in' },
      { apiKey: Redacted.make('id:secret'), onProgress: ({ status }) => statuses.push(status) },
    );
    expect(jobId).toBe('video-1');
    expect(calls.map((call) => call.url.split('.ai/')[1])).toEqual([
      'higgsfield-ai/soul/v2/standard',
      'higgsfield-ai/dop/lite',
    ]);
    expect(calls[1].body).toEqual({ prompt: 'slow dolly in', image_url: 'https://cdn/still.jpg' });
    expect(statuses).toEqual(['Generating still']);
  });

  test('video service animates a given still without generating one', async ({ expect }) => {
    const calls: string[] = [];
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return json({ status: 'queued', request_id: 'video-1' });
    };
    const service = makeHiggsfieldVideoService(new HiggsfieldProvider({ fetch: fetchImpl }));
    const { enqueue } = service;
    expect(enqueue).toBeDefined();
    if (!enqueue) {
      return;
    }
    await enqueue(
      { model: 'higgsfield-ai/dop/lite', prompt: 'pan', imageUrl: 'https://cdn/mine.jpg' },
      { apiKey: Redacted.make('id:secret') },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('/dop/lite');
  });

  test('awaitResult reports progress and maps outputs to variants', async ({ expect }) => {
    const statuses: (string | undefined)[] = [];
    const fetchImpl: typeof globalThis.fetch = async () =>
      json({ status: 'completed', request_id: 'req-1', video: { url: 'https://cdn/v.mp4' } });
    const service = makeHiggsfieldVideoService(new HiggsfieldProvider({ fetch: fetchImpl }));
    const { awaitResult } = service;
    expect(awaitResult).toBeDefined();
    if (!awaitResult) {
      return;
    }
    const result = await awaitResult('req-1', {
      apiKey: Redacted.make('id:secret'),
      onProgress: ({ status }) => statuses.push(status),
    });
    expect(result.variants).toEqual([
      { contentType: 'video/mp4', url: 'https://cdn/v.mp4', generation: { provider: 'higgsfield' } },
    ]);
    expect(statuses).toEqual(['Completed']);
  });

  test('toVariants maps every image url and keeps the produced mime', ({ expect }) => {
    expect(toVariants({ kind: 'image', urls: ['a', 'b'] }).map((variant) => variant.contentType)).toEqual([
      'image/jpeg',
      'image/jpeg',
    ]);
    expect(toVariants({ kind: 'audio', urls: ['a'] })[0]?.contentType).toBe('audio/mpeg');
  });
});
