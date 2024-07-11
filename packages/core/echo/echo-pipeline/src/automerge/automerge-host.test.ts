//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { getHeads } from '@dxos/automerge/automerge';
import { IndexMetadataStore } from '@dxos/indexing';
import type { LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { afterTest, describe, openAndClose, test } from '@dxos/test';

import { AutomergeHost } from './automerge-host';

describe('AutomergeHost', () => {
  test('can create documents', async () => {
    const level = createTestLevel();
    await level.open();
    afterTest(() => level.close());

    const host = await setupAutomergeHost({ level });
    const handle = host.repo.create();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    await host.repo.flush();
    expect(handle.docSync().text).toEqual('Hello world');
  });

  test('changes are preserved in storage', async () => {
    const level = createTestLevel();
    await level.open();
    afterTest(() => level.close());

    const host = await setupAutomergeHost({ level });
    const handle = host.repo.create();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    const url = handle.url;

    await host.repo.flush();
    await host.close();

    const host2 = await setupAutomergeHost({ level });
    const handle2 = host2.repo.find(url);
    await handle2.whenReady();
    expect(handle2.docSync().text).toEqual('Hello world');
    await host2.repo.flush();
  });

  test('query document heads', async () => {
    const level = createTestLevel();
    await level.open();
    afterTest(() => level.close());

    const host = await setupAutomergeHost({ level });
    const handle = host.createDoc({ text: 'Hello world' });
    const expectedHeads = getHeads(handle.docSync());
    await host.flush();

    expect(await host.getHeads(handle.documentId)).toEqual(expectedHeads);

    // Simulate a restart.
    {
      const host = await setupAutomergeHost({ level });
      expect(await host.getHeads(handle.documentId)).toEqual(expectedHeads);
    }
  });

  test('collection synchronization', async () => {
    const level1 = createTestLevel();
    await openAndClose(level1);
    const host1 = await setupAutomergeHost({ level: level1 });

    const level2 = createTestLevel();
    await openAndClose(level2);
    const host2 = await setupAutomergeHost({ level: level2 });

    const collectionId = 'test-collection';

    host1.synchronizeCollection(collectionId, host2.peerId);
    host2.synchronizeCollection(collectionId, host1.peerId);
  });
});

const setupAutomergeHost = async ({ level }: { level: LevelDB }) => {
  const host = new AutomergeHost({
    db: level,
    indexMetadataStore: new IndexMetadataStore({ db: level.sublevel('index-metadata') }),
  });
  await host.open();
  afterTest(() => host.close());
  return host;
};
