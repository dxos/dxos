//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { DatabaseDirectory } from '@dxos/echo-protocol';
import { PublicKey, SpaceId } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { AutomergeHost } from '../automerge';
import { SpaceStateManager } from './space-state-manager';

// Regression coverage for the subduction-policy race fixed by adding
// `_spaceByDocument` to {@link SpaceStateManager}. The production symptom
// was that `_subductionPolicy.authorizeFetch` denied the space root during
// the first ~50–150 ms of space init because `findSpaceByRootDocumentId`
// (in `SpaceManager`) requires the Epoch credential carrying
// `automergeRoot` to be processed first. Subduction's `lastSyncResult ===
// 'all-failed'` is sticky on the receiver side, so the denied root entry
// stayed stuck even after the credential landed, causing the doc never to
// converge.
//
// The fix: `SpaceStateManager` maintains a `documentId → spaceId` reverse
// index that is populated synchronously inside `assignRootToSpace` (root
// doc) and updated by the document-list scheduler (linked docs). The
// service-context policy now consults this map instead of the credential
// scan, eliminating the race window entirely.
describe('SpaceStateManager.findSpaceIdByDocumentId', () => {
  test('returns space id synchronously after assignRootToSpace', async () => {
    const { host, manager } = await setup();
    const spaceId = SpaceId.random();
    const spaceKey = PublicKey.random();

    const rootHandle = await host.createDoc(DatabaseDirectory.make({ spaceKey: spaceKey.toHex() }));
    const query = host.findWithProgress(rootHandle.documentId);
    await manager.assignRootToSpace(spaceId, query);

    // The reverse index MUST be populated by the time `assignRootToSpace`
    // resolves — earlier in the chain, the subduction handshake fires
    // `authorizeFetch` for the root within the same microtask block as
    // the space-open path and CANNOT wait for credentials.
    expect(manager.findSpaceIdByDocumentId(rootHandle.documentId)).toEqual(spaceId);
  });

  test('returns space id for already-linked documents synchronously after assignRootToSpace', async () => {
    // No `sleep()` — this is the production-critical path: at handshake
    // time, every link that the root already declares must resolve, or
    // subduction's `authorizeFetch` for those linked docs will deny.
    const { host, manager } = await setup();
    const spaceId = SpaceId.random();
    const spaceKey = PublicKey.random();

    const linked1 = await host.createDoc({ foo: 1 });
    const linked2 = await host.createDoc({ foo: 2 });
    const rootHandle = await host.createDoc(
      DatabaseDirectory.make({
        spaceKey: spaceKey.toHex(),
        links: {
          obj1: `automerge:${linked1.documentId}` as any,
          obj2: `automerge:${linked2.documentId}` as any,
        },
      }),
    );
    const query = host.findWithProgress(rootHandle.documentId);
    await manager.assignRootToSpace(spaceId, query);

    expect(manager.findSpaceIdByDocumentId(rootHandle.documentId)).toEqual(spaceId);
    expect(manager.findSpaceIdByDocumentId(linked1.documentId)).toEqual(spaceId);
    expect(manager.findSpaceIdByDocumentId(linked2.documentId)).toEqual(spaceId);
  });

  test('picks up linked documents added after assignRootToSpace via the scheduler', async () => {
    const { host, manager } = await setup();
    const spaceId = SpaceId.random();
    const spaceKey = PublicKey.random();

    const rootHandle = await host.createDoc(DatabaseDirectory.make({ spaceKey: spaceKey.toHex() }));
    const query = host.findWithProgress(rootHandle.documentId);
    await manager.assignRootToSpace(spaceId, query);

    // No links yet; only the root is attributed.
    const lateLinked = await host.createDoc({ foo: 3 });
    expect(manager.findSpaceIdByDocumentId(lateLinked.documentId)).toBeUndefined();

    // Add the link AFTER assignment; the scheduler debounce is 50 ms.
    rootHandle.change((doc: any) => {
      doc.links ??= {};
      doc.links.obj3 = `automerge:${lateLinked.documentId}`;
    });
    await sleep(150);

    expect(manager.findSpaceIdByDocumentId(lateLinked.documentId)).toEqual(spaceId);
  });

  test('returns undefined for documents not in any space', async () => {
    const { host, manager } = await setup();
    const spaceId = SpaceId.random();
    const spaceKey = PublicKey.random();

    const rootHandle = await host.createDoc(DatabaseDirectory.make({ spaceKey: spaceKey.toHex() }));
    const query = host.findWithProgress(rootHandle.documentId);
    await manager.assignRootToSpace(spaceId, query);

    const orphan = await host.createDoc({ foo: 1 });
    expect(manager.findSpaceIdByDocumentId(orphan.documentId)).toBeUndefined();
    expect(manager.findSpaceIdByDocumentId('xxxxxxxxx' as DocumentId)).toBeUndefined();
  });

  test('attributes each document to its space across two spaces', async () => {
    const { host, manager } = await setup();
    const spaceA = SpaceId.random();
    const spaceB = SpaceId.random();
    const rootA = await host.createDoc(DatabaseDirectory.make({ spaceKey: PublicKey.random().toHex() }));
    const rootB = await host.createDoc(DatabaseDirectory.make({ spaceKey: PublicKey.random().toHex() }));

    await manager.assignRootToSpace(spaceA, host.findWithProgress(rootA.documentId));
    await manager.assignRootToSpace(spaceB, host.findWithProgress(rootB.documentId));

    expect(manager.findSpaceIdByDocumentId(rootA.documentId)).toEqual(spaceA);
    expect(manager.findSpaceIdByDocumentId(rootB.documentId)).toEqual(spaceB);
  });

  test('drops previous root from index when root is reassigned', async () => {
    const { host, manager } = await setup();
    const spaceId = SpaceId.random();
    const spaceKey = PublicKey.random();

    const oldRoot = await host.createDoc(DatabaseDirectory.make({ spaceKey: spaceKey.toHex() }));
    const newRoot = await host.createDoc(DatabaseDirectory.make({ spaceKey: spaceKey.toHex() }));

    await manager.assignRootToSpace(spaceId, host.findWithProgress(oldRoot.documentId));
    expect(manager.findSpaceIdByDocumentId(oldRoot.documentId)).toEqual(spaceId);

    await manager.assignRootToSpace(spaceId, host.findWithProgress(newRoot.documentId));
    expect(manager.findSpaceIdByDocumentId(newRoot.documentId)).toEqual(spaceId);
    // The old root MUST be evicted; otherwise the policy would keep
    // attributing it to a space whose root has moved.
    expect(manager.findSpaceIdByDocumentId(oldRoot.documentId)).toBeUndefined();
  });
});

const setup = async () => {
  const kv = createTestLevel();
  const host = new AutomergeHost({ db: kv });
  await openAndClose(host);
  const manager = new SpaceStateManager();
  await openAndClose(manager);
  return { host, manager };
};
