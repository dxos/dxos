//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlError from 'effect/sql/SqlError';

import { type DatabaseDirectory, type EntityStructure } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed';
import { invariant } from '@dxos/invariant';
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

  it.effect('a failed persist is appended in full by the next one', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const objectId = 'object';
      let failNext = false;
      const feedStore = new FeedStore({ localActorId: 'test', assignPositions: false });
      const appendLocal = feedStore.appendLocal;
      feedStore.appendLocal = (messages) =>
        failNext
          ? Effect.fail(
              new SqlError.SqlError({ reason: new SqlError.UnknownError({ cause: new Error('append failed') }) }),
            )
          : appendLocal(messages);
      yield* feedStore.migrate();

      const docs = new DocStore(feedStore, spaceId);
      const first = A.change(A.init<DatabaseDirectory>(), (draft) => {
        draft.objects = { [objectId]: { meta: { keys: [] }, data: { value: 1 } } };
      });
      yield* feedStore.appendLocal([
        { spaceId, feedId: documentFeedId(objectId), feedNamespace: AUTOMERGE_NAMESPACE, data: A.save(first) },
      ]);
      yield* docs.load([objectId]);
      const setValue = (value: number) =>
        docs.change(objectId, (draft) => {
          const object = draft.objects?.[objectId];
          if (object) {
            object.data.value = value;
          }
        });

      expect(setValue(2)).toBe(true);
      failNext = true;
      yield* Effect.flip(docs.persist([objectId]));
      failNext = false;
      yield* docs.persist([objectId]);

      const reloaded = yield* new DocStore(feedStore, spaceId).load([objectId]);
      expect(reloaded.get(objectId)?.objects?.[objectId]?.data.value).toBe(2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a write after a failed persist appends the failed edit too', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const objectId = 'object';
      let failNext = false;
      const feedStore = new FeedStore({ localActorId: 'test', assignPositions: false });
      const appendLocal = feedStore.appendLocal;
      feedStore.appendLocal = (messages) =>
        failNext
          ? Effect.fail(
              new SqlError.SqlError({ reason: new SqlError.UnknownError({ cause: new Error('append failed') }) }),
            )
          : appendLocal(messages);
      yield* feedStore.migrate();

      const docs = new DocStore(feedStore, spaceId);
      const first = A.change(A.init<DatabaseDirectory>(), (draft) => {
        draft.objects = { [objectId]: { meta: { keys: [] }, data: { value: 1 } } };
      });
      yield* feedStore.appendLocal([
        { spaceId, feedId: documentFeedId(objectId), feedNamespace: AUTOMERGE_NAMESPACE, data: A.save(first) },
      ]);
      yield* docs.load([objectId]);
      docs.change(objectId, (draft) => {
        const object = draft.objects?.[objectId];
        if (object) {
          object.data.extra = 'from the failed persist';
        }
      });
      failNext = true;
      yield* Effect.flip(docs.persist([objectId]));
      failNext = false;

      const doc = docs.peek(objectId);
      invariant(doc);
      const current: EntityStructure | undefined = A.toJS(doc).objects?.[objectId];
      invariant(current);
      yield* docs.write([{ id: objectId, structure: { ...current, data: { ...current.data, value: 2 } } }]);

      const reloaded = yield* new DocStore(feedStore, spaceId).load([objectId]);
      expect(reloaded.get(objectId)?.objects?.[objectId]?.data).toMatchObject({
        value: 2,
        extra: 'from the failed persist',
      });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('an edit made while a write is appending is kept', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const objectId = 'object';
      const feedStore = new FeedStore({ localActorId: 'test', assignPositions: false });
      yield* feedStore.migrate();
      const first = A.change(A.init<DatabaseDirectory>(), (draft) => {
        draft.objects = { [objectId]: { meta: { keys: [] }, data: { value: 1 } } };
      });
      yield* feedStore.appendLocal([
        { spaceId, feedId: documentFeedId(objectId), feedNamespace: AUTOMERGE_NAMESPACE, data: A.save(first) },
      ]);

      const docs = new DocStore(feedStore, spaceId);
      yield* docs.load([objectId]);
      const doc = docs.peek(objectId);
      invariant(doc);
      const current: EntityStructure | undefined = A.toJS(doc).objects?.[objectId];
      invariant(current);

      // The edit lands while the write's append is pending, as a synchronous history read's would.
      const appendLocal = feedStore.appendLocal;
      feedStore.appendLocal = (messages) => {
        docs.change(objectId, (draft) => {
          const object = draft.objects?.[objectId];
          if (object) {
            object.data.extra = 'during the append';
          }
        });
        feedStore.appendLocal = appendLocal;
        return appendLocal(messages);
      };
      yield* docs.write([{ id: objectId, structure: { ...current, data: { ...current.data, value: 2 } } }]);
      yield* docs.persist([objectId]);

      const reloaded = yield* new DocStore(feedStore, spaceId).load([objectId]);
      expect(reloaded.get(objectId)?.objects?.[objectId]?.data).toMatchObject({ value: 2, extra: 'during the append' });
    }).pipe(Effect.provide(TestLayer)),
  );
});

const concatBytes = (left: Uint8Array, right: Uint8Array): Uint8Array => {
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left);
  result.set(right, left.byteLength);
  return result;
};
