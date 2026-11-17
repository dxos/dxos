//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed';
import { SpaceId } from '@dxos/keys';

import { AUTOMERGE_NAMESPACE, DocStore, documentFeedId } from './doc-store.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie);

describe('DocStore', () => {
  it.effect('compaction keeps a chunk the cached copy has not absorbed', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const objectId = 'object';
      const feedStore = new FeedStore({ localActorId: 'test', assignPositions: false });
      yield* feedStore.migrate();
      const append = (data: Uint8Array) =>
        feedStore.appendLocal([
          { spaceId, feedId: documentFeedId(objectId), feedNamespace: AUTOMERGE_NAMESPACE, data },
        ]);
      const setValue = (doc: A.Doc<DatabaseDirectory>, value: number) =>
        A.change(doc, (draft) => {
          draft.objects = { [objectId]: { meta: { keys: [] }, data: { value } } };
        });

      const first = setValue(A.init<DatabaseDirectory>(), 1);
      yield* append(A.save(first));
      const second = setValue(first, 2);
      yield* append(A.saveIncremental(second));

      const docs = new DocStore(feedStore, spaceId);
      yield* docs.load([objectId]);

      // Appended behind the cache's back, as a pulled block is until the indexer absorbs it.
      const third = setValue(A.clone(second), 3);
      yield* append(A.getChanges(second, third).reduce(concatBytes, new Uint8Array()));

      expect(yield* docs.compact([objectId])).toBe(3);

      const reloaded = yield* new DocStore(feedStore, spaceId).load([objectId]);
      expect(reloaded.get(objectId)?.objects?.[objectId]?.data.value).toBe(3);
    }).pipe(Effect.provide(TestLayer)),
  );
});

const concatBytes = (left: Uint8Array, right: Uint8Array): Uint8Array => {
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left);
  result.set(right, left.byteLength);
  return result;
};
