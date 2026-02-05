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
import type { IndexerObject } from './interface';
import { ObjectMetaIndex } from './object-meta-index';

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

      const match = yield* index.query({ query: 'Effect', spaceId: null, includeAllQueues: false, queueIds: null });
      expect(match.length).toBeGreaterThan(0);
      expect(match[0].objectId).toBe(objects[0].data.id);

      const noMatch = yield* index.query({
        query: 'DefinitelyNotPresent',
        spaceId: null,
        includeAllQueues: false,
        queueIds: null,
      });
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

      let match = yield* index.query({ query: 'Original', spaceId: null, includeAllQueues: false, queueIds: null });
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
      match = yield* index.query({ query: 'Original', spaceId: null, includeAllQueues: false, queueIds: null });
      expect(match.length).toBe(0);

      // New content should exist.
      match = yield* index.query({ query: 'Updated', spaceId: null, includeAllQueues: false, queueIds: null });
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
      const alphaMatch = yield* index.query({
        query: 'Alpha',
        spaceId: null,
        includeAllQueues: false,
        queueIds: null,
      });
      expect(alphaMatch).toHaveLength(1);

      // Query that matches all.
      const allMatch = yield* index.query({
        query: 'Document',
        spaceId: null,
        includeAllQueues: false,
        queueIds: null,
      });
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
      const allMatches = yield* index.query({
        query: 'Content',
        spaceId: null,
        includeAllQueues: false,
        queueIds: null,
      });
      expect(allMatches).toHaveLength(2);

      // Query space 1
      const s1Matches = yield* index.query({
        query: 'Content',
        spaceId: [space1],
        includeAllQueues: false,
        queueIds: null,
      });
      expect(s1Matches).toHaveLength(1);
      expect(s1Matches[0].objectId).toBe(obj1.data.id);

      // Query space 2
      const s2Matches = yield* index.query({
        query: 'Content',
        spaceId: [space2],
        includeAllQueues: false,
        queueIds: null,
      });
      expect(s2Matches).toHaveLength(1);
      expect(s2Matches[0].objectId).toBe(obj2.data.id);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'partial word matches',
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
            title: 'Programming in TypeScript',
            body: 'Learn about functional programming patterns.',
          },
        },
        {
          spaceId,
          queueId: null,
          documentId: 'doc-2',
          recordId: null,
          data: {
            id: ObjectId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Database Design',
            body: 'Understanding program architecture.',
          },
        },
      ];

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* index.update(objects);

      const defaultQuery = { spaceId: null, includeAllQueues: false, queueIds: null } as const;

      // Full word matches exactly.
      const exactMatch = yield* index.query({ query: 'Programming', ...defaultQuery });
      expect(exactMatch).toHaveLength(1);
      expect(exactMatch[0].objectId).toBe(objects[0].data.id);

      // Empty query should return no results.
      const emptyMatch = yield* index.query({ query: '', ...defaultQuery });
      expect(emptyMatch).toHaveLength(0);

      // Single character query should return all results.
      const singleCharMatch = yield* index.query({ query: 'P', ...defaultQuery });
      expect(singleCharMatch).toHaveLength(2);

      // Trigram tokenizer enables substring matching - partial words match.
      const partialMatch = yield* index.query({ query: 'Prog', ...defaultQuery });
      expect(partialMatch).toHaveLength(2);

      // Substring in the middle of a word matches (trigram).
      const substringMatch = yield* index.query({ query: 'rog', ...defaultQuery });
      expect(substringMatch).toHaveLength(2); // "Programming" and "program" both contain "rog".

      // Multiple words query matches documents containing all substrings.
      const multiWord = yield* index.query({ query: 'program architecture', ...defaultQuery });
      expect(multiWord).toHaveLength(1);
      expect(multiWord[0].objectId).toBe(objects[1].data.id);

      // Wrong order of words still matches (implicit AND).
      const wrongOrderMatch = yield* index.query({ query: 'architecture program', ...defaultQuery });
      expect(wrongOrderMatch).toHaveLength(1);

      // Phrase query with double quotes for exact sequence.
      const phraseMatch = yield* index.query({ query: 'functional programming', ...defaultQuery });
      expect(phraseMatch).toHaveLength(1);
      expect(phraseMatch[0].objectId).toBe(objects[0].data.id);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should query from specific queues',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      const metaIndex = new ObjectMetaIndex();
      yield* index.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const queue1 = ObjectId.random();
      const queue2 = ObjectId.random();

      const spaceObj: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-space',
        recordId: null,
        data: {
          id: ObjectId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space Content',
        },
      };

      const queue1Obj: IndexerObject = {
        spaceId,
        queueId: queue1,
        documentId: null,
        recordId: null,
        data: {
          id: ObjectId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Queue One Content',
        },
      };

      const queue2Obj: IndexerObject = {
        spaceId,
        queueId: queue2,
        documentId: null,
        recordId: null,
        data: {
          id: ObjectId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Queue Two Content',
        },
      };

      yield* metaIndex.update([spaceObj, queue1Obj, queue2Obj]);
      yield* metaIndex.lookupRecordIds([spaceObj, queue1Obj, queue2Obj]);
      yield* index.update([spaceObj, queue1Obj, queue2Obj]);

      // Query specific queue only.
      const q1Matches = yield* index.query({
        query: 'Content',
        spaceId: null,
        includeAllQueues: false,
        queueIds: [queue1],
      });
      expect(q1Matches).toHaveLength(1);
      expect(q1Matches[0].objectId).toBe(queue1Obj.data.id);

      // Query multiple queues.
      const bothQueuesMatches = yield* index.query({
        query: 'Content',
        spaceId: null,
        includeAllQueues: false,
        queueIds: [queue1, queue2],
      });
      expect(bothQueuesMatches).toHaveLength(2);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should query with includeAllQueues',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      const metaIndex = new ObjectMetaIndex();
      yield* index.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const queueId = ObjectId.random();

      const spaceObj: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-space',
        recordId: null,
        data: {
          id: ObjectId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space Content',
        },
      };

      const queueObj: IndexerObject = {
        spaceId,
        queueId,
        documentId: null,
        recordId: null,
        data: {
          id: ObjectId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Queue Content',
        },
      };

      yield* metaIndex.update([spaceObj, queueObj]);
      yield* metaIndex.lookupRecordIds([spaceObj, queueObj]);
      yield* index.update([spaceObj, queueObj]);

      // Query space without includeAllQueues - should only return space object.
      const spaceOnlyMatches = yield* index.query({
        query: 'Content',
        spaceId: [spaceId],
        includeAllQueues: false,
        queueIds: null,
      });
      expect(spaceOnlyMatches).toHaveLength(1);
      expect(spaceOnlyMatches[0].objectId).toBe(spaceObj.data.id);

      // Query space with includeAllQueues - should return both.
      const allMatches = yield* index.query({
        query: 'Content',
        spaceId: [spaceId],
        includeAllQueues: true,
        queueIds: null,
      });
      expect(allMatches).toHaveLength(2);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should OR space and queue constraints',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      const metaIndex = new ObjectMetaIndex();
      yield* index.migrate();
      yield* metaIndex.migrate();

      const space1 = SpaceId.random();
      const space2 = SpaceId.random();
      const queueInSpace2 = ObjectId.random();

      const space1Obj: IndexerObject = {
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

      const space2Obj: IndexerObject = {
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

      const queueObj: IndexerObject = {
        spaceId: space2,
        queueId: queueInSpace2,
        documentId: null,
        recordId: null,
        data: {
          id: ObjectId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Queue Content',
        },
      };

      yield* metaIndex.update([space1Obj, space2Obj, queueObj]);
      yield* metaIndex.lookupRecordIds([space1Obj, space2Obj, queueObj]);
      yield* index.update([space1Obj, space2Obj, queueObj]);

      // Query space1 OR specific queue in space2 - should return space1 object and queue object.
      const orMatches = yield* index.query({
        query: 'Content',
        spaceId: [space1],
        includeAllQueues: false,
        queueIds: [queueInSpace2],
      });
      expect(orMatches).toHaveLength(2);
      const objectIds = orMatches.map((m) => m.objectId);
      expect(objectIds).toContain(space1Obj.data.id);
      expect(objectIds).toContain(queueObj.data.id);
      // Should NOT contain space2 object (not in space1 and not the specified queue).
      expect(objectIds).not.toContain(space2Obj.data.id);
    }, Effect.provide(TestLayer)),
  );
});
