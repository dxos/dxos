//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Blob, Database, Err, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';

import * as File from './File';

describe('File', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('fromBytes creates a File referencing an added Blob', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [File.File, Blob.Blob] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    const bytes = new Uint8Array([1, 2, 3, 4]);
    await Effect.gen(function* () {
      const file = yield* File.fromBytes(bytes, { name: 'photo.png', type: 'image/png' });
      yield* Database.add(file);

      expect(file.name).toBe('photo.png');
      expect(file.type).toBe('image/png');
      expect(file.size).toBe(bytes.byteLength);

      const blob = yield* Database.load(file.data);
      expect(blob.data._tag).toBe('inline');

      const loaded = yield* Blob.read(blob);
      expect(loaded).toEqual(bytes);

      // The File parents its Blob — deleting the File deletes the Blob with it.
      expect(Obj.getParent(blob)).toBe(file);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('fromBytes fails with BlobTooLargeError over the inline cap', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [File.File, Blob.Blob] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    const bytes = new Uint8Array(Blob.MAX_INLINE_SIZE + 1);
    await expect(
      Effect.gen(function* () {
        yield* File.fromBytes(bytes, { name: 'big.bin', type: 'application/octet-stream' });
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors),
    ).rejects.toBeInstanceOf(Err.BlobTooLargeError);
  });
});
