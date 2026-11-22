//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';

import { Context } from '@dxos/context';
import { type Type } from '@dxos/echo';
import { type EchoTestBuilder, type EchoTestPeer, getObjectCore } from '@dxos/echo-client/testing';
import { TestReplicationNetwork, type TestReplicator } from '@dxos/echo-host/testing';
import { type AnyProperties } from '@dxos/echo/internal';

/** What the test builder returns: wider than the public `EchoDatabase` interface, with the heads and index methods tests drive. */
export type TestDatabase = Awaited<ReturnType<EchoTestPeer['createDatabase']>>;

export type PartitionedPair = {
  network: TestReplicationNetwork;
  peer1: EchoTestPeer;
  peer2: EchoTestPeer;
  /** Severs the transport: `removeReplicator` on both sides, so subsequent writes are concurrent. */
  partition: () => Promise<void>;
  /** Reconnects with FRESH replicator instances (re-adding removed ones is unexplored/unneeded per prior research). */
  heal: () => Promise<void>;
  /** `waitUntilHeadsReplicated` both ways + `updateIndexes` both, so both dbs observe the fully merged state. */
  syncAll: (db1: TestDatabase, db2: TestDatabase) => Promise<void>;
};

/**
 * Two peers on one replication network that a test can partition and heal. Databases are not owned here:
 * tests create or open their own with `peer.createDatabase`/`peer.openDatabase`.
 */
export const createPartitionedPair = async (
  builder: EchoTestBuilder,
  types: Type.AnyEntity[],
): Promise<PartitionedPair> => {
  const network = await new TestReplicationNetwork().open();
  const peer1 = await builder.createPeer({ types });
  const peer2 = await builder.createPeer({ types });

  let replicator1: TestReplicator = await network.createReplicator();
  let replicator2: TestReplicator = await network.createReplicator();
  await peer1.host.addReplicator(Context.default(), replicator1);
  await peer2.host.addReplicator(Context.default(), replicator2);

  const partition = async (): Promise<void> => {
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);
  };

  const heal = async (): Promise<void> => {
    replicator1 = await network.createReplicator();
    replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);
  };

  const syncAll = async (db1: TestDatabase, db2: TestDatabase): Promise<void> => {
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();
  };

  return { network, peer1, peer2, partition, heal, syncAll };
};

/**
 * Automerge docs are immutable snapshots, so heads must be read off a FRESH `getDoc()` call every
 * time rather than cached from an earlier reference.
 */
export const headsOf = <T extends AnyProperties>(obj: T): Heads => A.getHeads(getObjectCore(obj).getDoc());
