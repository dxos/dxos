//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Blob, Database, Err } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import { EchoTestBuilder } from '../testing';
import { fromDigestHex } from './ni-uri';

describe('Blob', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('inline roundtrip', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    const bytes = new Uint8Array([1, 2, 3, 4]);
    await Effect.gen(function* () {
      const blob = yield* Blob.fromBytes(bytes, { type: 'application/octet-stream' });
      expect(blob.data._tag).toBe('inline');
      yield* Database.add(blob);

      const loaded = yield* Blob.read(blob);
      expect(loaded).toEqual(bytes);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('exceeding MAX_INLINE_SIZE fails with BlobTooLargeError', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    const bytes = new Uint8Array(Blob.MAX_INLINE_SIZE + 1);
    await expect(
      Effect.gen(function* () {
        yield* Blob.fromBytes(bytes);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors),
    ).rejects.toBeInstanceOf(Err.BlobTooLargeError);
  });

  test('external backend roundtrip via a registered scheme', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    const store = new Map<string, Uint8Array>();
    const cleanup = db.graph.registerBlobBackend('mem', {
      schemes: ['mem'],
      put: async ({ data, contentHash }) => {
        const uri = `mem:${contentHash}`;
        store.set(uri, data);
        return { uri };
      },
      get: async ({ uri }) => store.get(uri),
      has: async ({ uri }) => store.has(uri),
    });

    const bytes = new Uint8Array([9, 8, 7]);
    try {
      await Effect.gen(function* () {
        const blob = yield* Blob.fromBytes(bytes, { storage: 'mem' });
        expect(blob.data._tag).toBe('external');
        expect(blob.data._tag === 'external' && blob.data.uri).toMatch(/^mem:/);
        yield* Database.add(blob);

        const loaded = yield* Blob.read(blob);
        expect(loaded).toEqual(bytes);

        const exists = yield* Blob.exists(blob);
        expect(exists).toBe(true);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    } finally {
      cleanup();
    }
  });

  test('ni scheme roundtrip via a content-addressed backend', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    const store = new Map<string, Uint8Array>();
    const cleanup = db.graph.registerBlobBackend('edge-test', {
      schemes: [Blob.Scheme.ni],
      put: async ({ data, contentHash }) => {
        const uri = fromDigestHex(contentHash);
        store.set(uri, data);
        return { uri };
      },
      get: async ({ uri }) => store.get(uri),
      has: async ({ uri }) => store.has(uri),
    });

    const bytes = new Uint8Array([9, 8, 7]);
    try {
      await Effect.gen(function* () {
        const blob = yield* Blob.fromBytes(bytes, { storage: 'edge-test' });
        expect(blob.data._tag).toBe('external');
        expect(blob.data._tag === 'external' && blob.data.uri).toMatch(/^ni:\/\/\/sha-256;/);
        yield* Database.add(blob);

        const loaded = yield* Blob.read(blob);
        expect(loaded).toEqual(bytes);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    } finally {
      cleanup();
    }
  });

  test('unregistered scheme fails with BlobNotAvailableError', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    const blob = Blob.make({ size: 3, data: Blob.externalData('missing:abc') });

    await expect(
      Effect.gen(function* () {
        yield* Database.add(blob);
        yield* Blob.read(blob);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors),
    ).rejects.toMatchObject({
      name: 'BlobNotAvailableError',
      context: { reason: 'backend-not-registered' },
    });
  });

  test('url returns a data: URL for inline blobs', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    const bytes = new Uint8Array([1, 2, 3]);
    await Effect.gen(function* () {
      const blob = yield* Blob.fromBytes(bytes, { type: 'image/png' });
      yield* Database.add(blob);

      const url = yield* Blob.url(blob);
      expect(Option.isSome(url)).toBe(true);
      expect(Option.getOrThrow(url)).toMatch(/^data:image\/png;base64,/);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('url resolves via the backend getUrl for external blobs', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    const cleanup = db.graph.registerBlobBackend('mem-url', {
      schemes: ['memurl'],
      put: async ({ contentHash }) => ({ uri: `memurl:${contentHash}` }),
      get: async () => new Uint8Array([1]),
      has: async () => true,
      getUrl: async ({ uri }) => `https://example.com/${uri}`,
    });

    const bytes = new Uint8Array([1]);
    try {
      await Effect.gen(function* () {
        const blob = yield* Blob.fromBytes(bytes, { storage: 'mem-url' });
        yield* Database.add(blob);

        const url = yield* Blob.url(blob);
        expect(Option.isSome(url)).toBe(true);
        expect(Option.getOrThrow(url)).toMatch(/^https:\/\/example\.com\/memurl:/);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    } finally {
      cleanup();
    }
  });
});
