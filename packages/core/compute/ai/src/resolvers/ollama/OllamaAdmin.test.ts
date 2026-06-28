//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as OllamaAdmin from './OllamaAdmin';

const ENDPOINT = 'http://localhost:21434';

describe('OllamaAdmin', () => {
  describe('list', () => {
    test('maps snake_case fields to camelCase', async ({ expect }) => {
      const fetch = mockFetch(() =>
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
      );
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.list();
      expect(result).toEqual({
        ok: true,
        models: [
          {
            name: 'llama3.2:1b',
            size: 1234,
            modifiedAt: '2026-01-01T00:00:00Z',
            digest: 'sha256:abc',
            details: { family: 'llama' },
          },
        ],
      });
    });

    test('returns an empty list when no models are installed', async ({ expect }) => {
      const fetch = mockFetch(() => jsonResponse({ models: [] }));
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.list();
      expect(result).toEqual({ ok: true, models: [] });
    });

    test('surfaces a connection-refused error without throwing', async ({ expect }) => {
      const fetch = mockFetch(() => {
        throw new TypeError('fetch failed: ECONNREFUSED');
      });
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.list();
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toContain('ECONNREFUSED');
    });
  });

  describe('ps', () => {
    test('maps running models to camelCase', async ({ expect }) => {
      const fetch = mockFetch(() =>
        jsonResponse({
          models: [{ name: 'llama3.2:1b', size: 2000, size_vram: 1500, expires_at: '2026-01-01T00:05:00Z' }],
        }),
      );
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.ps();
      expect(result).toEqual({
        ok: true,
        models: [{ name: 'llama3.2:1b', size: 2000, sizeVram: 1500, expiresAt: '2026-01-01T00:05:00Z' }],
      });
    });

    test('returns an empty list when nothing is loaded', async ({ expect }) => {
      const fetch = mockFetch(() => jsonResponse({ models: [] }));
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.ps();
      expect(result).toEqual({ ok: true, models: [] });
    });
  });

  describe('pull', () => {
    test('streams progress and resolves on success', async ({ expect }) => {
      const fetch = mockFetch(() =>
        streamResponse([
          '{"status":"pulling manifest"}\n',
          '{"status":"downloading","digest":"sha256:abc","completed":50,"total":100}\n',
          '{"status":"success"}\n',
        ]),
      );
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const progress: OllamaAdmin.PullProgress[] = [];
      const result = await admin.pull('llama3.2:1b', (event) => progress.push(event));
      expect(result).toEqual({ ok: true });
      expect(progress).toEqual([
        { status: 'pulling manifest', completed: undefined, total: undefined },
        { status: 'downloading', digest: 'sha256:abc', completed: 50, total: 100 },
        { status: 'success', completed: undefined, total: undefined },
      ]);
    });

    test('buffers a line split across chunk boundaries', async ({ expect }) => {
      const fetch = mockFetch(() =>
        // The second NDJSON line is split mid-way across two chunks.
        streamResponse([
          '{"status":"pulling manifest"}\n{"status":"down',
          'loading","completed":50,"total":100}\n{"status":"success"}\n',
        ]),
      );
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const progress: OllamaAdmin.PullProgress[] = [];
      const result = await admin.pull('llama3.2:1b', (event) => progress.push(event));
      expect(result).toEqual({ ok: true });
      expect(progress.map((event) => event.status)).toEqual(['pulling manifest', 'downloading', 'success']);
      expect(progress[1]).toEqual({ status: 'downloading', completed: 50, total: 100 });
    });

    test('returns a failure when a line carries an error', async ({ expect }) => {
      const fetch = mockFetch(() =>
        streamResponse(['{"status":"pulling manifest"}\n', '{"error":"pull model manifest: file does not exist"}\n']),
      );
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.pull('bogus-model');
      expect(result).toEqual({ ok: false, error: 'pull model manifest: file does not exist' });
    });
  });

  describe('load / unload', () => {
    test('load posts keep_alive -1 and resolves ok', async ({ expect }) => {
      let body: any;
      const fetch: typeof globalThis.fetch = async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response('{"done":true}', { status: 200 });
      };
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.load('llama3.2:1b');
      expect(result).toEqual({ ok: true });
      expect(body).toMatchObject({ model: 'llama3.2:1b', keep_alive: -1 });
    });

    test('unload posts keep_alive 0', async ({ expect }) => {
      let body: any;
      const fetch: typeof globalThis.fetch = async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response('{"done":true}', { status: 200 });
      };
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.unload('llama3.2:1b');
      expect(result).toEqual({ ok: true });
      expect(body).toMatchObject({ model: 'llama3.2:1b', keep_alive: 0 });
    });
  });

  describe('remove', () => {
    test('resolves ok on 200', async ({ expect }) => {
      const fetch = mockFetch(() => new Response('', { status: 200 }));
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.remove('llama3.2:1b');
      expect(result).toEqual({ ok: true });
    });

    test('returns a failure on 404', async ({ expect }) => {
      const fetch = mockFetch(() => new Response('model not found', { status: 404 }));
      const admin = OllamaAdmin.make({ endpoint: ENDPOINT, fetch });
      const result = await admin.remove('missing-model');
      expect(result.ok).toBe(false);
    });
  });
});

//
// Helpers
//

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
