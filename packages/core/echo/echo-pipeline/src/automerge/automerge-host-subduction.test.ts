//
// Copyright 2026 DXOS.org
//

import { getHeads } from '@automerge/automerge';
import * as Automerge from '@automerge/automerge';
import { type DocumentId, type Heads, generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import { describe, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import type { LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { TestReplicationNetwork } from '../testing';
import { AutomergeHost } from './automerge-host';

describe('AutomergeHost with Subduction', () => {
  test('can create documents', async ({ expect }) => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });
    const handle = await host.createDoc<any>();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    await host.flush(Context.default());
    expect(handle.doc()!.text).toEqual('Hello world');
  });

  test('changes are preserved in storage', async ({ expect }) => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });
    const handle = await host.createDoc<any>();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    const url = handle.url;

    await host.flush(Context.default());
    await host.close();

    const host2 = await setupAutomergeHost({ level });
    const handle2 = await host2.loadDoc<any>(Context.default(), url);
    await handle2.whenReady();
    expect(handle2.doc()!.text).toEqual('Hello world');
    await host2.flush(Context.default());
  });

  test('load resolves when document is created from binary', async ({ expect }) => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });

    const document = Automerge.from({ text: 'Hello world' });
    const binary = Automerge.save(document);
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());

    const loadPromise = host.loadDoc(Context.default(), documentId);

    const createdHandle = await host.createDoc(binary, { preserveHistory: true, documentId });

    const loadedHandle = await loadPromise;
    expect(loadedHandle.doc()).toEqual(createdHandle.doc());
  });

  test('query single document heads', async ({ expect }) => {
    const tmpPath = `/tmp/dxos-${PublicKey.random().toHex()}`;

    const level = await createLevel(tmpPath);
    const host = await setupAutomergeHost({ level });
    const handle = await host.createDoc({ text: 'Hello world' });
    const expectedHeads = getHeads(handle.doc()!);
    await host.flush(Context.default());

    expect(await host.getHeads([handle.documentId])).toEqual([expectedHeads]);
    await host.close();
    await level.close();

    {
      const host = await setupAutomergeHost({ level: await createLevel(tmpPath) });
      expect(await host.getHeads([handle.documentId])).toEqual([expectedHeads]);
    }
  });

  test('query multiple document heads', async ({ expect }) => {
    const tmpPath = `/tmp/dxos-${PublicKey.random().toHex()}`;

    const level = await createLevel(tmpPath);
    const host = await setupAutomergeHost({ level });
    const handles = await Promise.all(range(2, () => host.createDoc({ text: 'Hello world' })));
    const expectedHeads: (Heads | undefined)[] = handles.map((handle) => getHeads(handle.doc()!));
    await host.flush(Context.default());

    const ids = handles.map((handle) => handle.documentId);
    ids.splice(1, 0, 'non-existent-id' as DocumentId);
    expectedHeads.splice(1, 0, undefined);

    expect(await host.getHeads(ids)).toEqual(expectedHeads);
    await host.close();
    await level.close();

    {
      const level = await createLevel(tmpPath);
      const host = await setupAutomergeHost({ level });
      expect(await host.getHeads(ids)).toEqual(expectedHeads);
      await host.close();
      await level.close();
    }
  });

  test('loads remote document over replication network', { timeout: 30_000 }, async ({ expect }) => {
    const level1 = await createLevel();
    const host1 = await setupAutomergeHost({ level: level1 });

    const level2 = await createLevel();
    const host2 = await setupAutomergeHost({ level: level2 });
    const handle = await host2.createDoc({ text: 'Hello from Subduction' });
    await host2.flush(Context.default());
    await waitForSubductionSave();

    const network = await new TestReplicationNetwork().open();
    try {
      await host1.addReplicator(Context.default(), await network.createReplicator());
      await host2.addReplicator(Context.default(), await network.createReplicator());

      const loaded = await host1.loadDoc<{ text: string }>(Context.default(), handle.documentId, { timeout: 20_000 });
      expect(loaded.doc()!.text).toEqual('Hello from Subduction');
    } finally {
      await host1.close();
      await host2.close();
      await network.close();
    }
  });

  test('collection synchronization', { timeout: 30_000 }, async ({ expect }) => {
    const NUM_DOCUMENTS = 10;

    const level1 = await createLevel();
    const host1 = await setupAutomergeHost({ level: level1 });

    const level2 = await createLevel();
    const host2 = await setupAutomergeHost({ level: level2 });
    const documentIds: DocumentId[] = [];
    for (const i of range(NUM_DOCUMENTS)) {
      const handle = await host2.createDoc({ docIndex: i });
      documentIds.push(handle.documentId);
    }
    await host2.flush(Context.default());
    await waitForSubductionSave();

    const network = await new TestReplicationNetwork().open();
    try {
      await host1.addReplicator(Context.default(), await network.createReplicator());
      await host2.addReplicator(Context.default(), await network.createReplicator());

      const collectionId = 'test-collection';
      await host1.updateLocalCollectionState(collectionId, documentIds);
      await host2.updateLocalCollectionState(collectionId, documentIds);

      for (const documentId of documentIds) {
        await expect
          .poll(() => host1.getHeads([documentId]), { timeout: 20_000 })
          .toEqual(await host2.getHeads([documentId]));
      }
    } finally {
      await host1.close();
      await host2.close();
      await network.close();
    }
  });

  test('collection synchronization is bidirectional', { timeout: 30_000 }, async ({ expect }) => {
    const host1DocumentIds: DocumentId[] = [];
    const host2DocumentIds: DocumentId[] = [];

    const level1 = await createLevel();
    const host1 = await setupAutomergeHost({ level: level1 });
    for (const i of range(3)) {
      const handle = await host1.createDoc({ host: 1, docIndex: i });
      host1DocumentIds.push(handle.documentId);
    }
    await host1.flush(Context.default());

    const level2 = await createLevel();
    const host2 = await setupAutomergeHost({ level: level2 });
    for (const i of range(3)) {
      const handle = await host2.createDoc({ host: 2, docIndex: i });
      host2DocumentIds.push(handle.documentId);
    }
    await host2.flush(Context.default());
    await waitForSubductionSave();

    const network = await new TestReplicationNetwork().open();
    try {
      await host1.addReplicator(Context.default(), await network.createReplicator());
      await host2.addReplicator(Context.default(), await network.createReplicator());

      const host1CollectionId = 'test-host1-collection';
      await host1.updateLocalCollectionState(host1CollectionId, host1DocumentIds);
      await host2.updateLocalCollectionState(host1CollectionId, host1DocumentIds);

      for (const documentId of host1DocumentIds) {
        await expect
          .poll(() => host2.getHeads([documentId]), { timeout: 20_000 })
          .toEqual(await host1.getHeads([documentId]));
      }

      const host2CollectionId = 'test-host2-collection';
      await host1.updateLocalCollectionState(host2CollectionId, host2DocumentIds);
      await host2.updateLocalCollectionState(host2CollectionId, host2DocumentIds);

      for (const documentId of host2DocumentIds) {
        await expect
          .poll(() => host1.getHeads([documentId]), { timeout: 20_000 })
          .toEqual(await host2.getHeads([documentId]));
      }
    } finally {
      await host1.close();
      await host2.close();
      await network.close();
    }
  });
});

const createLevel = async (tmpPath?: string) => {
  const level = createTestLevel(tmpPath);
  await openAndClose(level);
  return level;
};

const waitForSubductionSave = async () => {
  await sleep(150);
};

const setupAutomergeHost = async ({ level }: { level: LevelDB }) => {
  const host = new AutomergeHost({
    db: level,
    useSubduction: true,
  });
  await host.open();
  onTestFinished(async () => {
    await host.close();
  });
  return host;
};
