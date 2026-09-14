//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { SandboxClient } from './SandboxClient.ts';

// A 1x1 red PNG: 70 bytes, base64 as the sandbox SDK returns a binary read.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFAAH/VscvDQAAAABJRU5ErkJggg==';
const PNG_BYTES = Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));

describe('SandboxClient.readFileBytes', () => {
  test('decodes a base64 read to the original bytes and keeps the detected type', async ({ expect }) => {
    const { client, layer } = stub({ content: PNG_BASE64, encoding: 'base64', mimeType: 'image/png', size: 70 });
    const result = await EffectEx.runPromise(
      client.readFileBytes('space', 'box', '/workspace/a.png').pipe(Effect.provide(layer)),
    );
    expect(result.type).toBe('image/png');
    expect(result.bytes).toEqual(PNG_BYTES);
  });

  test('re-encodes a utf-8 read as text', async ({ expect }) => {
    const { client, layer } = stub({ content: 'héllo', encoding: 'utf-8', mimeType: 'text/plain' });
    const result = await EffectEx.runPromise(
      client.readFileBytes('space', 'box', '/workspace/a.txt').pipe(Effect.provide(layer)),
    );
    expect(result.type).toBe('text/plain');
    expect(new TextDecoder().decode(result.bytes)).toBe('héllo');
  });

  test('a service that reports only content is read as plain text', async ({ expect }) => {
    const { client, layer } = stub({ content: 'plain' });
    const result = await EffectEx.runPromise(
      client.readFileBytes('space', 'box', '/workspace/a').pipe(Effect.provide(layer)),
    );
    expect(result.type).toBe('text/plain');
    expect(new TextDecoder().decode(result.bytes)).toBe('plain');
  });

  test('base64 without a detected type falls back to octet-stream rather than text', async ({ expect }) => {
    const { client, layer } = stub({ content: PNG_BASE64, encoding: 'base64' });
    const result = await EffectEx.runPromise(
      client.readFileBytes('space', 'box', '/workspace/a').pipe(Effect.provide(layer)),
    );
    expect(result.type).toBe('application/octet-stream');
    expect(result.bytes).toEqual(PNG_BYTES);
  });

  test('a requested encoding travels as a query parameter', async ({ expect }) => {
    const { client, layer, requests } = stub({ content: PNG_BASE64, encoding: 'base64' });
    await EffectEx.runPromise(
      client.readFile('space', 'box', '/workspace/a.png', { encoding: 'base64' }).pipe(Effect.provide(layer)),
    );
    expect(requests[0].pathname).toBe('/spaces/space/sandboxes/box/files');
    expect(requests[0].searchParams.get('path')).toBe('/workspace/a.png');
    expect(requests[0].searchParams.get('encoding')).toBe('base64');
  });
});

/** A client whose every request is answered with `body`, recording the URL it was sent to. */
const stub = (body: unknown) => {
  const requests: URL[] = [];
  const layer = Layer.succeed(HttpClient.HttpClient)(
    HttpClient.make((request, url) => {
      requests.push(url);
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
        ),
      );
    }),
  );
  return { requests, layer, client: new SandboxClient('http://localhost:8792', async () => undefined) };
};
