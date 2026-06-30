//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import type * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as OllamaAdmin from './OllamaAdmin';

const ENDPOINT = 'http://localhost:21434';

describe('OllamaAdmin', () => {
  describe('list', () => {
    test('maps snake_case fields to camelCase', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const models = await run(
        admin.list,
        mockFetch(() =>
          jsonResponse({
            models: [
              {
                name: 'llama3.2:1b',
                size: 1234,
                modified_at: '2026-01-01T00:00:00Z',
                digest: 'sha256:abc',
                details: { family: 'llama' },
              },
            ],
          }),
        ),
      );
      expect(models).toEqual([
        {
          name: 'llama3.2:1b',
          size: 1234,
          modifiedAt: '2026-01-01T00:00:00Z',
          digest: 'sha256:abc',
          details: { family: 'llama' },
        },
      ]);
    });

    test('returns an empty list when no models are installed', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const models = await run(
        admin.list,
        mockFetch(() => jsonResponse({ models: [] })),
      );
      expect(models).toEqual([]);
    });

    test('fails with a typed OllamaError on connection refused', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const result = await runExit(
        admin.list,
        mockFetch(() => {
          throw new TypeError('fetch failed: ECONNREFUSED');
        }),
      );
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe('OllamaError');
        expect(result.left.message).toContain('ECONNREFUSED');
      }
    });
  });

  describe('ps', () => {
    test('maps running models to camelCase', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const models = await run(
        admin.ps,
        mockFetch(() =>
          jsonResponse({
            models: [{ name: 'llama3.2:1b', size: 2000, size_vram: 1500, expires_at: '2026-01-01T00:05:00Z' }],
          }),
        ),
      );
      expect(models).toEqual([{ name: 'llama3.2:1b', size: 2000, sizeVram: 1500, expiresAt: '2026-01-01T00:05:00Z' }]);
    });

    test('returns an empty list when nothing is loaded', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const models = await run(
        admin.ps,
        mockFetch(() => jsonResponse({ models: [] })),
      );
      expect(models).toEqual([]);
    });
  });

  describe('pull', () => {
    test('streams progress and completes on success', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const progress: OllamaAdmin.PullProgress[] = [];
      await run(
        admin.pull('llama3.2:1b').pipe(Stream.runForEach((event) => Effect.sync(() => progress.push(event)))),
        mockFetch(() =>
          streamResponse([
            '{"status":"pulling manifest"}\n',
            '{"status":"downloading","digest":"sha256:abc","completed":50,"total":100}\n',
            '{"status":"success"}\n',
          ]),
        ),
      );
      expect(progress).toEqual([
        { status: 'pulling manifest', completed: undefined, total: undefined },
        { status: 'downloading', digest: 'sha256:abc', completed: 50, total: 100 },
        { status: 'success', completed: undefined, total: undefined },
      ]);
    });

    test('buffers a frame split across chunk boundaries', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const progress: OllamaAdmin.PullProgress[] = [];
      await run(
        admin.pull('llama3.2:1b').pipe(Stream.runForEach((event) => Effect.sync(() => progress.push(event)))),
        // The second NDJSON frame is split mid-way across two chunks.
        mockFetch(() =>
          streamResponse([
            '{"status":"pulling manifest"}\n{"status":"down',
            'loading","completed":50,"total":100}\n{"status":"success"}\n',
          ]),
        ),
      );
      expect(progress.map((event) => event.status)).toEqual(['pulling manifest', 'downloading', 'success']);
      expect(progress[1]).toEqual({ status: 'downloading', completed: 50, total: 100 });
    });

    test('fails with the error carried by a frame', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const result = await runExit(
        admin.pull('bogus-model').pipe(Stream.runDrain),
        mockFetch(() =>
          streamResponse(['{"status":"pulling manifest"}\n', '{"error":"pull model manifest: file does not exist"}\n']),
        ),
      );
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left.message).toBe('pull model manifest: file does not exist');
      }
    });
  });

  describe('load / unload', () => {
    test('load posts keep_alive -1 and completes', async ({ expect }) => {
      let body: any;
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      await run(admin.load('llama3.2:1b'), async (_url, init) => {
        body = await readBody(init);
        return new Response('{"done":true}', { status: 200 });
      });
      expect(body).toMatchObject({ model: 'llama3.2:1b', keep_alive: -1 });
    });

    test('unload posts keep_alive 0', async ({ expect }) => {
      let body: any;
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      await run(admin.unload('llama3.2:1b'), async (_url, init) => {
        body = await readBody(init);
        return new Response('{"done":true}', { status: 200 });
      });
      expect(body).toMatchObject({ model: 'llama3.2:1b', keep_alive: 0 });
    });
  });

  describe('remove', () => {
    test('completes on 200', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const result = await runExit(
        admin.remove('llama3.2:1b'),
        mockFetch(() => new Response('', { status: 200 })),
      );
      expect(Either.isRight(result)).toBe(true);
    });

    test('fails on 404', async ({ expect }) => {
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT });
      const result = await runExit(
        admin.remove('missing-model'),
        mockFetch(() => new Response('model not found', { status: 404 })),
      );
      expect(Either.isLeft(result)).toBe(true);
    });
  });
});

//
// Helpers
//

/** Layer providing the platform HttpClient backed by a stubbed `fetch`. */
const layerFor = (fetch: typeof globalThis.fetch): Layer.Layer<HttpClient.HttpClient> =>
  FetchHttpClient.layer.pipe(Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch)));

/** Run an admin effect to its success value (throws on failure). */
const run = <A, E>(effect: Effect.Effect<A, E, HttpClient.HttpClient>, fetch: typeof globalThis.fetch): Promise<A> =>
  EffectEx.runPromise(effect.pipe(Effect.provide(layerFor(fetch))));

/** Run an admin effect to an `Either`, capturing the typed failure rather than throwing. */
const runExit = <A, E>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
  fetch: typeof globalThis.fetch,
): Promise<Either.Either<A, E>> => EffectEx.runPromise(effect.pipe(Effect.provide(layerFor(fetch)), Effect.either));

/** Build a stub `fetch` that ignores its arguments and yields the response from `handler`. */
const mockFetch =
  (handler: () => Response): typeof globalThis.fetch =>
  async () =>
    handler();

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });

/** Build a streaming response whose body emits the given string chunks as encoded bytes. */
const streamResponse = (chunks: string[], init?: ResponseInit): Response => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200, ...init });
};

/** Decode a request body to JSON; the Effect HttpClient sends it as encoded bytes, not a string. */
const readBody = async (init?: RequestInit): Promise<any> => {
  const body = init?.body;
  if (body == null) {
    return undefined;
  }
  const text = typeof body === 'string' ? body : await new Response(body).text();
  return JSON.parse(text);
};
