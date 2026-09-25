//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { TestSqliteLayer as TestLayer } from '../testing/index.ts';
import { EntityMetaIndex } from './entity-meta-index.ts';
import { FtsIndex } from './fts-index.ts';
import type { IndexerObject } from './interface.ts';
import { ObjectSnapshotIndex } from './object-snapshot-index.ts';

const TYPE_PERSON = DXN.make('com.example.type.person', '0.1.0');
const TYPE_PERSON_VERSIONLESS = DXN.make('com.example.type.person');
const TYPE_TASK = DXN.make('com.example.type.task', '0.1.0');
const TYPE_DEFAULT = DXN.make('com.example.type.Type', '0.1.0');

describe('FtsIndex', () => {
  it.effect(
    'should create an FTS5 table on migrate',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();

      const sql = yield* SqlClient.SqlClient;
      const result = yield* sql`SELECT sql FROM sqlite_master WHERE name = 'ftsIndex'`;

      expect(result).toHaveLength(1);
      expect(result[0].sql).toMatch(/fts5/i);
      expect(result[0].sql).toMatch(/text/i);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should insert snapshots and query them via MATCH',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'doc-1',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Hello Effect',
            body: 'This is a message about Effect and SQL.',
          },
        },
      ];

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* store.update(objects);
      yield* index.update(objects);

      const match = yield* index.query({ query: 'Effect', spaceId: null, includeAllQueues: false, queues: null });
      expect(match.length).toBeGreaterThan(0);
      expect(match[0].objectId).toBe(objects[0].data.id);

      const noMatch = yield* index.query({
        query: 'DefinitelyNotPresent',
        spaceId: null,
        includeAllQueues: false,
        queues: null,
      });
      expect(noMatch).toHaveLength(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should upsert objects on update',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objectId = EntityId.random();

      // Initial insert.
      const obj1: IndexerObject = {
        spaceId,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-1',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: objectId,
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Original Title',
        },
      };
      yield* metaIndex.update([obj1]);
      yield* metaIndex.lookupRecordIds([obj1]);
      yield* store.update([obj1]);
      yield* index.update([obj1]);

      let match = yield* index.query({ query: 'Original', spaceId: null, includeAllQueues: false, queues: null });
      expect(match.length).toBe(1);

      // Update with same doc id and object id.
      const obj2: IndexerObject = {
        spaceId,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-1',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
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
      yield* store.update([obj2]);
      yield* index.update([obj2]);

      // Old content should be gone.
      match = yield* index.query({ query: 'Original', spaceId: null, includeAllQueues: false, queues: null });
      expect(match.length).toBe(0);

      // New content should exist.
      match = yield* index.query({ query: 'Updated', spaceId: null, includeAllQueues: false, queues: null });
      expect(match.length).toBe(1);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should handle non-sequential recordIds',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'doc-100',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Alpha Document',
          },
        },
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'doc-200',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Beta Document',
          },
        },
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'doc-1000',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Gamma Document',
          },
        },
      ];

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* store.update(objects);
      yield* index.update(objects);

      // All documents should be queryable.
      const alphaMatch = yield* index.query({
        query: 'Alpha',
        spaceId: null,
        includeAllQueues: false,
        queues: null,
      });
      expect(alphaMatch).toHaveLength(1);

      // Query that matches all.
      const allMatch = yield* index.query({
        query: 'Document',
        spaceId: null,
        includeAllQueues: false,
        queues: null,
      });
      expect(allMatch).toHaveLength(3);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should query from one space only',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const space1 = SpaceId.random();
      const space2 = SpaceId.random();

      const obj1: IndexerObject = {
        spaceId: space1,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-s1',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space One Content',
        },
      };

      const obj2: IndexerObject = {
        spaceId: space2,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-s2',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space Two Content',
        },
      };

      yield* metaIndex.update([obj1, obj2]);
      yield* metaIndex.lookupRecordIds([obj1, obj2]);
      yield* store.update([obj1, obj2]);
      yield* index.update([obj1, obj2]);

      // Query without spaceId should return both (if term matches both) or specific one
      // Let's search for "Content" which is in both
      const allMatches = yield* index.query({
        query: 'Content',
        spaceId: null,
        includeAllQueues: false,
        queues: null,
      });
      expect(allMatches).toHaveLength(2);

      // Query space 1
      const s1Matches = yield* index.query({
        query: 'Content',
        spaceId: [space1],
        includeAllQueues: false,
        queues: null,
      });
      expect(s1Matches).toHaveLength(1);
      expect(s1Matches[0].objectId).toBe(obj1.data.id);

      // Query space 2
      const s2Matches = yield* index.query({
        query: 'Content',
        spaceId: [space2],
        includeAllQueues: false,
        queues: null,
      });
      expect(s2Matches).toHaveLength(1);
      expect(s2Matches[0].objectId).toBe(obj2.data.id);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'partial word matches',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'doc-1',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Programming in TypeScript',
            body: 'Learn about functional programming patterns.',
          },
        },
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'doc-2',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Database Design',
            body: 'Understanding program architecture.',
          },
        },
      ];

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* store.update(objects);
      yield* index.update(objects);

      const defaultQuery = { spaceId: null, includeAllQueues: false, queues: null } as const;

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
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const queue1 = EntityId.random();
      const queue2 = EntityId.random();

      const spaceObj: IndexerObject = {
        spaceId,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-space',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space Content',
        },
      };

      const queue1Obj: IndexerObject = {
        spaceId,
        queueId: queue1,
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Queue One Content',
        },
      };

      const queue2Obj: IndexerObject = {
        spaceId,
        queueId: queue2,
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Queue Two Content',
        },
      };

      yield* metaIndex.update([spaceObj, queue1Obj, queue2Obj]);
      yield* metaIndex.lookupRecordIds([spaceObj, queue1Obj, queue2Obj]);
      yield* store.update([spaceObj, queue1Obj, queue2Obj]);
      yield* index.update([spaceObj, queue1Obj, queue2Obj]);

      // Query specific queue only.
      const q1Matches = yield* index.query({
        query: 'Content',
        spaceId: null,
        includeAllQueues: false,
        queues: [{ queueId: queue1 }],
      });
      expect(q1Matches).toHaveLength(1);
      expect(q1Matches[0].objectId).toBe(queue1Obj.data.id);

      // Query multiple queues.
      const bothQueuesMatches = yield* index.query({
        query: 'Content',
        spaceId: null,
        includeAllQueues: false,
        queues: [{ queueId: queue1 }, { queueId: queue2 }],
      });
      expect(bothQueuesMatches).toHaveLength(2);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should query with includeAllQueues',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const queueId = EntityId.random();

      const spaceObj: IndexerObject = {
        spaceId,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-space',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space Content',
        },
      };

      const queueObj: IndexerObject = {
        spaceId,
        queueId,
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Queue Content',
        },
      };

      yield* metaIndex.update([spaceObj, queueObj]);
      yield* metaIndex.lookupRecordIds([spaceObj, queueObj]);
      yield* store.update([spaceObj, queueObj]);
      yield* index.update([spaceObj, queueObj]);

      // Query space without includeAllQueues - should only return space object.
      const spaceOnlyMatches = yield* index.query({
        query: 'Content',
        spaceId: [spaceId],
        includeAllQueues: false,
        queues: null,
      });
      expect(spaceOnlyMatches).toHaveLength(1);
      expect(spaceOnlyMatches[0].objectId).toBe(spaceObj.data.id);

      // Query space with includeAllQueues - should return both.
      const allMatches = yield* index.query({
        query: 'Content',
        spaceId: [spaceId],
        includeAllQueues: true,
        queues: null,
      });
      expect(allMatches).toHaveLength(2);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should OR space and queue constraints',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const space1 = SpaceId.random();
      const space2 = SpaceId.random();
      const queueInSpace2 = EntityId.random();

      const space1Obj: IndexerObject = {
        spaceId: space1,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-s1',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space One Content',
        },
      };

      const space2Obj: IndexerObject = {
        spaceId: space2,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-s2',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Space Two Content',
        },
      };

      const queueObj: IndexerObject = {
        spaceId: space2,
        queueId: queueInSpace2,
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Queue Content',
        },
      };

      yield* metaIndex.update([space1Obj, space2Obj, queueObj]);
      yield* metaIndex.lookupRecordIds([space1Obj, space2Obj, queueObj]);
      yield* store.update([space1Obj, space2Obj, queueObj]);
      yield* index.update([space1Obj, space2Obj, queueObj]);

      // Query space1 OR specific queue in space2 - should return space1 object and queue object.
      const orMatches = yield* index.query({
        query: 'Content',
        spaceId: [space1],
        includeAllQueues: false,
        queues: [{ queueId: queueInSpace2 }],
      });
      expect(orMatches).toHaveLength(2);
      const objectIds = orMatches.map((m) => m.objectId);
      expect(objectIds).toContain(space1Obj.data.id);
      expect(objectIds).toContain(queueObj.data.id);
      // Should NOT contain space2 object (not in space1 and not the specified queue).
      expect(objectIds).not.toContain(space2Obj.data.id);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should scope matches by typeDxns',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const person: IndexerObject = {
        spaceId,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-person',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          title: 'Shared Term Person',
        },
      };
      const task: IndexerObject = {
        spaceId,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-task',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_TASK,
          title: 'Shared Term Task',
        },
      };

      yield* metaIndex.update([person, task]);
      yield* metaIndex.lookupRecordIds([person, task]);
      yield* store.update([person, task]);
      yield* index.update([person, task]);

      const defaultQuery = { query: 'Shared', spaceId: null, includeAllQueues: false, queues: null } as const;

      // No type scope — both match.
      const unscoped = yield* index.query(defaultQuery);
      expect(unscoped).toHaveLength(2);
      const nullScope = yield* index.query({ ...defaultQuery, typeDxns: null });
      expect(nullScope).toHaveLength(2);

      // Scoped to one type.
      const personOnly = yield* index.query({ ...defaultQuery, typeDxns: [TYPE_PERSON] });
      expect(personOnly).toHaveLength(1);
      expect(personOnly[0].objectId).toBe(person.data.id);

      // Versionless DXN matches versioned rows.
      const versionless = yield* index.query({ ...defaultQuery, typeDxns: [TYPE_PERSON_VERSIONLESS] });
      expect(versionless).toHaveLength(1);
      expect(versionless[0].objectId).toBe(person.data.id);

      // Multiple types are OR-ed.
      const both = yield* index.query({ ...defaultQuery, typeDxns: [TYPE_PERSON, TYPE_TASK] });
      expect(both).toHaveLength(2);

      // Empty scope matches nothing.
      const none = yield* index.query({ ...defaultQuery, typeDxns: [] });
      expect(none).toHaveLength(0);
    }, Effect.provide(TestLayer)),
  );
  it.effect(
    'should match text content but not property names',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objectId = EntityId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'doc-1',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: objectId,
            [ATTR_TYPE]: TYPE_PERSON,
            description: 'Ada Lovelace wrote the first algorithm.',
            tags: ['mathematics'],
            address: { city: 'London' },
            employer: { '/': 'dxn:echo:@:01JXXXXXXXXXXXXXXXXXXXXXXX' },
            headcount: 1843,
          },
        },
      ];

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* store.update(objects);
      yield* index.update(objects);

      const defaults = { spaceId: null, includeAllQueues: false, queues: null } as const;
      const query = (text: string) => index.query({ ...defaults, query: text });

      // Positive: values, at every depth.
      for (const term of ['Lovelace', 'algorithm', 'mathematics', 'London', 'ovelac']) {
        expect(yield* query(term), term).toHaveLength(1);
      }
      expect((yield* query('Lovelace'))[0].objectId).toBe(objectId);

      // Negative: property names, the type, the id, reference targets and numbers.
      for (const term of [
        'description',
        'tags',
        'address',
        'city',
        'employer',
        'headcount',
        'com.example.type.person',
        objectId,
        '01JXXXXXXXXXXXXXXXXXXXXXXX',
        '1843',
      ]) {
        expect(yield* query(term), term).toHaveLength(0);
      }
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should not match property names below the trigram minimum',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex(yield* SqlClient.SqlClient);
      const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* index.migrate();
      yield* store.migrate();
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'doc-1',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Ok then',
          },
        },
      ];

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* store.update(objects);
      yield* index.update(objects);

      const defaults = { spaceId: null, includeAllQueues: false, queues: null } as const;

      // A sub-trigram term takes the LIKE path, which now scans the extracted text.
      expect(yield* index.query({ ...defaults, query: 'Ok' })).toHaveLength(1);
      // `id` and `ti` (of `title`) are substrings of the JSON but not of the text.
      expect(yield* index.query({ ...defaults, query: 'id' })).toHaveLength(0);
      expect(yield* index.query({ ...defaults, query: 'ti' })).toHaveLength(0);
    }, Effect.provide(TestLayer)),
  );
});
