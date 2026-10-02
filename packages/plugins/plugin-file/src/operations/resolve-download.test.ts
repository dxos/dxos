//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { fromDigestHex } from '@dxos/blob';
import * as Operation from '@dxos/compute/Operation';
import { Blob, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Harness from '@dxos/plugin-testing/Harness';
import { File } from '@dxos/types';

import { FilePlugin } from '#plugin';
import { FileOperation } from '#types';

import { DownloadNotAvailableError } from './resolve-download.ts';

const DIGEST = 'a'.repeat(64);

describe('FileOperation.ResolveDownload', () => {
  test('names a content-addressed file by its digest', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const blob = defaultSpace.db.add(
      Blob.make({ type: 'video/webm', size: 1234, data: Blob.externalData(fromDigestHex(DIGEST)) }),
    );
    const file = defaultSpace.db.add(File.make({ name: 'capture.webm', data: Ref.make(blob) }));
    const prepared = await harness.runPromise(
      Operation.invoke(FileOperation.ResolveDownload, { file: Ref.make(file) }, { spaceId: defaultSpace.id }),
    );

    expect(prepared).toEqual({ downloadId: DIGEST, name: 'capture.webm', type: 'video/webm', size: 1234 });
  });

  test('refuses a file stored inline', async ({ expect }) => {
    const { harness, defaultSpace } = await setup();
    await using _harness = harness;

    const bytes = new Uint8Array([1, 2, 3]);
    const blob = defaultSpace.db.add(
      Blob.make({ type: 'text/plain', size: bytes.byteLength, data: Blob.inlineData(bytes) }),
    );
    const file = defaultSpace.db.add(File.make({ name: 'notes.txt', data: Ref.make(blob) }));
    const error = await harness.runPromise(
      Operation.invoke(FileOperation.ResolveDownload, { file: Ref.make(file) }, { spaceId: defaultSpace.id }).pipe(
        Effect.catchCause((cause) => Effect.succeed(Cause.squash(cause))),
      ),
    );

    expect(error).toBeInstanceOf(DownloadNotAvailableError);
  });
});

const setup = async () => {
  const harness = await Harness.createComposerTestApp({ plugins: [ClientPlugin.make({}), FilePlugin()] });
  const { defaultSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesAvailable);
  return { harness, defaultSpace };
};
