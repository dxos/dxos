//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { ATTR_DELETED, ATTR_TYPE } from '@dxos/echo/internal';
import { type DatabaseDirectory, ObjectStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { runAndForwardErrors } from '@dxos/effect';
import { type IndexCursor } from '@dxos/index-core';
import { DXN, SpaceId } from '@dxos/keys';

import { AutomergeDataSource, headsCodec } from './automerge-data-source';

const TEST_TYPE = DXN.parse('dxn:type:example.com/type/Test:0.1.0').toString();
const OTHER_TYPE = DXN.parse('dxn:type:example.com/type/Other:0.1.0').toString();
const PERSON_TYPE = DXN.parse('dxn:type:example.com/type/Person:0.1.0').toString();

describe('AutomergeDataSource', () => {
  const spaceId = SpaceId.random();

  test('headsCodec encodes and decodes heads correctly', () => {
    // Encode sorts and joins with delimiter.
    expect(headsCodec.encode(['b', 'a', 'c'])).toBe('a|b|c');
    expect(headsCodec.encode(['abc', '123'])).toBe('123|abc');
    expect(headsCodec.encode([])).toBe('');

    // Decode splits by delimiter.
    expect(headsCodec.decode('a|b|c')).toEqual(['a', 'b', 'c']);
    expect(headsCodec.decode('123|abc')).toEqual(['123', 'abc']);
    expect(headsCodec.decode('')).toEqual([]);
  });

  test('returns empty when no documents in space', async () => {
    const dataSource = new AutomergeDataSource({
      getDocumentIds: () => [],
      getHeads: async () => [],
      loadDocument: async () => undefined,
    });

    const cursors: IndexCursor[] = [
      { indexName: 'fts', spaceId, sourceName: 'automerge', resourceId: null, cursor: '' },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors));
    expect(result.objects).toHaveLength(0);
    expect(result.cursors).toHaveLength(0);
  });

  test('returns empty when cursors array is empty', async () => {
    const dataSource = new AutomergeDataSource({
      getDocumentIds: () => ['doc1' as DocumentId],
      getHeads: async () => [['head1']],
      loadDocument: async () => undefined,
    });

    const result = await runAndForwardErrors(dataSource.getChangedObjects([]));
    expect(result.objects).toHaveLength(0);
    expect(result.cursors).toHaveLength(0);
  });

  test('returns all objects for new documents (no cursor stored)', async () => {
    const doc1Id = 'doc1' as DocumentId;
    const doc: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: 'abc' },
      objects: {
        obj1: ObjectStructure.makeObject({ type: TEST_TYPE, data: { title: 'Hello' } }),
        obj2: ObjectStructure.makeObject({ type: TEST_TYPE, data: { title: 'World' } }),
      },
    };

    const dataSource = new AutomergeDataSource({
      getDocumentIds: () => [doc1Id],
      getHeads: async () => [['head1', 'head2']],
      loadDocument: async (docId) => (docId === doc1Id ? doc : undefined),
    });

    // No existing cursors for this document.
    const cursors: IndexCursor[] = [
      { indexName: 'fts', spaceId, sourceName: 'automerge', resourceId: null, cursor: '' },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors));
    expect(result.objects).toHaveLength(2);
    expect(result.objects.map((o) => o.data.title).sort()).toEqual(['Hello', 'World']);
    expect(result.cursors).toHaveLength(1);
    expect(result.cursors[0].resourceId).toBe(doc1Id);
    expect(result.cursors[0].cursor).toBe(headsCodec.encode(['head1', 'head2']));
  });

  test('returns only changed objects when heads differ from cursor', async () => {
    const doc1Id = 'doc1' as DocumentId;
    const doc2Id = 'doc2' as DocumentId;

    const doc1: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: 'abc' },
      objects: {
        obj1: ObjectStructure.makeObject({ type: TEST_TYPE, data: { title: 'Changed' } }),
      },
    };

    const doc2: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: 'abc' },
      objects: {
        obj2: ObjectStructure.makeObject({
          type: TEST_TYPE,
          data: { title: 'Unchanged' },
        }),
      },
    };

    const dataSource = new AutomergeDataSource({
      getDocumentIds: () => [doc1Id, doc2Id],
      getHeads: async () => [
        ['newhead1'], // doc1 has new heads
        ['oldhead2'], // doc2 has same heads as cursor
      ],
      loadDocument: async (docId) => {
        if (docId === doc1Id) {
          return doc1;
        }
        if (docId === doc2Id) {
          return doc2;
        }
        return undefined;
      },
    });

    // Cursor for doc2 matches current heads, doc1 has no cursor.
    const cursors: IndexCursor[] = [
      {
        indexName: 'fts',
        spaceId,
        sourceName: 'automerge',
        resourceId: doc2Id,
        cursor: headsCodec.encode(['oldhead2']),
      },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors));
    // Only doc1 should be returned (changed).
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].data.title).toBe('Changed');
    expect(result.cursors).toHaveLength(1);
    expect(result.cursors[0].resourceId).toBe(doc1Id);
  });

  test('returns empty when heads match cursor (no changes)', async () => {
    const doc1Id = 'doc1' as DocumentId;
    const doc: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: 'abc' },
      objects: {
        obj1: ObjectStructure.makeObject({ type: TEST_TYPE, data: { title: 'Test' } }),
      },
    };

    const currentHeads = ['head1', 'head2'];

    const dataSource = new AutomergeDataSource({
      getDocumentIds: () => [doc1Id],
      getHeads: async () => [currentHeads],
      loadDocument: async () => doc,
    });

    // Cursor matches current heads.
    const cursors: IndexCursor[] = [
      {
        indexName: 'fts',
        spaceId,
        sourceName: 'automerge',
        resourceId: doc1Id,
        cursor: headsCodec.encode(currentHeads),
      },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors));
    expect(result.objects).toHaveLength(0);
    expect(result.cursors).toHaveLength(0);
  });

  test('respects limit parameter', async () => {
    const docs = [
      { id: 'doc1' as DocumentId, heads: ['head1'] },
      { id: 'doc2' as DocumentId, heads: ['head2'] },
      { id: 'doc3' as DocumentId, heads: ['head3'] },
    ];

    const makeDatabaseDirectory = (title: string): DatabaseDirectory => ({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: 'abc' },
      objects: {
        obj: ObjectStructure.makeObject({ type: TEST_TYPE, data: { title } }),
      },
    });

    const dataSource = new AutomergeDataSource({
      getDocumentIds: () => docs.map((d) => d.id),
      getHeads: async () => docs.map((d) => d.heads),
      loadDocument: async (docId) => makeDatabaseDirectory(`Doc ${docId}`),
    });

    // No cursors, all docs are new.
    const cursors: IndexCursor[] = [
      { indexName: 'fts', spaceId, sourceName: 'automerge', resourceId: null, cursor: '' },
    ];

    // Limit to 2 documents.
    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors, { limit: 2 }));
    expect(result.objects).toHaveLength(2);
    expect(result.cursors).toHaveLength(2);
  });

  test('handles multiple objects within a single document', async () => {
    const doc1Id = 'doc1' as DocumentId;
    const doc: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: 'abc' },
      objects: {
        obj1: ObjectStructure.makeObject({ type: TEST_TYPE, data: { title: 'First' } }),
        obj2: ObjectStructure.makeObject({ type: TEST_TYPE, data: { title: 'Second' } }),
        obj3: ObjectStructure.makeObject({
          type: OTHER_TYPE,
          data: { name: 'Third' },
        }),
      },
    };

    const dataSource = new AutomergeDataSource({
      getDocumentIds: () => [doc1Id],
      getHeads: async () => [['head1']],
      loadDocument: async () => doc,
    });

    const cursors: IndexCursor[] = [
      { indexName: 'fts', spaceId, sourceName: 'automerge', resourceId: null, cursor: '' },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors));
    expect(result.objects).toHaveLength(3);
    expect(result.objects.every((o) => o.spaceId === spaceId)).toBe(true);
    expect(result.objects.every((o) => o.documentId === doc1Id)).toBe(true);
    // Only one cursor update per document.
    expect(result.cursors).toHaveLength(1);
  });

  test('skips outdated documents', async () => {
    const doc1Id = 'doc1' as DocumentId;
    const outdatedDoc: DatabaseDirectory = {
      version: 0 as SpaceDocVersion, // Outdated version.
      access: { spaceKey: 'abc' },
      objects: {
        obj1: ObjectStructure.makeObject({ type: TEST_TYPE, data: { title: 'Outdated' } }),
      },
    };

    const dataSource = new AutomergeDataSource({
      getDocumentIds: () => [doc1Id],
      getHeads: async () => [['head1']],
      loadDocument: async () => outdatedDoc,
    });

    const cursors: IndexCursor[] = [
      { indexName: 'fts', spaceId, sourceName: 'automerge', resourceId: null, cursor: '' },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors));
    expect(result.objects).toHaveLength(0);
    expect(result.cursors).toHaveLength(0);
  });

  test('extracts object metadata correctly', async () => {
    const doc1Id = 'doc1' as DocumentId;
    const doc: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: 'abc' },
      objects: {
        obj1: ObjectStructure.makeObject({
          type: PERSON_TYPE,
          data: { name: 'John', age: 30 },
        }),
      },
    };

    const dataSource = new AutomergeDataSource({
      getDocumentIds: () => [doc1Id],
      getHeads: async () => [['head1']],
      loadDocument: async () => doc,
    });

    const cursors: IndexCursor[] = [
      { indexName: 'fts', spaceId, sourceName: 'automerge', resourceId: null, cursor: '' },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors));
    expect(result.objects).toHaveLength(1);

    const obj = result.objects[0];
    expect(obj.data.id).toBe('obj1');
    expect(obj.data[ATTR_TYPE]).toBe(PERSON_TYPE);
    expect(obj.data[ATTR_DELETED]).toBe(false);
    expect(obj.data.name).toBe('John');
    expect(obj.data.age).toBe(30);
  });
});
