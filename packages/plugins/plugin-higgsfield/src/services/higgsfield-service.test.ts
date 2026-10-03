//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';
import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';
import * as Variant from '@dxos/plugin-studio/Variant';

import { HIGGSFIELD_DEFAULT_IMAGE_MODEL } from '../constants.ts';
import { HiggsfieldProvider } from './higgsfield-provider.ts';
import { makeHiggsfieldImageService, makeHiggsfieldVideoService, toVariants } from './higgsfield-service.ts';

describe('Higgsfield generation services', () => {
  test('image service defaults the model and forwards the prompt', async ({ expect }) => {
    let captured: { url: string; body: Record<string, unknown> } | undefined;
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(input), body: JSON.parse(String(init?.body)) };
      return json({ status: 'queued', request_id: 'req-1', status_url: 'https://status.higgsfield.ai/req-1' });
    };
    const service = makeHiggsfieldImageService(new HiggsfieldProvider({ fetch: fetchImpl }));
    expect(service.kind).toBe('image');
    expect(service.defaultRequest).toEqual({ model: HIGGSFIELD_DEFAULT_IMAGE_MODEL, aspectRatio: '16:9' });

    const { enqueue } = service;
    expect(enqueue).toBeDefined();
    if (!enqueue) {
      return;
    }
    const { jobId } = await enqueue(
      { ...service.defaultRequest, prompt: 'hello', count: 2 },
      { apiKey: Redacted.make('id:secret') },
    );
    // The persisted job id is the API's status url, not the request id.
    expect(jobId).toBe('https://status.higgsfield.ai/req-1');
    expect(captured?.url).toContain(`/${HIGGSFIELD_DEFAULT_IMAGE_MODEL}`);
    // The frame's shape rides along as the API's `aspect_ratio`.
    expect(captured?.body).toEqual({ prompt: 'hello', aspect_ratio: '16:9' });
  });

  test('image service substitutes the still generator for a video model', async ({ expect }) => {
    let url = '';
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL) => {
      url = String(input);
      return json({ status: 'queued', request_id: 'req-1' });
    };
    const service = makeHiggsfieldImageService(new HiggsfieldProvider({ fetch: fetchImpl }));
    const { enqueue } = service;
    expect(enqueue).toBeDefined();
    if (!enqueue) {
      return;
    }
    await enqueue({ model: 'higgsfield-ai/dop/lite', prompt: 'a still' }, { apiKey: Redacted.make('id:secret') });
    expect(url).toContain(`/${HIGGSFIELD_DEFAULT_IMAGE_MODEL}`);
  });

  test("video service animates the reference artifact's cover", async ({ expect }) => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return json({ status: 'queued', request_id: 'video-1' });
    };
    const service = makeHiggsfieldVideoService(new HiggsfieldProvider({ fetch: fetchImpl }));
    const { enqueue } = service;
    expect(enqueue).toBeDefined();
    if (!enqueue) {
      return;
    }
    // The reference's cover is what the op's `load` resolves; a ref made from a local object keeps
    // its target, so `load` needs no database here.
    const cover = Variant.make({ name: 'cover', url: 'https://cdn/reference.jpg', contentType: 'image/jpeg' });
    const reference = MediaArtifact.make({ name: 'reference', kind: 'image' });
    Obj.update(reference, (reference) => {
      reference.cover = Ref.make(cover);
    });
    await enqueue(
      { model: 'higgsfield-ai/dop/lite', prompt: 'pan', imageArtifact: Ref.make(reference) },
      {
        apiKey: Redacted.make('id:secret'),
        load: async (ref) => {
          const target = ref.target;
          if (!target) {
            throw new Error('unresolved');
          }
          return target;
        },
      },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/dop/lite');
    expect(calls[0].body).toEqual({ prompt: 'pan', image_url: 'https://cdn/reference.jpg' });
  });

  test('video service passes a duration to a model that takes one and drops it for DoP', async ({ expect }) => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fetchImpl: typeof globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return json({ status: 'queued', request_id: 'video-1' });
    };
    const service = makeHiggsfieldVideoService(new HiggsfieldProvider({ fetch: fetchImpl }));
    const { enqueue } = service;
    expect(enqueue).toBeDefined();
    if (!enqueue) {
      return;
    }
    const cover = Variant.make({ name: 'cover', url: 'https://cdn/reference.jpg', contentType: 'image/jpeg' });
    const reference = MediaArtifact.make({ name: 'reference', kind: 'image' });
    Obj.update(reference, (reference) => {
      reference.cover = Ref.make(cover);
    });
    const load = async <T>(ref: Ref.Ref<T>): Promise<T> => {
      const target = ref.target;
      if (!target) {
        throw new Error('unresolved');
      }
      return target;
    };
    const imageArtifact = Ref.make(reference);
    const options = { apiKey: Redacted.make('id:secret'), load };
    await enqueue(
      { model: 'kling-video/v2.1/standard/image-to-video', prompt: 'pan', imageArtifact, duration: 10 },
      options,
    );
    await enqueue({ model: 'higgsfield-ai/dop/lite', prompt: 'pan', imageArtifact, duration: 10 }, options);
    expect(calls[0].body.duration).toBe(10);
    expect(calls[1].body.duration).toBeUndefined();
    await expect(
      enqueue(
        { model: 'minimax/hailuo-2.3/standard/image-to-video', prompt: 'pan', imageArtifact, duration: 7 },
        options,
      ),
    ).rejects.toThrow('6 or 10 seconds, not 7');
    expect(calls).toHaveLength(2);
    // A path with a leading slash is the same model to the check as to the API.
    await enqueue({ model: ' /higgsfield-ai/dop/lite', prompt: 'pan', imageArtifact, duration: 10 }, options);
    expect(calls[2].body.duration).toBeUndefined();
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

const json = (value: unknown) => new Response(JSON.stringify(value));
