//
// Copyright 2026 DXOS.org
//

import { getHeads } from '@automerge/automerge';
import { describe, expect, onTestFinished, test } from 'vitest';

import { type DatabaseDirectory, ObjectStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { runAndForwardErrors } from '@dxos/effect';
import { IndexMetadataStore } from '@dxos/indexing';
import { type IndexCursor } from '@dxos/index-core';
import { DXN, SpaceId } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { AutomergeHost } from '../automerge';

import { AutomergeDataSource, headsCodec } from './automerge-data-source';

const TEST_TYPE = DXN.parse('dxn:type:example.com/type/Test:0.1.0').toString();
const OTHER_TYPE = DXN.parse('dxn:type:example.com/type/Other:0.1.0').toString();
const PERSON_TYPE = DXN.parse('dxn:type:example.com/type/Person:0.1.0').toString();

/**
 * Set up a real AutomergeHost with LevelDB storage.
 */
const setupAutomergeHost = async (level: LevelDB): Promise<AutomergeHost> => {
  const host = new AutomergeHost({
    db: level,
    indexMetadataStore: new IndexMetadataStore({ db: level.sublevel('index-metadata') }),
  });
  await host.open();
  onTestFinished(async () => {
    await host.close();
  });
  return host;
};

/**
 * Create a DatabaseDirectory document with the given objects.
 */
const createDatabaseDirectory = (
  host: AutomergeHost,
  spaceKey: string,
  objects: Record<string, ObjectStructure>,
): ReturnType<typeof host.createDoc<DatabaseDirectory>> => {
  const handle = host.createDoc<DatabaseDirectory>({
    version: SpaceDocVersion.CURRENT,
    access: { spaceKey },
    objects: {},
    links: {},
  });

  handle.change((doc) => {
    doc.objects = objects;
  });

  return handle;
};

describe('AutomergeDataSource', () => {
  test('headsCodec encodes and decodes heads correctly', () => {
    const heads = ['abc123', 'def456'];
    const encoded = headsCodec.encode(heads);

    expect(encoded).toBe('abc123|def456');
    expect(headsCodec.decode(encoded)).toEqual(['abc123', 'def456']);
  });

  test('headsCodec sorts heads for consistent encoding', () => {
    const heads1 = ['def456', 'abc123'];
    const heads2 = ['abc123', 'def456'];

    expect(headsCodec.encode(heads1)).toBe(headsCodec.encode(heads2));
  });

  test('returns empty when no documents exist', async () => {
    const level = createTestLevel();
    await openAndClose(level);
    const host = await setupAutomergeHost(level);

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects([]));

    expect(result.objects).toHaveLength(0);
    expect(result.cursors).toHaveLength(0);
  });

  test('returns new documents that have no cursor', async () => {
    const level = createTestLevel();
    await openAndClose(level);
    const host = await setupAutomergeHost(level);
    const spaceKey = SpaceId.random();

    const handle = createDatabaseDirectory(host, spaceKey, {
      'obj-1': ObjectStructure.makeObject({ type: TEST_TYPE as DXN.String, data: { title: 'Test Document' } }),
    });
    await host.flush();

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects([]));

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].documentId).toBe(handle.documentId);
    expect(result.objects[0].data.title).toBe('Test Document');

    expect(result.cursors).toHaveLength(1);
    expect(result.cursors[0].resourceId).toBe(handle.documentId);
    expect(result.cursors[0].cursor).toBe(headsCodec.encode(getHeads(handle.doc()!)));
  });

  test('returns documents with changed heads', async () => {
    const level = createTestLevel();
    await openAndClose(level);
    const host = await setupAutomergeHost(level);
    const spaceKey = SpaceId.random();

    const handle1 = createDatabaseDirectory(host, spaceKey, {
      'obj-1': ObjectStructure.makeObject({ type: TEST_TYPE as DXN.String, data: { title: 'Doc 1' } }),
    });
    const handle2 = createDatabaseDirectory(host, spaceKey, {
      'obj-2': ObjectStructure.makeObject({ type: TEST_TYPE as DXN.String, data: { title: 'Doc 2' } }),
    });
    await host.flush();

    // Store the heads for doc2 (unchanged).
    const doc2Heads = headsCodec.encode(getHeads(handle2.doc()!));

    // Modify doc1 to have new heads.
    handle1.change((doc) => {
      doc.objects!['obj-1'].data.title = 'Doc 1 Updated';
    });
    await host.flush();

    const dataSource = new AutomergeDataSource(host);
    const cursors: IndexCursor[] = [
      { indexName: 'fts', spaceId: null, sourceName: 'automerge', resourceId: handle1.documentId, cursor: 'oldhead' },
      { indexName: 'fts', spaceId: null, sourceName: 'automerge', resourceId: handle2.documentId, cursor: doc2Heads },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors));

    // Only doc1 changed.
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].documentId).toBe(handle1.documentId);
  });

  test('skips documents with unchanged heads', async () => {
    const level = createTestLevel();
    await openAndClose(level);
    const host = await setupAutomergeHost(level);
    const spaceKey = SpaceId.random();

    const handle = createDatabaseDirectory(host, spaceKey, {
      'obj-1': ObjectStructure.makeObject({ type: TEST_TYPE as DXN.String, data: { title: 'Doc 1' } }),
    });
    await host.flush();

    const currentHeads = headsCodec.encode(getHeads(handle.doc()!));

    const dataSource = new AutomergeDataSource(host);
    const cursors: IndexCursor[] = [
      {
        indexName: 'fts',
        spaceId: null,
        sourceName: 'automerge',
        resourceId: handle.documentId,
        cursor: currentHeads,
      },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(cursors));

    expect(result.objects).toHaveLength(0);
    expect(result.cursors).toHaveLength(0);
  });

  test('respects limit option', async () => {
    const level = createTestLevel();
    await openAndClose(level);
    const host = await setupAutomergeHost(level);
    const spaceKey = SpaceId.random();

    // Create 3 documents.
    for (let i = 1; i <= 3; i++) {
      createDatabaseDirectory(host, spaceKey, {
        [`obj-${i}`]: ObjectStructure.makeObject({ type: TEST_TYPE as DXN.String, data: { title: `Doc ${i}` } }),
      });
    }
    await host.flush();

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects([], { limit: 2 }));

    expect(result.objects).toHaveLength(2);
    expect(result.cursors).toHaveLength(2);
  });

  test('extracts multiple objects from a document', async () => {
    const level = createTestLevel();
    await openAndClose(level);
    const host = await setupAutomergeHost(level);
    const spaceKey = SpaceId.random();

    createDatabaseDirectory(host, spaceKey, {
      'obj-1': ObjectStructure.makeObject({ type: TEST_TYPE as DXN.String, data: { title: 'Object 1' } }),
      'obj-2': ObjectStructure.makeObject({ type: OTHER_TYPE as DXN.String, data: { title: 'Object 2' } }),
    });
    await host.flush();

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects([]));

    expect(result.objects).toHaveLength(2);
    expect(result.objects.map((o) => o.data.id)).toContain('obj-1');
    expect(result.objects.map((o) => o.data.id)).toContain('obj-2');
  });

  test('skips outdated documents', async () => {
    const level = createTestLevel();
    await openAndClose(level);
    const host = await setupAutomergeHost(level);
    const spaceKey = SpaceId.random();

    // Create a document with outdated version.
    const handle = host.createDoc<DatabaseDirectory>({
      version: 0 as SpaceDocVersion, // Outdated version.
      access: { spaceKey },
      objects: {},
      links: {},
    });
    handle.change((doc) => {
      doc.objects = {
        'obj-1': ObjectStructure.makeObject({ type: TEST_TYPE as DXN.String, data: { title: 'Test' } }),
      };
    });
    await host.flush();

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects([]));

    expect(result.objects).toHaveLength(0);
  });

  test('extracts object attributes correctly', async () => {
    const level = createTestLevel();
    await openAndClose(level);
    const host = await setupAutomergeHost(level);
    const spaceKey = SpaceId.random();

    createDatabaseDirectory(host, spaceKey, {
      'person-1': ObjectStructure.makeObject({
        type: PERSON_TYPE as DXN.String,
        data: { name: 'Alice', age: 30 },
      }),
    });
    await host.flush();

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects([]));

    expect(result.objects).toHaveLength(1);
    const obj = result.objects[0];
    expect(obj.data.id).toBe('person-1');
    expect(obj.data['@type']).toBe(PERSON_TYPE);
    expect(obj.data.name).toBe('Alice');
    expect(obj.data.age).toBe(30);
  });

  test('skips documents without spaceKey', async () => {
    const level = createTestLevel();
    await openAndClose(level);
    const host = await setupAutomergeHost(level);

    // Create a document without access.spaceKey.
    const handle = host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      objects: {},
      links: {},
    });
    handle.change((doc) => {
      doc.objects = {
        'obj-1': ObjectStructure.makeObject({ type: TEST_TYPE as DXN.String, data: { title: 'No Space' } }),
      };
    });
    await host.flush();

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects([]));

    expect(result.objects).toHaveLength(0);
  });
});
