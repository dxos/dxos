//
// Copyright 2023 DXOS.org
//

import { getHeads } from '@automerge/automerge';
import type { DocumentId, Heads } from '@automerge/automerge-repo';
import { describe, expect, onTestFinished, test } from 'vitest';

import { IndexMetadataStore } from '@dxos/indexing';
import type { LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { TestReplicationNetwork } from '../testing';

import { AutomergeHost } from './automerge-host';

describe('AutomergeHost', () => {
  test('can create documents', async () => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });
    const handle = host.repo.create<any>();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    await host.repo.flush();
    expect(handle.doc()!.text).toEqual('Hello world');
  });

  test('changes are preserved in storage', async () => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });
    const handle = host.repo.create();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    const url = handle.url;

    await host.repo.flush();
    await host.close();

    const host2 = await setupAutomergeHost({ level });
    const handle2 = await host2.repo.find<any>(url);
    await handle2.whenReady();
    expect(handle2.doc()!.text).toEqual('Hello world');
    await host2.repo.flush();
  });

  test('query single document heads', async () => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });
    const handle = host.createDoc({ text: 'Hello world' });
    const expectedHeads = getHeads(handle.doc()!);
    await host.flush();

    expect(await host.getHeads([handle.documentId])).toEqual([expectedHeads]);

    // Simulate a restart.
    {
      const host = await setupAutomergeHost({ level });
      expect(await host.getHeads([handle.documentId])).toEqual([expectedHeads]);
    }
  });

  test('query multiple document heads', async () => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });
    const handles = range(2, () => host.createDoc({ text: 'Hello world' }));
    const expectedHeads: (Heads | undefined)[] = handles.map((handle) => getHeads(handle.doc()!));
    await host.flush();

    const ids = handles.map((handle) => handle.documentId);
    ids.splice(1, 0, 'non-existent-id' as DocumentId);
    expectedHeads.splice(1, 0, undefined);

    expect(await host.getHeads(ids)).toEqual(expectedHeads);

    // Simulate a restart.
    {
      const host = await setupAutomergeHost({ level });
      expect(await host.getHeads(ids)).toEqual(expectedHeads);
    }
  });

  test('collection synchronization', async () => {
    const NUM_DOCUMENTS = 10;

    const level1 = await createLevel();
    const host1 = await setupAutomergeHost({ level: level1 });

    const level2 = await createLevel();
    const documentIds: DocumentId[] = [];
    {
      const host2 = await setupAutomergeHost({ level: level2 });
      for (const i of range(NUM_DOCUMENTS)) {
        const handle = host2.createDoc({ docIndex: i });
        documentIds.push(handle.documentId);
      }
      await host2.flush();
      await host2.close();
    }

    const host2 = await setupAutomergeHost({ level: level2 });

    const collectionId = 'test-collection';
    await host1.updateLocalCollectionState(collectionId, documentIds);
    await host2.updateLocalCollectionState(collectionId, documentIds);

    await using network = await new TestReplicationNetwork().open();
    await host1.addReplicator(await network.createReplicator());
    await host2.addReplicator(await network.createReplicator());

    for (const documentId of documentIds) {
      await expect.poll(() => host1.getHeads([documentId])).toEqual(await host2.getHeads([documentId]));
    }

    await host1.close();
    await host2.close();
  });

  const createLevel = async () => {
    const level = createTestLevel();
    await openAndClose(level);
    return level;
  };
});

const setupAutomergeHost = async ({ level }: { level: LevelDB }) => {
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
