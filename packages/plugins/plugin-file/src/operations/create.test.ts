//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Blob, Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { FilePlugin } from '#plugin';
import { FileCapabilities, FileOperation } from '#types';

import { FileTooLargeError, UnsupportedFileTypeError } from './create';

describe('FileOperation.Create', () => {
  test('uploads a small PNG to the default (inline) backend', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await harness.runPromise(
      Effect.gen(function* () {
        const { object } = yield* Operation.invoke(
          FileOperation.Create,
          { file: makeFile('icon.png', 'image/png', bytes), db: defaultSpace.db },
          { spaceId: defaultSpace.id },
        );

        expect(object.name).toBe('icon.png');

        const blob = yield* Database.load(object.data);
        expect(blob.type).toBe('image/png');
        expect(blob.size).toBe(bytes.byteLength);
        expect(blob.data._tag).toBe('inline');
      }),
    );
  });

  test('uploads via the Blob registry default when no Settings.backend is configured', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    // Mimics `@dxos/client` registering 'edge' as the default once configured — a second
    // storage backend registered with `{ default: true }`, with a matching FileCapabilities
    // descriptor contributed (as plugin-file's own EdgeBackend module would).
    const store = new Map<string, Uint8Array>();
    const cleanup = defaultSpace.db.graph.registerBlobBackend(
      'mem',
      {
        schemes: ['mem'],
        put: async ({ data, contentHash }) => {
          const uri = `mem:${contentHash}`;
          store.set(uri, data);
          return { uri };
        },
        get: async ({ uri }) => store.get(uri),
        has: async ({ uri }) => store.has(uri),
      },
      { default: true },
    );
    harness.capabilities.contribute({
      module: 'test',
      interface: FileCapabilities.Backend,
      implementation: { name: 'Mem', storage: 'mem' },
    });

    try {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      await harness.runPromise(
        Effect.gen(function* () {
          // No Settings.backend configured — should resolve to the registry's default ('mem'),
          // not the plugin's own 'inline' descriptor.
          const { object } = yield* Operation.invoke(
            FileOperation.Create,
            { file: makeFile('data.bin', 'image/png', bytes), db: defaultSpace.db },
            { spaceId: defaultSpace.id },
          );

          const blob = yield* Database.load(object.data);
          expect(blob.data._tag).toBe('external');
          expect(blob.data._tag === 'external' && blob.data.uri).toMatch(/^mem:/);
        }),
      );
    } finally {
      cleanup();
    }
  });

  // `text/html` rather than `text/plain`: plain text is accepted now, and HTML is the type the
  // allowlist most needs to keep out — a stored HTML file served from the blob origin executes.
  test('rejects unsupported MIME types', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const error = await harness.runPromise(
      Operation.invoke(
        FileOperation.Create,
        { file: makeFile('page.html', 'text/html', new Uint8Array(8)), db: defaultSpace.db },
        { spaceId: defaultSpace.id },
      ).pipe(Effect.catchCause((cause) => Effect.succeed(Cause.squash(cause)))),
    );
    expect(error).toBeInstanceOf(UnsupportedFileTypeError);
  });

  test('rejects files larger than the inline cap on the inline backend', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const oversized = new Uint8Array(Blob.MAX_INLINE_SIZE + 1);
    const error = await harness.runPromise(
      Operation.invoke(
        FileOperation.Create,
        { file: makeFile('big.png', 'image/png', oversized), db: defaultSpace.db },
        { spaceId: defaultSpace.id },
      ).pipe(Effect.catchCause((cause) => Effect.succeed(Cause.squash(cause)))),
    );
    expect(error).toBeInstanceOf(FileTooLargeError);
  });
});

const makeFile = (name: string, type: string, bytes: Uint8Array): globalThis.File =>
  new globalThis.File([bytes as BlobPart], name, { type });

const setup = async () => {
  const harness = await createComposerTestApp({ plugins: [ClientPlugin.make({}), FilePlugin()] });
  // The node plugin variant omits the browser-only `InlineBackend` module (settings UI, etc.) —
  // contribute the descriptor directly so `resolveActiveStorage` has something to resolve.
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
