//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { EchoTestBuilder, createDataAssertion } from '@dxos/echo-client/testing';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { PublicKey } from '@dxos/keys';

describe('combined sync state', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('reports automerge backlog for an explicitly selected peer', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    const dataAssertion = createDataAssertion({ numObjects: 5 });

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    await dataAssertion.seed(db1);
    await db1.flush();
    const heads = await db1.getDocumentHeads();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await db2.waitUntilHeadsReplicated(heads);
    await db2.updateIndexes();

    // There is no EDGE peer in a local topology, so discover the mesh peer id via the per-peer API.
    await expect.poll(async () => (await db2.getAutomergeSyncState()).peers?.length ?? 0).toBeGreaterThan(0);
    const [{ peerId }] = (await db2.getAutomergeSyncState()).peers!;

    // The combined state, scoped to that peer, converges to zero backlog once replicated.
    await expect.poll(async () => (await db2.getSyncState({ peerId })).unsyncedDocumentCount).toBe(0);

    const state = await db2.getSyncState({ peerId });
    expect(state.totalDocumentCount).toBeGreaterThan(0);
    // The space has no feeds, so the feed backlog is empty.
    expect(state).toMatchObject({ blocksToPull: '0', blocksToPush: '0', totalBlocks: '0' });
  });

  test('defaults to the EDGE peer, reporting an empty backlog when none is present', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);

    // With no EDGE peer in the topology, the default selection resolves to no peer.
    const state = await db.getSyncState();
    expect(state).toMatchObject({
      localDocumentCount: 0,
      remoteDocumentCount: 0,
      totalDocumentCount: 0,
      unsyncedDocumentCount: 0,
      blocksToPull: '0',
      blocksToPush: '0',
      totalBlocks: '0',
    });
  });
});
