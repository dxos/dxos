//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, ObjectId, SpaceId } from '@dxos/keys';

import { FtsIndex } from './fts-index';
import { ObjectMetaIndex } from './object-meta-index';
import type { IndexerObject } from './interface';

const TYPE_PERSON = DXN.parse('dxn:type:example.com/type/Person:0.1.0').toString();
const TYPE_DEFAULT = DXN.parse('dxn:type:test.com/type/Type:0.1.0').toString();

const TestLayer = Layer.merge(
  SqliteClient.layer({
    filename: ':memory:',
  }),
  Reactivity.layer,
);

describe('FtsIndex', () => {
  it.effect(
    'should create an FTS5 table on migrate',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      yield* index.migrate();

      const sql = yield* SqlClient.SqlClient;
      const result = yield* sql`SELECT sql FROM sqlite_master WHERE name = 'ftsIndex'`;

      expect(result).toHaveLength(1);
      expect(result[0].sql).toMatch(/fts5/i);
      expect(result[0].sql).toMatch(/snapshot/i);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should insert snapshots and query them via MATCH',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      const metaIndex = new ObjectMetaIndex();
      yield* index.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          documentId: 'doc-1',
          recordId: null,
          data: {
            id: ObjectId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Hello Effect',
            body: 'This is a message about Effect and SQL.',
          },
        },
      ];

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* index.update(objects);

      const match = yield* index.query({ query: 'Effect' });
      expect(match.length).toBeGreaterThan(0);
      expect(match[0].objectId).toBe(objects[0].data.id);

      const noMatch = yield* index.query({ query: 'DefinitelyNotPresent' });
      expect(noMatch).toHaveLength(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should upsert objects on update',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      const metaIndex = new ObjectMetaIndex();
      yield* index.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objectId = ObjectId.random();

      // Initial insert.
      const obj1: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-1',
        recordId: null,
        data: {
          id: objectId,
          [ATTR_TYPE]: DXN.parse('dxn:type:example.com/type/Person:0.1.0').toString(),
          title: 'Original Title',
        },
      };
      yield* metaIndex.update([obj1]);
      yield* metaIndex.lookupRecordIds([obj1]);
      yield* index.update([obj1]);

      let match = yield* index.query({ query: 'Original' });
      expect(match.length).toBe(1);

      // Update with same doc id and object id.
      const obj2: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-1',
        recordId: null,
        data: {
          id: objectId,
          [ATTR_TYPE]: TYPE_DEFAULT,
          title: 'Updated Title',
        },
      };
      // Meta index update is required if metadata changed, but for FTS query to work, we just need the join to succeed.
      // recordId is persistent.
      yield* metaIndex.update([obj2]);
      yield* metaIndex.lookupRecordIds([obj2]);
      yield* index.update([obj2]);

      // Old content should be gone.
      match = yield* index.query({ query: 'Original' });
      expect(match.length).toBe(0);

      // New content should exist.
      match = yield* index.query({ query: 'Updated' });
      expect(match.length).toBe(1);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should handle non-sequential recordIds',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      const metaIndex = new ObjectMetaIndex();
      yield* index.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          documentId: 'doc-100',
          recordId: null,
          data: {
            id: ObjectId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Alpha Document',
          },
        },
        {
          spaceId,
          queueId: null,
          documentId: 'doc-200',
          recordId: null,
          data: {
            id: ObjectId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Beta Document',
          },
        },
        {
          spaceId,
          queueId: null,
          documentId: 'doc-1000',
          recordId: null,
          data: {
            id: ObjectId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Gamma Document',
          },
        },
      ];

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* index.update(objects);

      // All documents should be queryable.
      const alphaMatch = yield* index.query({ query: 'Alpha' });
      expect(alphaMatch).toHaveLength(1);

      // Query that matches all.
      const allMatch = yield* index.query({ query: 'Document' });
      expect(allMatch).toHaveLength(3);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should query from one space only',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      const metaIndex = new ObjectMetaIndex();
      yield* index.migrate();
      yield* metaIndex.migrate();

      const space1 = SpaceId.random();
      const space2 = SpaceId.random();

      const obj1: IndexerObject = {
        spaceId: space1,
        queueId: null,
        documentId: 'doc-s1',
        recordId: null,
        data: {
          id: ObjectId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space One Content',
        },
      };

      const obj2: IndexerObject = {
        spaceId: space2,
        queueId: null,
        documentId: 'doc-s2',
        recordId: null,
        data: {
          id: ObjectId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space Two Content',
        },
      };

      yield* metaIndex.update([obj1, obj2]);
      yield* metaIndex.lookupRecordIds([obj1, obj2]);
      yield* index.update([obj1, obj2]);

      // Query without spaceId should return both (if term matches both) or specific one
      // Let's search for "Content" which is in both
      const allMatches = yield* index.query({ query: 'Content' });
      expect(allMatches).toHaveLength(2);

      // Query space 1
      const s1Matches = yield* index.query({ query: 'Content', spaceId: space1 });
      expect(s1Matches).toHaveLength(1);
      expect(s1Matches[0].objectId).toBe(obj1.data.id);

      // Query space 2
      const s2Matches = yield* index.query({ query: 'Content', spaceId: space2 });
      expect(s2Matches).toHaveLength(1);
      expect(s2Matches[0].objectId).toBe(obj2.data.id);
    }, Effect.provide(TestLayer)),
  );
});
