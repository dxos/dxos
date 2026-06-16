//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { EdgeServiceClient, EdgeServiceError } from './edge-service';
import * as Image from './Image';

const Echo = Schema.Struct({ value: Schema.String });

// Minimal Response stub so tests stay free of a real fetch implementation.
type StubResponse = {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

type Captured = { url: string; init: RequestInit };

const stubFetch = (
  handler: (captured: Captured) => StubResponse | Promise<StubResponse>,
): { fetch: typeof globalThis.fetch; calls: Captured[] } => {
  const calls: Captured[] = [];
  const fetch = (async (input: any, init: any) => {
    const captured: Captured = { url: input.toString(), init: init ?? {} };
    calls.push(captured);
    return (await handler(captured)) as unknown as Response;
  }) as typeof globalThis.fetch;
  return { fetch, calls };
};

const json = (body: unknown, status = 200): StubResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

describe('EdgeServiceClient', () => {
  test('postJson resolves and decodes the response', async ({ expect }) => {
    const { fetch, calls } = stubFetch(() => json({ value: 'pong' }));
    const client = new EdgeServiceClient({ baseUrl: 'https://edge.test', fetch });

    const result = await EffectEx.runPromise(client.postJson('/ping', { ping: true }, Echo));
    expect(result).toEqual({ value: 'pong' });
    expect(calls[0].url).toBe('https://edge.test/ping');
    expect((calls[0].init.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  test('sets the client-tag header when configured', async ({ expect }) => {
    const { fetch, calls } = stubFetch(() => json({ value: 'ok' }));
    const client = new EdgeServiceClient({ baseUrl: 'https://edge.test', clientTag: 'ci-e2e', fetch });

    await EffectEx.runPromise(client.postJson('/ping', {}, Echo));
    expect((calls[0].init.headers as Headers).get('X-DXOS-Client-Tag')).toBe('ci-e2e');
  });

  test('merges authHeaders when provided', async ({ expect }) => {
    const { fetch, calls } = stubFetch(() => json({ value: 'ok' }));
    const client = new EdgeServiceClient({
      baseUrl: 'https://edge.test',
      fetch,
      authHeaders: () => Effect.succeed({ Authorization: 'Bearer xyz' }),
    });

    await EffectEx.runPromise(client.postJson('/ping', {}, Echo));
    expect((calls[0].init.headers as Headers).get('Authorization')).toBe('Bearer xyz');
  });

  test('non-2xx fails with EdgeServiceError carrying the status', async ({ expect }) => {
    const { fetch } = stubFetch(() => ({ ok: false, status: 422, text: () => Promise.resolve('bad image') }));
    const client = new EdgeServiceClient({ baseUrl: 'https://edge.test', fetch });

    const error = await EffectEx.runPromise(Effect.flip(client.postForm('/upload', new FormData(), Echo)));
    expect(error).toBeInstanceOf(EdgeServiceError);
    expect(error.status).toBe(422);
    expect(error.message).toContain('bad image');
  });

  test('malformed JSON fails with EdgeServiceError', async ({ expect }) => {
    const { fetch } = stubFetch(() => ({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Unexpected token')),
    }));
    const client = new EdgeServiceClient({ baseUrl: 'https://edge.test', fetch });

    const error = await EffectEx.runPromise(Effect.flip(client.postJson('/ping', {}, Echo)));
    expect(error).toBeInstanceOf(EdgeServiceError);
    expect(error.message).toContain('parse JSON');
  });

  test('schema mismatch fails with EdgeServiceError', async ({ expect }) => {
    const { fetch } = stubFetch(() => json({ wrong: 'shape' }));
    const client = new EdgeServiceClient({ baseUrl: 'https://edge.test', fetch });

    const error = await EffectEx.runPromise(Effect.flip(client.postJson('/ping', {}, Echo)));
    expect(error).toBeInstanceOf(EdgeServiceError);
    expect(error.message).toContain('schema');
  });

  test('transport rejection fails with EdgeServiceError', async ({ expect }) => {
    const { fetch } = stubFetch(() => Promise.reject(new Error('ECONNREFUSED')));
    const client = new EdgeServiceClient({ baseUrl: 'https://edge.test', fetch });

    const error = await EffectEx.runPromise(Effect.flip(client.postJson('/ping', {}, Echo)));
    expect(error).toBeInstanceOf(EdgeServiceError);
    expect(error.cause).toBeInstanceOf(Error);
  });
});

describe('Image', () => {
  test('upload posts file field to /upload and returns the hosted URL', async ({ expect }) => {
    const { fetch, calls } = stubFetch(() => json({ id: 'abc', url: 'https://cdn.test/abc/public' }));
    const client = new EdgeServiceClient({ baseUrl: Image.DEFAULT_IMAGE_SERVICE_URL, fetch });
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

    const result = await EffectEx.runPromise(Image.upload(client, blob, { filename: 'pic.png' }));
    expect(result).toEqual({ id: 'abc', url: 'https://cdn.test/abc/public' });
    expect(calls[0].url).toBe(`${Image.DEFAULT_IMAGE_SERVICE_URL}/upload`);
    const form = calls[0].init.body as FormData;
    expect(form.get('file')).toBeInstanceOf(Blob);
  });

  test('thumbnail posts to /thumbnail', async ({ expect }) => {
    const { fetch, calls } = stubFetch(() => json({ url: 'https://cdn.test/x/public' }));
    const client = new EdgeServiceClient({ baseUrl: Image.DEFAULT_IMAGE_SERVICE_URL, fetch });
    const blob = new Blob([new Uint8Array([1])], { type: 'image/png' });

    const result = await EffectEx.runPromise(Image.thumbnail(client, blob));
    expect(result.url).toBe('https://cdn.test/x/public');
    expect(calls[0].url).toBe(`${Image.DEFAULT_IMAGE_SERVICE_URL}/thumbnail`);
  });
});
