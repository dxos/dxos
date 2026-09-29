//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { PersonDoc, type TestDatabase, createPartitionedPair, headsOf } from './migration-bench/harness.ts';

//
// Lens-backed migrations, Phase C1/C4 (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md`): `foldAt`
// and `Obj.getConflict` are meant to work identically across peers, since the conflict lives in the
// replicated Automerge document itself, not in reader-local state. This runs the single-db
// `fold-at.test.ts` scenario across a real partition/heal to confirm both peers converge on the same
// policy-resolved view.
//

const queryPersonById = async (db: TestDatabase, id: string): Promise<PersonDoc> => {
  let found: PersonDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

describe('foldAt across a real partition/heal', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('one peer folds, the other edits directly; after heal both report the same Obj.getConflict result', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { fullName: 'original' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonById(db2, obj1.id);

    // The migration-like rename, replicated to both peers before the partition.
    Obj.update(obj1, (obj1) => {
      obj1.name = obj1.fullName;
    });
    await db1.flush();
    const postMigrationHeads = headsOf(obj1);
    await syncAll(db1, db2);
    await expect.poll(() => obj2.name).toBe('original');

    await partition();

    // Peer 1 folds a late `fullName` write at the recorded migration heads.
    const foldMessage = 'fold: fullName -> name';
    getObjectCore(obj1).foldAt(postMigrationHeads, (data) => (data.name = 'late'), {
      message: foldMessage,
      scope: obj1.id,
    });
    await db1.flush();

    // Peer 2, independently and concurrently, makes a direct edit.
    Obj.update(obj2, (obj2) => {
      obj2.name = 'direct';
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => Obj.getConflict(obj1, 'name')).toBeDefined();
    await expect.poll(() => Obj.getConflict(obj2, 'name')).toBeDefined();

    const conflict1 = Obj.getConflict(obj1, 'name');
    const conflict2 = Obj.getConflict(obj2, 'name');
    invariant(conflict1, 'expected peer 1 to see the conflict after heal');
    invariant(conflict2, 'expected peer 2 to see the conflict after heal');

    // User-wins: the direct edit is presented on both peers.
    expect(conflict1.presented).to.eq('direct');
    expect(conflict2.presented).to.eq('direct');

    // The alternative SET is the same replicated Automerge state on both peers -- same actor,
    // message and time, not merely the same values -- so a full sort-then-compare is meaningful.
    const normalize = (conflict: Obj.Conflict) =>
      [...conflict.alternatives].sort((a, b) => a.actor.localeCompare(b.actor));
    expect(normalize(conflict1)).to.deep.eq(normalize(conflict2));
    expect(conflict1.alternatives).to.have.length(2);

    const fold1 = conflict1.alternatives.find((alternative) => alternative.fold);
    const direct1 = conflict1.alternatives.find((alternative) => !alternative.fold);
    invariant(fold1, 'expected the fold among the alternatives');
    invariant(direct1, 'expected the direct edit among the alternatives');
    expect(fold1.value).to.eq('late');
    expect(fold1.message).to.eq(`${foldMessage} [${obj1.id}]`);
    expect(direct1.value).to.eq('direct');
  });

  test('two peers fold independently, under different derived actors, and converge with no merge error', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { fullName: 'original' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonById(db2, obj1.id);

    Obj.update(obj1, (obj1) => {
      obj1.name = obj1.fullName;
    });
    await db1.flush();
    const postMigrationHeads = headsOf(obj1);
    await syncAll(db1, db2);
    await expect.poll(() => obj2.name).toBe('original');

    await partition();

    // Both peers fold the SAME value at the SAME recorded heads -- genuinely independently, each under
    // its own peer-derived fold actor, never a shared or random one.
    const foldMessage = 'fold: fullName -> name';
    getObjectCore(obj1).foldAt(postMigrationHeads, (data) => (data.name = 'late'), {
      message: foldMessage,
      scope: obj1.id,
    });
    await db1.flush();
    getObjectCore(obj2).foldAt(postMigrationHeads, (data) => (data.name = 'late'), {
      message: foldMessage,
      scope: obj2.id,
    });
    await db2.flush();

    await heal();
    // Both sides already read `name` as `'late'` from their OWN fold alone (identical value), so that
    // is not a signal replication actually completed both ways -- poll on the fold change COUNT
    // instead, which only reaches 2 once each peer's document holds both changes.
    const foldChangesOn = (obj: typeof obj1): number =>
      A.getChangesMetaSince(getObjectCore(obj).getDoc(), []).filter(
        (change) => change.message === `${foldMessage} [${obj1.id}]`,
      ).length;
    await expect
      .poll(async () => {
        await syncAll(db1, db2);
        return [foldChangesOn(obj1), foldChangesOn(obj2)];
      })
      .toEqual([2, 2]);

    expect(obj1.name).to.eq('late');
    expect(obj2.name).to.eq('late');
    // Same value from both sides -- Automerge merges cleanly with no error, and there is nothing to
    // resolve even though the writes came from two distinct actors.
    expect(Obj.getConflict(obj1, 'name')).toBeUndefined();
    expect(Obj.getConflict(obj2, 'name')).toBeUndefined();

    const foldActors = new Set(
      A.getChangesMetaSince(getObjectCore(obj1).getDoc(), [])
        .filter((change) => change.message === `${foldMessage} [${obj1.id}]`)
        .map((change) => change.actor),
    );
    // Two peers, two DIFFERENT derived fold actors -- never the same one, and never a fresh random one.
    expect(foldActors.size).to.eq(2);
  });
});
