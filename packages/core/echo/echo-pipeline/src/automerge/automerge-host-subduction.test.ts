//
// Copyright 2026 DXOS.org
//

import { getHeads } from '@automerge/automerge';
import * as Automerge from '@automerge/automerge';
import {
  type DocumentId,
  type Heads,
  type SubductionPeerBinding,
  generateAutomergeUrl,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { describe, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import type { CollectionId } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import type { LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { TestBuilder as TeleportBuilder, TestPeer as TeleportPeer } from '@dxos/teleport/testing';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { TestReplicationNetwork } from '../testing';
import { AutomergeHost } from './automerge-host';
import { MeshEchoReplicator } from './mesh-echo-replicator';

// TODO(mykola): subduction wasm/network tests are flaky on CI runners
// (limited concurrency, signal-server timing). Re-enable once the suite
// is stable in CI.
describe.skipIf(process.env.CI)('AutomergeHost with Subduction', () => {
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
    invariant(handle2);
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
    invariant(loadedHandle);
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

  test('loads remote document over replication network', { timeout: 5_000 }, async ({ expect }) => {
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

      const loaded = await host1.loadDoc<{ text: string }>(Context.default(), handle.documentId, { timeout: 1_000 });
      invariant(loaded);
      expect(loaded.doc()!.text).toEqual('Hello from Subduction');
    } finally {
      await host1.close();
      await host2.close();
      await network.close();
    }
  });

  // Sequential close (one host fully shut down before the other starts)
  // exercises the same teardown path as the existing
  // `loads remote document over replication network` test and is included as a
  // baseline for the concurrent-close case below.
  test('sequential close after sync does not hang', { timeout: 5_000 }, async ({ expect }) => {
    const level1 = await createLevel();
    const host1 = await setupAutomergeHost({ level: level1 });

    const level2 = await createLevel();
    const host2 = await setupAutomergeHost({ level: level2 });
    const handle = await host2.createDoc({ text: 'Hello from Subduction' });
    await host2.flush(Context.default());
    await waitForSubductionSave();

    const network = await new TestReplicationNetwork().open();
    await host1.addReplicator(Context.default(), await network.createReplicator());
    await host2.addReplicator(Context.default(), await network.createReplicator());

    const loaded = await host1.loadDoc<{ text: string }>(Context.default(), handle.documentId, { timeout: 1_000 });
    invariant(loaded);
    expect(loaded.doc()!.text).toEqual('Hello from Subduction');

    await host1.close();
    await host2.close();
    await network.close();
  });

  // Reproduces a hang during teardown observed in client-level invitation tests:
  // when two hosts have synced over the mesh-style replicator and then close
  // concurrently, one side's `_close` (specifically `_repo.flush()`) never
  // returns. The first close to arrive tears down its side of the connection
  // (cancels readers / aborts writers); the second host then enters `_close`
  // and gets stuck draining subduction state that depends on the now-dead
  // peer.
  test('concurrent close after sync does not hang', { timeout: 30_000 }, async ({ expect }) => {
    const level1 = await createLevel();
    const host1 = await setupAutomergeHost({ level: level1 });

    const level2 = await createLevel();
    const host2 = await setupAutomergeHost({ level: level2 });
    const handle = await host2.createDoc({ text: 'Hello from Subduction' });
    await host2.flush(Context.default());
    await waitForSubductionSave();

    const network = await new TestReplicationNetwork().open();
    await host1.addReplicator(Context.default(), await network.createReplicator());
    await host2.addReplicator(Context.default(), await network.createReplicator());

    const loaded = await host1.loadDoc<{ text: string }>(Context.default(), handle.documentId, { timeout: 1_000 });
    invariant(loaded);
    expect(loaded.doc()!.text).toEqual('Hello from Subduction');

    await Promise.all([host1.close(), host2.close()]);
    await network.close();
  });

  test('collection synchronization', { timeout: 5_000 }, async ({ expect }) => {
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
      const collectionUpdates: CollectionId[] = [];
      const unsubscribe = host1.collectionStateUpdated.on(({ collectionId }) => {
        collectionUpdates.push(collectionId);
      });
      await host1.updateLocalCollectionState(collectionId, documentIds);
      await host2.updateLocalCollectionState(collectionId, documentIds);

      for (const documentId of documentIds) {
        await expect
          .poll(() => host1.getHeads([documentId]), { timeout: 1_000 })
          .toEqual(await host2.getHeads([documentId]));
      }

      // collectionStateUpdated fires whenever host1 observes a `collection-state` from host2
      // (see {@link CollectionSynchronizer.peerCollectionStateUpdated}). At least one event must
      // arrive for the heads to have converged via the collection-sync path rather than
      // raw Subduction byte transport.
      expect(collectionUpdates).toContain(collectionId as CollectionId);
      unsubscribe();
    } finally {
      await host1.close();
      await host2.close();
      await network.close();
    }
  });

  describe('subductionPolicy gates host-to-host replication', () => {
    // Two hosts where the holder advertises the doc; the fetcher should receive it.
    // Mirrors the "loads remote document over replication network" baseline but
    // explicitly exercises `_subductionPolicy.authorizeFetch` via the per-connection
    // `shouldAdvertise` predicate.
    test('authorized holder allows fetcher', { timeout: 5_000 }, async ({ expect }) => {
      const host1 = await setupAutomergeHost({ level: await createLevel() });
      const host2 = await setupAutomergeHost({ level: await createLevel() });
      const handle = await host2.createDoc({ text: 'authorized' });
      await host2.flush(Context.default());
      await waitForSubductionSave();

      const network = await new TestReplicationNetwork().open();
      try {
        await host1.addReplicator(Context.default(), await network.createReplicator({ shouldAdvertise: () => true }));
        await host2.addReplicator(Context.default(), await network.createReplicator({ shouldAdvertise: () => true }));

        const loaded = await host1.loadDoc<{ text: string }>(Context.default(), handle.documentId, { timeout: 1_000 });
        invariant(loaded);
        expect(loaded.doc()!.text).toEqual('authorized');
      } finally {
        await host1.close();
        await host2.close();
        await network.close();
      }
    });

    // Holder's `shouldAdvertise` returns false → `_subductionPolicy.authorizeFetch`
    // on the holder rejects the fetcher's request → fetcher's query never reaches
    // `'ready'` and the local doc stays empty.
    test('unauthorized holder blocks fetcher (authorizeFetch denial)', { timeout: 5_000 }, async ({ expect }) => {
      const host1 = await setupAutomergeHost({ level: await createLevel() });
      const host2 = await setupAutomergeHost({ level: await createLevel() });
      const handle = await host2.createDoc({ text: 'should-not-fetch' });
      await host2.flush(Context.default());
      await waitForSubductionSave();

      const network = await new TestReplicationNetwork().open();
      try {
        await host1.addReplicator(Context.default(), await network.createReplicator({ shouldAdvertise: () => true }));
        // host2 (holder) refuses to advertise.
        await host2.addReplicator(Context.default(), await network.createReplicator({ shouldAdvertise: () => false }));

        // Don't await `loadDoc` (it would hang). Probe via findWithProgress and assert no transition to 'ready'.
        const progress = host1.findWithProgress<{ text: string }>(handle.documentId);
        await sleep(POLICY_NEGATIVE_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
        expect(progress.handle.doc()?.text).to.be.undefined;
      } finally {
        await host1.close();
        await host2.close();
        await network.close();
      }
    });

    // Flip the holder's `shouldAdvertise` from false to true and kick `shareConfigChanged()`
    // via the host (e.g. by calling `createDoc` which now schedules the task in both modes).
    // Per SKILL doc, `shareConfigChanged()` is the documented recovery hatch for
    // `authorizeFetch`-denied entries.
    test(
      'shareConfigChanged() recovers after authorizeFetch denial flips to allow',
      { timeout: 5_000 },
      async ({ expect }) => {
        const host1 = await setupAutomergeHost({ level: await createLevel() });
        const host2 = await setupAutomergeHost({ level: await createLevel() });
        const handle = await host2.createDoc({ text: 'recover-me' });
        await host2.flush(Context.default());
        await waitForSubductionSave();

        const network = await new TestReplicationNetwork().open();
        try {
          const host1Replicator = await network.createReplicator({ shouldAdvertise: () => true });
          const host2Replicator = await network.createReplicator({ shouldAdvertise: () => false });
          await host1.addReplicator(Context.default(), host1Replicator);
          await host2.addReplicator(Context.default(), host2Replicator);

          const progress = host1.findWithProgress<{ text: string }>(handle.documentId);
          await sleep(POLICY_NEGATIVE_DELAY_MS);
          expect(progress.peek().state).to.not.equal('ready');

          // Flip the holder to allow, then drive a no-op commit on the holder.
          // Creating a fresh doc on host2 schedules `_sharePolicyChangedTask`, which
          // calls `_repo.shareConfigChanged()` on host2 — the documented recovery
          // hatch for `authorizeFetch`-denied entries.
          host2Replicator.shouldAdvertise = () => true;
          await host2.createDoc({ kick: true });

          await expect.poll(() => progress.peek().state, { timeout: 5_000 }).toEqual('ready');
          expect(progress.handle.doc()?.text).toEqual('recover-me');
        } finally {
          await host1.close();
          await host2.close();
          await network.close();
        }
      },
    );

    // Regression test for the patched `Repo.on('subduction-peer-bound', ...)` event
    // (mirrors upstream automerge/automerge-repo#635). Subduction's discovery handshake
    // produces a verified peer id on the responder side; in our test topology (both
    // hosts use `role: 'connect'`) at least one side observes the binding. We assert
    // the binding fields rather than count of events: the responder's binding must
    // carry the connector's repo PeerId and a distinct subduction PeerId.
    test('subduction-peer-bound event surfaces verified peer ids', { timeout: 5_000 }, async ({ expect }) => {
      const host1 = await setupAutomergeHost({ level: await createLevel() });
      const host2 = await setupAutomergeHost({ level: await createLevel() });
      // The Subduction handshake only triggers when there is data to sync. Create a
      // doc on host2 before connecting so the adapter-connect flow runs end-to-end.
      await host2.createDoc({ text: 'binding-fixture' });
      await host2.flush(Context.default());
      await waitForSubductionSave();

      const bindings: Array<{ side: 'host1' | 'host2'; binding: SubductionPeerBinding }> = [];
      ((host1 as any)._repo as any).on('subduction-peer-bound', (b: SubductionPeerBinding) =>
        bindings.push({ side: 'host1', binding: b }),
      );
      ((host2 as any)._repo as any).on('subduction-peer-bound', (b: SubductionPeerBinding) =>
        bindings.push({ side: 'host2', binding: b }),
      );

      const network = await new TestReplicationNetwork().open();
      try {
        await host1.addReplicator(Context.default(), await network.createReplicator());
        await host2.addReplicator(Context.default(), await network.createReplicator());

        await expect.poll(() => bindings.length, { timeout: 3_000 }).toBeGreaterThan(0);

        for (const { side, binding } of bindings) {
          invariant('repoPeerId' in binding, 'expected adapter binding');
          // repoPeerId on side X should match the OTHER host's repo peerId.
          const expectedRemote = side === 'host1' ? host2.peerId : host1.peerId;
          expect(binding.repoPeerId).toEqual(expectedRemote);
          // The subduction PeerId is the verified signer Ed25519 pubkey hex — disjoint
          // from the repo PeerId (which is the `host-<random>` label).
          expect(binding.subductionPeerId.toString()).not.toEqual(binding.repoPeerId);
        }
      } finally {
        await host1.close();
        await host2.close();
        await network.close();
      }
    });
  });

  // Characterization of `_subductionPolicy` recovery behavior introduced by
  // PR 11351 — relevant to the production sync-divergence investigation.
  //
  // Setup: both hosts have the same documents with DIVERGENT commits (each
  // side has one local commit the other lacks), mirroring production state
  // where the sync diagnostic reports `differentDocuments: N` and
  // `localDocumentCount === remoteDocumentCount`.
  //
  // FINDING: with `AutomergeHost.useSubduction: true`, even when one side's
  // policy denies BOTH `authorizeFetch` and `authorizePut` during the
  // initial subduction sync round (confirmed via subduction_core WARNs
  // `policy denied: authorizePut denied by client share policy`), flipping
  // the policy to allow recovers replication within ~5 seconds WITHOUT any
  // external nudge (no fresh commit, no explicit `shareConfigChanged()`
  // call from the test). The recovery is driven by `AutomergeHost`'s
  // automatic `_sharePolicyChangedTask` firing on `documentRequested`
  // events from subduction's heal-retry attempts.
  //
  // This contradicts the raw-Repo F1 test in
  // `automerge-repo-subduction.test.ts` ("authorizePut deny → allow needs
  // a fresh holder commit to recover"), suggesting that the
  // `AutomergeHost` wrapper papers over the raw bridge's recovery gap.
  //
  // Implication for the production sync bug: a transient policy denial
  // during initial sync does NOT explain a persistent multi-second
  // divergence under `AutomergeHost`. The production bug must have a
  // different root cause.
  describe('initial-sync policy denial: recovery characterization', () => {
    const NUM_DOCUMENTS = 5;

    const createDivergentDocs = async (host1: AutomergeHost, host2: AutomergeHost): Promise<DocumentId[]> => {
      const documentIds: DocumentId[] = [];
      for (const i of range(NUM_DOCUMENTS)) {
        const initial = Automerge.from({ docIndex: i, version: 0 });
        const binary = Automerge.save(initial);
        const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
        const h1 = await host1.createDoc(binary, { documentId, preserveHistory: true });
        const h2 = await host2.createDoc(binary, { documentId, preserveHistory: true });
        h1.change((doc: any) => {
          doc.fromHost1 = true;
        });
        h2.change((doc: any) => {
          doc.fromHost2 = true;
        });
        documentIds.push(documentId);
      }
      await host1.flush(Context.default());
      await host2.flush(Context.default());
      await waitForSubductionSave();
      return documentIds;
    };

    const allConverged = async (host1: AutomergeHost, host2: AutomergeHost, ids: DocumentId[]) => {
      for (const id of ids) {
        const h1 = [...((await host1.getHeads([id]))[0] ?? [])].sort();
        const h2 = [...((await host2.getHeads([id]))[0] ?? [])].sort();
        if (h1.length !== h2.length || h1.some((h, i) => h !== h2[i])) {
          return false;
        }
      }
      return true;
    };

    test(
      'deny→allow flip auto-recovers via AutomergeHost machinery (no manual kick)',
      // 3s deny window + up to 10s convergence poll + teardown — give CI headroom.
      { timeout: 25_000 },
      async ({ expect }) => {
        const host1 = await setupAutomergeHost({ level: await createLevel() });
        const host2 = await setupAutomergeHost({ level: await createLevel() });
        const documentIds = await createDivergentDocs(host1, host2);

        const network = await new TestReplicationNetwork().open();
        try {
          let allowOnHost1 = false;
          const host1Replicator = await network.createReplicator({ shouldAdvertise: () => allowOnHost1 });
          await host1.addReplicator(Context.default(), host1Replicator);
          await host2.addReplicator(Context.default(), await network.createReplicator({ shouldAdvertise: () => true }));

          // Hold deny long enough for subduction to attempt + log denials.
          await sleep(3_000);
          expect(await allConverged(host1, host2, documentIds)).toBe(false);

          allowOnHost1 = true;

          await expect.poll(() => allConverged(host1, host2, documentIds), { timeout: 10_000 }).toBe(true);
        } finally {
          await host1.close();
          await host2.close();
          await network.close();
        }
      },
    );

    test('control: docs converge when policy never denies', { timeout: 15_000 }, async ({ expect }) => {
      const host1 = await setupAutomergeHost({ level: await createLevel() });
      const host2 = await setupAutomergeHost({ level: await createLevel() });
      const documentIds = await createDivergentDocs(host1, host2);

      const network = await new TestReplicationNetwork().open();
      try {
        await host1.addReplicator(Context.default(), await network.createReplicator({ shouldAdvertise: () => true }));
        await host2.addReplicator(Context.default(), await network.createReplicator({ shouldAdvertise: () => true }));

        await expect.poll(() => allConverged(host1, host2, documentIds), { timeout: 5_000 }).toBe(true);
      } finally {
        await host1.close();
        await host2.close();
        await network.close();
      }
    });
  });

  test('collection synchronization is bidirectional', { timeout: 10_000 }, async ({ expect }) => {
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
          .poll(() => host2.getHeads([documentId]), { timeout: 1_000 })
          .toEqual(await host1.getHeads([documentId]));
      }

      const host2CollectionId = 'test-host2-collection';
      await host1.updateLocalCollectionState(host2CollectionId, host2DocumentIds);
      await host2.updateLocalCollectionState(host2CollectionId, host2DocumentIds);

      for (const documentId of host2DocumentIds) {
        await expect
          .poll(() => host1.getHeads([documentId]), { timeout: 1_000 })
          .toEqual(await host2.getHeads([documentId]));
      }
    } finally {
      await host1.close();
      await host2.close();
      await network.close();
    }
  });

  // End-to-end policy gating using the real DXOS replication stack:
  // `MeshEchoReplicator` over `TeleportBuilder`. The mesh replicator is the
  // production wiring for peer-to-peer DXOS connections; it gates per-space
  // via `authorizeDevice(spaceKey, deviceKey)`.
  describe('subductionPolicy + MeshEchoReplicator', () => {
    // Two hosts in the same space, both authorized → doc replicates.
    test('authorized peers in same space replicate', { timeout: 5_000 }, async ({ expect }) => {
      const spaceKey = PublicKey.random();
      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      const host1 = await setupMeshAutomergeHost({ level: await createLevel(), spaceKey, teleportBuilder });
      const host2 = await setupMeshAutomergeHost({ level: await createLevel(), spaceKey, teleportBuilder });

      const handle = await host2.host.createDoc({ text: 'mesh-authorized' });
      await host2.host.flush(Context.default());
      await waitForSubductionSave();

      await connectMeshPeers(teleportBuilder, host1, host2, spaceKey, /* authorized */ true);

      await expect
        .poll(
          async () =>
            (
              await host1.host.loadDoc<{ text: string }>(Context.default(), handle.documentId, { timeout: 1_000 })
            )?.doc()?.text,
          { timeout: 3_000 },
        )
        .toEqual('mesh-authorized');
    });

    // Two hosts in the same space, but neither side `authorizeDevice`s the other.
    // `MeshReplicatorConnection.shouldAdvertise` consults `_authorizedDevices`, which
    // is empty → `_subductionPolicy.authorizeFetch` rejects on the holder → fetcher
    // never reaches `'ready'`.
    test('unauthorized peers cannot fetch (authorizeFetch denial)', { timeout: 5_000 }, async ({ expect }) => {
      const spaceKey = PublicKey.random();
      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      const host1 = await setupMeshAutomergeHost({ level: await createLevel(), spaceKey, teleportBuilder });
      const host2 = await setupMeshAutomergeHost({ level: await createLevel(), spaceKey, teleportBuilder });

      const handle = await host2.host.createDoc({ text: 'mesh-denied' });
      await host2.host.flush(Context.default());
      await waitForSubductionSave();

      await connectMeshPeers(teleportBuilder, host1, host2, spaceKey, /* authorized */ false);

      const progress = host1.host.findWithProgress<{ text: string }>(handle.documentId);
      await sleep(POLICY_NEGATIVE_DELAY_MS);
      expect(progress.peek().state).to.not.equal('ready');
      expect(progress.handle.doc()?.text).to.be.undefined;
    });

    // Start unauthorized; the holder's `_subductionPolicy.authorizeFetch` rejects.
    // Then authorize the device on the holder and drive a fresh commit (which schedules
    // `_sharePolicyChangedTask` → `_repo.shareConfigChanged()` on the holder — the
    // documented recovery hatch). The denied entry on the fetcher should clear and
    // the doc syncs.
    test('authorizeDevice after denial recovers replication', { timeout: 10_000 }, async ({ expect }) => {
      const spaceKey = PublicKey.random();
      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      const host1 = await setupMeshAutomergeHost({ level: await createLevel(), spaceKey, teleportBuilder });
      const host2 = await setupMeshAutomergeHost({ level: await createLevel(), spaceKey, teleportBuilder });

      const handle = await host2.host.createDoc({ text: 'mesh-recover' });
      await host2.host.flush(Context.default());
      await waitForSubductionSave();

      await connectMeshPeers(teleportBuilder, host1, host2, spaceKey, /* authorized */ false);

      // Probe but don't wait on `findWithProgress` (the subduction fork transitions
      // to `'unavailable'` when no peer serves the doc, which is sticky).
      await sleep(POLICY_NEGATIVE_DELAY_MS);
      const initial = host1.host.findWithProgress<{ text: string }>(handle.documentId).peek();
      expect(initial.state).to.not.equal('ready');

      // `authorizeDevice` re-emits `peer-disconnected` + `peer-candidate` through the
      // EchoNetworkAdapter, which under subduction triggers a fresh handshake — that
      // clears the stuck "all-failed" fetch entry and rebinds the subduction PeerId.
      // Driving a no-op commit on the holder kicks `_sharePolicyChangedTask` →
      // `shareConfigChanged()` for belt-and-suspenders recovery on the fetcher.
      await host1.meshReplicator.authorizeDevice(spaceKey, host2.teleport.peerId);
      await host2.meshReplicator.authorizeDevice(spaceKey, host1.teleport.peerId);
      await host2.host.createDoc({ kick: true });

      // Re-probe via a fresh load: the previous `DocumentQuery` may already have
      // entered `'unavailable'`, which is a terminal state in this fork.
      await expect
        .poll(
          async () =>
            (await host1.host.loadDoc<{ text: string }>(Context.default(), handle.documentId, { timeout: 500 }))?.doc()
              ?.text,
          { timeout: 5_000 },
        )
        .toEqual('mesh-recover');
    });

    // Per-space authorization scoping: a device authorized for space A must not be
    // able to fetch documents that belong to space B, even on the same connection.
    // Verifies that `_subductionPolicy.authorizeFetch` resolves the doc's
    // `spaceKey` via `getContainingSpaceForDocument` → `_getSpaceKeyByRootDocumentId`
    // and that `MeshReplicatorConnection.shouldAdvertise` rejects when the device
    // is not in `_authorizedDevices[spaceB]`.
    test('device authorized for space A cannot fetch space B docs', { timeout: 5_000 }, async ({ expect }) => {
      const spaceA = PublicKey.random();
      const spaceB = PublicKey.random();
      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      // host2 owns two docs; we'll allocate the document ids up front so we can
      // wire the per-doc space lookup before either host opens.
      const spaceADocId = parseAutomergeUrl(generateAutomergeUrl()).documentId;
      const spaceBDocId = parseAutomergeUrl(generateAutomergeUrl()).documentId;
      const spaceLookup = (documentId: string): PublicKey | undefined =>
        documentId === spaceADocId ? spaceA : documentId === spaceBDocId ? spaceB : undefined;

      const host1 = await setupMeshAutomergeHost({
        level: await createLevel(),
        spaceLookup,
        teleportBuilder,
      });
      const host2 = await setupMeshAutomergeHost({
        level: await createLevel(),
        spaceLookup,
        teleportBuilder,
      });

      await host2.host.createDoc(Automerge.from({ text: 'space-A-doc' }), {
        documentId: spaceADocId,
        preserveHistory: true,
      });
      await host2.host.createDoc(Automerge.from({ text: 'space-B-doc' }), {
        documentId: spaceBDocId,
        preserveHistory: true,
      });
      await host2.host.flush(Context.default());
      await waitForSubductionSave();

      // Authorize the device pair only for space A on both sides.
      await host1.meshReplicator.authorizeDevice(spaceA, host2.teleport.peerId);
      await host2.meshReplicator.authorizeDevice(spaceA, host1.teleport.peerId);

      const [connection1, connection2] = await teleportBuilder.connect(host1.teleport, host2.teleport);
      connection1.teleport.addExtension('automerge', host1.meshReplicator.createExtension());
      connection2.teleport.addExtension('automerge', host2.meshReplicator.createExtension());

      // Space A doc replicates.
      await expect
        .poll(
          async () =>
            (await host1.host.loadDoc<{ text: string }>(Context.default(), spaceADocId, { timeout: 1_000 }))?.doc()
              ?.text,
          { timeout: 3_000 },
        )
        .toEqual('space-A-doc');

      // Space B doc does NOT — host2's `_subductionPolicy.authorizeFetch` resolves
      // its space → spaceB, finds no authorized devices for spaceB, rejects.
      const progress = host1.host.findWithProgress<{ text: string }>(spaceBDocId);
      await sleep(POLICY_NEGATIVE_DELAY_MS);
      expect(progress.peek().state).to.not.equal('ready');
      expect(progress.handle.doc()?.text).to.be.undefined;
    });
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

/**
 * Wait long enough that a permissive policy would have completed the sync round, so
 * a stable not-ready / empty assertion proves the policy denial held. Tuned for the
 * happy-path subduction sync observed locally (~200–300 ms) plus margin.
 */
const POLICY_NEGATIVE_DELAY_MS = 500;

const setupAutomergeHost = async ({ level }: { level: LevelDB }) => {
  const host = new AutomergeHost({
    db: level,
    useSubduction: true,
  });
  await host.open();
  onTestFinished(async () => {
    if (host.isOpen) {
      await host.close();
    }
  });
  return host;
};

type MeshTestPeer = {
  host: AutomergeHost;
  meshReplicator: MeshEchoReplicator;
  teleport: TeleportPeer;
};

/**
 * Spin up an `AutomergeHost` whose subduction transport carries a
 * `MeshEchoReplicator`, the production p2p wiring. The host's
 * `getSpaceKeyByRootDocumentId` is stubbed to return the test space key for any
 * document id, so `_subductionPolicy.authorizeFetch` → `MeshReplicatorConnection.shouldAdvertise`
 * resolves the space lookup without depending on actual `DatabaseDirectory` docs.
 */
const setupMeshAutomergeHost = async ({
  level,
  spaceKey,
  spaceLookup,
  teleportBuilder,
}: {
  level: LevelDB;
  /** Single-space mode: every doc reports this space. */
  spaceKey?: PublicKey;
  /** Multi-space mode: per-doc lookup; takes precedence over `spaceKey`. */
  spaceLookup?: (documentId: string) => PublicKey | undefined;
  teleportBuilder: TeleportBuilder;
}): Promise<MeshTestPeer> => {
  invariant(spaceKey || spaceLookup, 'either spaceKey or spaceLookup is required');
  const host = new AutomergeHost({
    db: level,
    useSubduction: true,
    // Bypass DatabaseDirectory lookup: route every doc through a synthetic
    // `documentId → spaceKey` map so `MeshReplicatorConnection.shouldAdvertise`
    // can look up `_authorizedDevices[space]` without depending on
    // `DatabaseDirectory`-shaped contents.
    getSpaceKeyByRootDocumentId: spaceLookup ?? (() => spaceKey),
  });
  await host.open();
  onTestFinished(async () => {
    if (host.isOpen) {
      await host.close();
    }
  });

  const meshReplicator = new MeshEchoReplicator();
  await host.addReplicator(Context.default(), meshReplicator);

  const teleport = teleportBuilder.createPeer({ factory: () => new TeleportPeer() });
  return { host, meshReplicator, teleport };
};

/**
 * Bring up a teleport connection between two `MeshTestPeer`s and (optionally)
 * `authorizeDevice` each side for the given `spaceKey`. Returns when the
 * automerge extension has been wired into both teleport endpoints.
 */
const connectMeshPeers = async (
  builder: TeleportBuilder,
  peer1: MeshTestPeer,
  peer2: MeshTestPeer,
  spaceKey: PublicKey,
  authorized: boolean,
) => {
  if (authorized) {
    await peer1.meshReplicator.authorizeDevice(spaceKey, peer2.teleport.peerId);
    await peer2.meshReplicator.authorizeDevice(spaceKey, peer1.teleport.peerId);
  }

  const [connection1, connection2] = await builder.connect(peer1.teleport, peer2.teleport);
  connection1.teleport.addExtension('automerge', peer1.meshReplicator.createExtension());
  connection2.teleport.addExtension('automerge', peer2.meshReplicator.createExtension());
};
