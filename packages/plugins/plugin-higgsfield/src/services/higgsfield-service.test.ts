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

  test('video service has no default model and rejects a request without one', async ({ expect }) => {
    const service = makeHiggsfieldVideoService(new HiggsfieldProvider({ fetch: async () => json({}) }));
    expect(service.kind).toBe('video');
    expect(service.defaultRequest).toBeUndefined();
    const { enqueue } = service;
    expect(enqueue).toBeDefined();
    if (!enqueue) {
      return;
    }
    await expect(enqueue({ prompt: 'hello' }, { apiKey: Redacted.make('id:secret') })).rejects.toThrow();
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
