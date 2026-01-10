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
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          documentId: 'doc-1',
          recordId: 1,
          data: {
            id: ObjectId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Hello Effect',
            body: 'This is a message about Effect and SQL.',
          },
        },
      ];

      yield* index.update(objects);

      const match = yield* index.query({ query: 'Effect' });
      expect(match.length).toBeGreaterThan(0);
      expect(match[0].snapshot).toContain('Effect');

      const noMatch = yield* index.query({ query: 'DefinitelyNotPresent' });
      expect(noMatch).toHaveLength(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should upsert objects on update',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objectId = ObjectId.random();
      const recordId = 1;

      // Initial insert.
      const obj1: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-1',
        recordId,
        data: {
          id: objectId,
          [ATTR_TYPE]: DXN.parse('dxn:type:example.com/type/Person:0.1.0').toString(),
          title: 'Original Title',
        },
      };
      yield* index.update([obj1]);

      let match = yield* index.query({ query: 'Original' });
      expect(match.length).toBe(1);

      // Update with same recordId.
      const obj2: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-1',
        recordId,
        data: {
          id: objectId,
          [ATTR_TYPE]: TYPE_DEFAULT,
          title: 'Updated Title',
        },
      };
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
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          documentId: 'doc-100',
          recordId: 100,
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
          recordId: 200,
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
          recordId: 1000,
          data: {
            id: ObjectId.random(),
            [ATTR_TYPE]: TYPE_PERSON,
            title: 'Gamma Document',
          },
        },
      ];

      yield* index.update(objects);

      // All documents should be queryable.
      const alphaMatch = yield* index.query({ query: 'Alpha' });
      expect(alphaMatch).toHaveLength(1);

      const betaMatch = yield* index.query({ query: 'Beta' });
      expect(betaMatch).toHaveLength(1);

      const gammaMatch = yield* index.query({ query: 'Gamma' });
      expect(gammaMatch).toHaveLength(1);

      // Query that matches all.
      const allMatch = yield* index.query({ query: 'Document' });
      expect(allMatch).toHaveLength(3);

      // Update one with non-sequential recordId.
      const updatedObj: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-200',
        recordId: 200,
        data: {
          id: ObjectId.random(),
          [ATTR_TYPE]: DXN.parse('dxn:type:example.com/type/Person:0.1.0').toString(),
          title: 'Delta Document',
        },
      };
      yield* index.update([updatedObj]);

      // Beta should be gone, Delta should exist.
      const betaAfter = yield* index.query({ query: 'Beta' });
      expect(betaAfter).toHaveLength(0);

      const deltaMatch = yield* index.query({ query: 'Delta' });
      expect(deltaMatch).toHaveLength(1);
    }, Effect.provide(TestLayer)),
  );
});
