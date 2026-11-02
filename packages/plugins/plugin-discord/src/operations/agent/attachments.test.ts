//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { fromDigestHex } from '@dxos/blob';
import { Blob, Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { File } from '@dxos/types';

import { DiscordBot } from '#types';

import { resolveAttachments } from './attachments.ts';

const KEY = 'ab'.repeat(32);

const addFile = Effect.fnUntraced(function* (name: string, blob: Parameters<typeof Blob.make>[0]) {
  const data = yield* Database.add(Blob.make(blob));
  return yield* Database.add(File.make({ name, data: Ref.make(data) }));
});

const TestLayer = TestDatabaseLayer({ types: [File.File, Blob.Blob] });

describe('resolveAttachments', () => {
  it.effect('names each file by the blob-store key its digest is', () =>
    Effect.gen(function* () {
      const file = yield* addFile('demo.webm', {
        type: 'video/webm',
        size: 1234,
        data: Blob.externalData(fromDigestHex(KEY)),
      });
      expect(yield* resolveAttachments([Ref.make(file)])).toEqual([
        { key: KEY, name: 'demo.webm', type: 'video/webm', size: 1234 },
      ]);
      expect(yield* resolveAttachments(undefined)).toBeUndefined();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('refuses a file held inline, larger than Discord takes, or with a malformed blob URI', () =>
    Effect.gen(function* () {
      const inline = yield* addFile('note.txt', { size: 2, data: Blob.inlineData(new Uint8Array([1, 2])) });
      const exit = yield* Effect.exit(resolveAttachments([Ref.make(inline)]));
      expect(Exit.isFailure(exit) && String(exit.cause)).toMatch(/not in blob storage/);

      const huge = yield* addFile('huge.mp4', {
        size: DiscordBot.MAX_ATTACHMENT_BYTES + 1,
        data: Blob.externalData(fromDigestHex(KEY)),
      });
      const tooLarge = yield* Effect.exit(resolveAttachments([Ref.make(huge)]));
      expect(Exit.isFailure(tooLarge) && String(tooLarge.cause)).toMatch(/Discord takes at most/);

      const malformed = yield* addFile('bad.png', { size: 3, data: Blob.externalData('ni:///sha-256;') });
      const badUri = yield* Effect.exit(resolveAttachments([Ref.make(malformed)]));
      expect(Exit.isFailure(badUri) && String(badUri.cause)).toMatch(/malformed blob URI/);
    }).pipe(Effect.provide(TestLayer)),
  );
});
