//
// Copyright 2026 DXOS.org
//

import { type SpliceTextPatch } from '@automerge/automerge';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Annotation, Filter, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  PersonDoc,
  changedProps,
  createPartitionedPair,
  diffSince,
  foldInto,
  foldValue,
  headsOf,
  recordConflict,
} from './harness';

//
// E1: definitive proof that single-object fold-forward migration is solved. Consolidates
// `migration-research.test.ts` claims 2, 3, 4, 5, 12 into one authoritative suite. See
// `.agents/projects/lenses/DESIGN.md` §10.3.
//

/** Stands in for `EntityMeta.version`: the design wants a per-object migration marker (claim 12). */
const MigrationVersionAnnotation = Annotation.make({
  id: 'org.dxos.test.migration.bench.version',
  schema: Schema.Number,
});

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryPersonById = async (db: EchoDatabase, id: string): Promise<PersonDoc> => {
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

describe('E1: single-object migration is solved', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    // Peers must close before the network so replicator teardown runs against a live network —
    // and this ordering must hold on the assertion-failure path too, which an in-test
    // `await using network` cannot guarantee.
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('E1a: migrate, a partitioned direct edit genuinely conflicts on one property while the other folds cleanly, both converge, and a second late write is detected in isolation from the advanced heads', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { fullName: 'Ada Lovelace', status: 'in-progress' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonById(db2, obj1.id);

    // Migrate: record heads BEFORE and AFTER the migration's own writes, keep the source properties
    // (deletes are unsafe under partition, per prior research), and stamp a migration marker.
    const preHeads = headsOf(obj1);
    Obj.update(obj1, (obj1) => {
      foldValue(obj1, 'fullName', 'name');
      foldInto(obj1, 'done', obj1.status === 'done');
      Annotation.set(obj1, MigrationVersionAnnotation, 1);
    });
    await db1.flush();
    const postHeads = headsOf(obj1);
    expect(Option.getOrThrow(Annotation.get(obj1, MigrationVersionAnnotation))).to.eq(1);

    await partition();

    // Peer 2, schema-unaware, keeps writing the old shape.
    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'late';
      obj2.status = 'done';
    });
    await db2.flush();

    // Peer 1, a user editing THROUGH the new schema: a direct edit concurrent with peer 2's late write.
    Obj.update(obj1, (obj1) => {
      obj1.name = 'direct';
    });
    await db1.flush();

    await heal();
    await syncAll(db1, db2);

    // `fullName` and `name` are DIFFERENT Automerge keys, so both writes merge silently — no CRDT
    // conflict ever fires; detecting the semantic clash is entirely the fold's job.
    await expect.poll(() => obj1.fullName).toBe('late');
    await expect.poll(() => obj1.name).toBe('direct');
    expect(obj1.status).to.eq('done');

    const lateSourceProps = changedProps(diffSince(obj1, preHeads), new Set(['fullName', 'status']));
    const directlyEditedTargets = changedProps(diffSince(obj1, postHeads), new Set(['name', 'done']));
    expect([...lateSourceProps].sort()).to.deep.eq(['fullName', 'status']);
    expect([...directlyEditedTargets]).to.deep.eq(['name']);

    // Fold #1: `status` -> `done` is unconflicted (never directly edited) and folds through cleanly;
    // `fullName` -> `name` is a genuine conflict (both diverged since the migration) — do not
    // overwrite `name`, record the conflict instead.
    Obj.update(obj1, (obj1) => {
      if (lateSourceProps.has('status') && !directlyEditedTargets.has('done')) {
        foldInto(obj1, 'done', obj1.status === 'done');
      }
      if (lateSourceProps.has('fullName')) {
        if (directlyEditedTargets.has('name')) {
          recordConflict(obj1, 'name', obj1.name ?? '', obj1.fullName ?? '');
        } else {
          foldValue(obj1, 'fullName', 'name');
        }
      }
    });
    await db1.flush();
    const postFoldHeads1 = headsOf(obj1);

    expect(obj1.name).to.eq('direct'); // winner not clobbered.
    expect(obj1.fullName).to.eq('late'); // loser not erased.
    expect(obj1.done).to.eq(true);
    expect(obj1.conflicts?.name).to.deep.eq({ mine: 'direct', theirs: 'late' });

    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => obj2.conflicts?.name).toBeDefined();
    expect(obj2.conflicts?.name).to.deep.eq({ mine: 'direct', theirs: 'late' });
    expect(obj2.done).to.eq(true);

    // Re-fold immediately with no new late writes: every write is guarded, so nothing changes.
    Obj.update(obj1, (obj1) => {
      if (lateSourceProps.has('status') && !directlyEditedTargets.has('done')) {
        foldInto(obj1, 'done', obj1.status === 'done');
      }
      if (lateSourceProps.has('fullName') && directlyEditedTargets.has('name')) {
        recordConflict(obj1, 'name', obj1.name ?? '', obj1.fullName ?? '');
      }
    });
    await db1.flush();
    expect(diffSince(obj1, postFoldHeads1)).to.deep.eq([]);

    // Second partition + second late write: diffing from the ADVANCED heads must name only the NEW
    // edit — the first late write, already folded/recorded, must never reappear.
    await partition();
    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'later edit';
    });
    await db2.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.fullName).toBe('later edit');

    const secondLatePatches = diffSince(obj1, postFoldHeads1);
    const secondLateProps = changedProps(secondLatePatches, new Set(['fullName', 'status']));
    expect([...secondLateProps]).to.deep.eq(['fullName']);
    const secondSplice = secondLatePatches.find((patch): patch is SpliceTextPatch => patch.action === 'splice');
    expect(secondSplice?.value).to.eq('later edit');

    // Fold #2: the conflict's `theirs` side must advance to the new late value.
    Obj.update(obj1, (obj1) => {
      recordConflict(obj1, 'name', obj1.name ?? '', obj1.fullName ?? '');
    });
    await db1.flush();
    const postFoldHeads2 = headsOf(obj1);
    expect(obj1.conflicts?.name).to.deep.eq({ mine: 'direct', theirs: 'later edit' });
    expect(obj1.name).to.eq('direct'); // still not clobbered.

    // Converged state, third time: re-running the SAME fold with nothing new performs zero writes.
    Obj.update(obj1, (obj1) => {
      recordConflict(obj1, 'name', obj1.name ?? '', obj1.fullName ?? '');
    });
    await db1.flush();
    expect(diffSince(obj1, postFoldHeads2)).to.deep.eq([]);
  });

  test('E1b: a chained migration (fullName -> name -> label) folds a late fullName write to label in ONE composed update, keeps name and label equal at every observable point, and is idempotent on a second round', async ({
    expect,
  }) => {
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

    // Peer 1 runs both chain migrations while partitioned; peer 2 stays a pure fullName-only client.
    await partition();

    const m1PreHeads = headsOf(obj1);
    Obj.update(obj1, (obj1) => {
      foldValue(obj1, 'fullName', 'name');
    });
    await db1.flush();

    Obj.update(obj1, (obj1) => {
      foldValue(obj1, 'name', 'label');
    });
    await db1.flush();

    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'late edit';
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.fullName).toBe('late edit');
    await expect.poll(() => obj1.label).toBe('original'); // merged, pre-fold.

    const lateV1Props = changedProps(diffSince(obj1, m1PreHeads), new Set(['fullName']));
    expect([...lateV1Props]).to.deep.eq(['fullName']);

    // Composed fold in ONE `Obj.update`: `name` and `label` are derived from the CURRENT `fullName`
    // in the same transaction, so the object never sits half-folded between the two chain steps.
    Obj.update(obj1, (obj1) => {
      foldValue(obj1, 'fullName', 'name');
      foldValue(obj1, 'name', 'label');
    });
    await db1.flush();

    expect(obj1.name).to.eq('late edit');
    expect(obj1.label).to.eq('late edit');
    expect(obj1.name).to.eq(obj1.label);

    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => obj2.label).toBe('late edit');
    expect(obj2.name).to.eq(obj2.label);

    // Second round, idempotent: no new late write, so the composed fold performs zero writes.
    const postFoldHeads = headsOf(obj1);
    Obj.update(obj1, (obj1) => {
      foldValue(obj1, 'fullName', 'name');
      foldValue(obj1, 'name', 'label');
    });
    await db1.flush();
    expect(diffSince(obj1, postFoldHeads)).to.deep.eq([]);
    expect(obj1.name).to.eq(obj1.label);
  });

  test('E1c: both peers folding the same late write independently converge, and a third fold performs zero writes', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { fullName: 'original', status: 'in-progress' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonById(db2, obj1.id);

    await partition();
    Obj.update(obj1, (obj1) => {
      foldValue(obj1, 'fullName', 'name');
      foldInto(obj1, 'done', obj1.status === 'done');
    });
    await db1.flush();

    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'late edit';
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.fullName).toBe('late edit');
    await expect.poll(() => obj1.name).toBe('original');
    await expect.poll(() => obj2.fullName).toBe('late edit');
    await expect.poll(() => obj2.name).toBe('original');

    // Both peers independently run the IDENTICAL fold, deterministically derived from the same
    // merged input, so both write the exact same value.
    await partition();
    Obj.update(obj1, (obj1) => {
      foldValue(obj1, 'fullName', 'name');
    });
    await db1.flush();
    Obj.update(obj2, (obj2) => {
      foldValue(obj2, 'fullName', 'name');
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.name).toBe('late edit');
    await expect.poll(() => obj2.name).toBe('late edit');

    // An extra sync round-trip must not oscillate.
    await db1.flush();
    await db2.flush();
    await syncAll(db1, db2);
    expect(obj1.name).to.eq('late edit');
    expect(obj2.name).to.eq('late edit');

    // A third fold, guarded, performs zero writes — the fix for claim 3's naive-write ping-pong.
    const preThirdFoldHeads = headsOf(obj1);
    Obj.update(obj1, (obj1) => {
      foldValue(obj1, 'fullName', 'name');
    });
    await db1.flush();
    expect(diffSince(obj1, preThirdFoldHeads)).to.deep.eq([]);
  });

  test('E1d: A.diff against heads from an unrelated doc returns a large "everything is new" diff rather than throwing', async ({
    expect,
  }) => {
    await using peer = await builder.createPeer({ types: [PersonDoc] });
    await using db = await peer.createDatabase();

    const objX = db.add(Obj.make(PersonDoc, { fullName: 'doc X' }));
    await db.flush();
    const headsFromX = headsOf(objX);

    const objY = db.add(Obj.make(PersonDoc, { fullName: 'doc Y' }));
    await db.flush();

    // A fold must ancestry-check its stored heads: an epoch re-root changes doc identity, and
    // diffing against foreign heads returns everything as new rather than raising an error.
    const patches = diffSince(objY, headsFromX);
    expect(patches.length).to.be.greaterThan(0);

    // Sanity: the object itself is unaffected by the foreign diff.
    expect(objY.fullName).to.eq('doc Y');
  });
});
