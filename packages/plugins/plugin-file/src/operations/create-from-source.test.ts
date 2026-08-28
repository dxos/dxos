//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import { afterEach, describe, test, vi } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Blob, Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { FilePlugin } from '#plugin';
import { FileCapabilities, FileOperation } from '#types';

import { FileReadError, FileTooLargeError, UnsupportedFileTypeError } from './create';
import { MAX_INLINE_SOURCE_BYTES } from './create-from-source';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Chunked because spreading a megabyte of bytes into `fromCharCode` overflows the call stack. */
const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
};

describe('FileOperation.CreateFromSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('creates a file from base64 content', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    await harness.runPromise(
      Effect.gen(function* () {
        const { object } = yield* Operation.invoke(
          FileOperation.CreateFromSource,
          { source: { type: 'base64', mediaType: 'image/png', data: toBase64(PNG) }, name: 'icon.png' },
          { spaceId: defaultSpace.id },
        );

        expect(object.name).toBe('icon.png');
        const blob = yield* Database.load(object.data);
        expect(blob.type).toBe('image/png');
        expect(blob.size).toBe(PNG.byteLength);
      }),
    );
  });

  // A model wrapping a long base64 string is the common case, and `atob` rejects whitespace.
  test('tolerates whitespace in the encoded payload', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const wrapped = toBase64(PNG).replace(/(.{4})/g, '$1\n');
    await harness.runPromise(
      Effect.gen(function* () {
        const { object } = yield* Operation.invoke(
          FileOperation.CreateFromSource,
          { source: { type: 'base64', mediaType: 'image/png', data: wrapped } },
          { spaceId: defaultSpace.id },
        );
        const blob = yield* Database.load(object.data);
        expect(blob.size).toBe(PNG.byteLength);
      }),
    );
  });

  test('accepts the newly-allowed text types', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    for (const mediaType of ['text/plain', 'text/csv', 'text/markdown', 'application/json']) {
      await harness.runPromise(
        Effect.gen(function* () {
          const { object } = yield* Operation.invoke(
            FileOperation.CreateFromSource,
            { source: { type: 'base64', mediaType, data: toBase64(new Uint8Array([65, 66])) } },
            { spaceId: defaultSpace.id },
          );
          const blob = yield* Database.load(object.data);
          expect(blob.type, mediaType).toBe(mediaType);
        }),
      );
    }
  });

  // The one type the widened allowlist must keep out; see FileLimits.
  test('rejects text/html', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const error = await harness.runPromise(
      Operation.invoke(
        FileOperation.CreateFromSource,
        { source: { type: 'base64', mediaType: 'text/html', data: toBase64(new Uint8Array([60])) } },
        { spaceId: defaultSpace.id },
      ).pipe(Effect.catchCause((cause) => Effect.succeed(Cause.squash(cause)))),
    );
    expect(error).toBeInstanceOf(UnsupportedFileTypeError);
  });

  test('rejects a base64 payload over the inline cap', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const error = await harness.runPromise(
      Operation.invoke(
        FileOperation.CreateFromSource,
        {
          source: {
            type: 'base64',
            mediaType: 'image/png',
            data: toBase64(new Uint8Array(MAX_INLINE_SOURCE_BYTES + 1)),
          },
        },
        { spaceId: defaultSpace.id },
      ).pipe(Effect.catchCause((cause) => Effect.succeed(Cause.squash(cause)))),
    );
    expect(error).toBeInstanceOf(FileTooLargeError);
  });

  test('fetches the http arm and trusts the response content-type', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(PNG, { headers: { 'content-type': 'image/png' } })),
    );

    await harness.runPromise(
      Effect.gen(function* () {
        const { object } = yield* Operation.invoke(
          FileOperation.CreateFromSource,
          { source: { type: 'http', url: 'https://example.com/icon.png' }, name: 'from-url.png' },
          { spaceId: defaultSpace.id },
        );
        const blob = yield* Database.load(object.data);
        expect(blob.type).toBe('image/png');
        expect(blob.size).toBe(PNG.byteLength);
      }),
    );
  });

  // The guard is the reason this arm can be exposed to a model at all.
  test('refuses a private address on the http arm', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const error = await harness.runPromise(
      Operation.invoke(
        FileOperation.CreateFromSource,
        { source: { type: 'http', url: 'https://169.254.169.254/latest/meta-data/' } },
        { spaceId: defaultSpace.id },
      ).pipe(Effect.catchCause((cause) => Effect.succeed(Cause.squash(cause)))),
    );
    expect(error).toBeInstanceOf(FileReadError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('refuses a plaintext URL on the http arm', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const error = await harness.runPromise(
      Operation.invoke(
        FileOperation.CreateFromSource,
        { source: { type: 'http', url: 'http://example.com/icon.png' } },
        { spaceId: defaultSpace.id },
      ).pipe(Effect.catchCause((cause) => Effect.succeed(Cause.squash(cause)))),
    );
    expect(error).toBeInstanceOf(FileReadError);
  });

  test('rejects a response that declares no content-type', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(PNG, { headers: {} })),
    );

    const error = await harness.runPromise(
      Operation.invoke(
        FileOperation.CreateFromSource,
        { source: { type: 'http', url: 'https://example.com/icon.png' } },
        { spaceId: defaultSpace.id },
      ).pipe(Effect.catchCause((cause) => Effect.succeed(Cause.squash(cause)))),
    );
    expect(error).toBeInstanceOf(UnsupportedFileTypeError);
  });
});

const setup = async () => {
  const harness = await createComposerTestApp({ plugins: [ClientPlugin.make({}), FilePlugin()] });
  harness.capabilities.contribute({
    module: 'test',
    interface: FileCapabilities.Backend,
    implementation: { name: 'Inline (ECHO)', storage: Blob.Storage.inline },
  });

  const { defaultSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return { harness, defaultSpace };
};
