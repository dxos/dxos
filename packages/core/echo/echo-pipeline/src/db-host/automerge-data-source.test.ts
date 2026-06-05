//
// Copyright 2026 DXOS.org
//

import { getHeads } from '@automerge/automerge';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { type DatabaseDirectory, EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { runAndForwardErrors } from '@dxos/effect';
import { type IndexCursor } from '@dxos/index-core';
import { DXN, SpaceId } from '@dxos/keys';

import { AutomergeHost } from '../automerge';
import { createTestSqliteRuntime } from '../testing';
import { AutomergeDataSource, headsCodec } from './automerge-data-source';

const TEST_TYPE = DXN.make('com.example.type.test', '0.1.0');
const OTHER_TYPE = DXN.make('com.example.type.other', '0.1.0');
const PERSON_TYPE = DXN.make('com.example.type.person', '0.1.0');

/**
 * Set up a real AutomergeHost with SQLite storage.
 */
const setupAutomergeHost = async (): Promise<AutomergeHost> => {
  const { runtime, dispose } = createTestSqliteRuntime();
  onTestFinished(() => dispose());
  const host = new AutomergeHost({ runtime });
  await host.open();
  onTestFinished(async () => {
    await host.close();
  });
  return host;
};

/**
 * Create a DatabaseDirectory document with the given objects.
 */
const createDatabaseDirectory = async (
  host: AutomergeHost,
  spaceKey: string,
  objects: Record<string, EntityStructure>,
): Promise<Awaited<ReturnType<typeof host.createDoc<DatabaseDirectory>>>> => {
  const handle = await host.createDoc<DatabaseDirectory>({
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
    const host = await setupAutomergeHost();

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects(Context.default(), []));

    expect(result.objects).toHaveLength(0);
    expect(result.cursors).toHaveLength(0);
  });

  test('returns new documents that have no cursor', async () => {
    const host = await setupAutomergeHost();
    const spaceKey = SpaceId.random();

    const handle = await createDatabaseDirectory(host, spaceKey, {
      'obj-1': EntityStructure.makeObject({ type: TEST_TYPE, data: { title: 'Test Document' } }),
    });
    await host.flush(Context.default());

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects(Context.default(), []));

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].documentId).toBe(handle.documentId);
    expect(result.objects[0].data.title).toBe('Test Document');

    expect(result.cursors).toHaveLength(1);
    expect(result.cursors[0].resourceId).toBe(handle.documentId);
    expect(result.cursors[0].cursor).toBe(headsCodec.encode(getHeads(handle.doc()!)));
  });

  test('returns documents with changed heads', async () => {
    const host = await setupAutomergeHost();
    const spaceKey = SpaceId.random();

    const handle1 = await createDatabaseDirectory(host, spaceKey, {
      'obj-1': EntityStructure.makeObject({ type: TEST_TYPE, data: { title: 'Doc 1' } }),
    });
    const handle2 = await createDatabaseDirectory(host, spaceKey, {
      'obj-2': EntityStructure.makeObject({ type: TEST_TYPE, data: { title: 'Doc 2' } }),
    });
    await host.flush(Context.default());

    // Capture heads before mutation.
    const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));
    const doc2Heads = headsCodec.encode(getHeads(handle2.doc()!));

    // Modify doc1 to have new heads.
    handle1.change((doc) => {
      doc.objects!['obj-1'].data.title = 'Doc 1 Updated';
    });
    await host.flush(Context.default());

    const dataSource = new AutomergeDataSource(host);
    const cursors: IndexCursor[] = [
      {
        indexName: 'fts',
        spaceId: null,
        sourceName: 'automerge',
        resourceId: handle1.documentId,
        cursor: doc1HeadsBefore,
      },
      { indexName: 'fts', spaceId: null, sourceName: 'automerge', resourceId: handle2.documentId, cursor: doc2Heads },
    ];

    const result = await runAndForwardErrors(dataSource.getChangedObjects(Context.default(), cursors));

    // Only doc1 changed.
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].documentId).toBe(handle1.documentId);
  });

  test('skips documents with unchanged heads', async () => {
    const host = await setupAutomergeHost();
    const spaceKey = SpaceId.random();

    const handle = await createDatabaseDirectory(host, spaceKey, {
      'obj-1': EntityStructure.makeObject({ type: TEST_TYPE, data: { title: 'Doc 1' } }),
    });
    await host.flush(Context.default());

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

    const result = await runAndForwardErrors(dataSource.getChangedObjects(Context.default(), cursors));

    expect(result.objects).toHaveLength(0);
    expect(result.cursors).toHaveLength(0);
  });

  test('respects limit option', async () => {
    const host = await setupAutomergeHost();
    const spaceKey = SpaceId.random();

    // Create 3 documents.
    for (let i = 1; i <= 3; i++) {
      await createDatabaseDirectory(host, spaceKey, {
        [`obj-${i}`]: EntityStructure.makeObject({ type: TEST_TYPE, data: { title: `Doc ${i}` } }),
      });
    }
    await host.flush(Context.default());

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects(Context.default(), [], { limit: 2 }));

    expect(result.objects).toHaveLength(2);
    expect(result.cursors).toHaveLength(2);
  });

  test('extracts multiple objects from a document', async () => {
    const host = await setupAutomergeHost();
    const spaceKey = SpaceId.random();

    await createDatabaseDirectory(host, spaceKey, {
      'obj-1': EntityStructure.makeObject({ type: TEST_TYPE, data: { title: 'Object 1' } }),
      'obj-2': EntityStructure.makeObject({ type: OTHER_TYPE, data: { title: 'Object 2' } }),
    });
    await host.flush(Context.default());

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects(Context.default(), []));

    expect(result.objects).toHaveLength(2);
    expect(result.objects.map((o) => o.data.id)).toContain('obj-1');
    expect(result.objects.map((o) => o.data.id)).toContain('obj-2');
  });

  test('skips outdated documents', async () => {
    const host = await setupAutomergeHost();
    const spaceKey = SpaceId.random();

    // Create a document with outdated version.
    const handle = await host.createDoc<DatabaseDirectory>({
      version: 0 as SpaceDocVersion, // Outdated version.
      access: { spaceKey },
      objects: {},
      links: {},
    });
    handle.change((doc) => {
      doc.objects = {
        'obj-1': EntityStructure.makeObject({ type: TEST_TYPE, data: { title: 'Test' } }),
      };
    });
    await host.flush(Context.default());

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects(Context.default(), []));

    expect(result.objects).toHaveLength(0);
  });

  test('extracts object attributes correctly', async () => {
    const host = await setupAutomergeHost();
    const spaceKey = SpaceId.random();

    await createDatabaseDirectory(host, spaceKey, {
      'person-1': EntityStructure.makeObject({
        type: PERSON_TYPE,
        data: { name: 'Alice', age: 30 },
      }),
    });
    await host.flush(Context.default());

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects(Context.default(), []));

    expect(result.objects).toHaveLength(1);
    const obj = result.objects[0];
    expect(obj.data.id).toBe('person-1');
    expect(obj.data['@type']).toBe(PERSON_TYPE);
    expect(obj.data.name).toBe('Alice');
    expect(obj.data.age).toBe(30);
  });

  test('skips documents without spaceKey', async () => {
    const host = await setupAutomergeHost();

    // Create a document without access.spaceKey.
    const handle = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      objects: {},
      links: {},
    });
    handle.change((doc) => {
      doc.objects = {
        'obj-1': EntityStructure.makeObject({ type: TEST_TYPE, data: { title: 'No Space' } }),
      };
    });
    await host.flush(Context.default());

    const dataSource = new AutomergeDataSource(host);
    const result = await runAndForwardErrors(dataSource.getChangedObjects(Context.default(), []));

    expect(result.objects).toHaveLength(0);
  });
});
