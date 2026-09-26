//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc as AutomergeDoc, type ChangeOptions, type Heads } from '@automerge/automerge';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { getEditHistoryWithDiffs } from '@dxos/echo-client';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { setDeep } from '@dxos/util';

import { SENTINEL_ACTOR, foldAt } from './fold-at.ts';
import { PersonDoc, type TestDatabase, createPartitionedPair, headsOf } from './harness.ts';

//
// M0 migration research follow-up (open item: "a first-class fold-at-heads primitive"). See
// `/tmp/claude-0/-home-user-dxos/5ba0d596-75ce-5e5a-a26a-ca5267abef04/scratchpad/findings-item5.md`
// for the write-up this file's tests support. Part A is a bare-automerge probe of the sentinel-actor
// soundness question with zero ECHO involvement; Part B rebuilds `conflicts.test.ts`'s essential
// scenarios against the `foldAt` helper.
//

type Named = { name?: string };

/** A tiny standalone doc + one committed base change, so every fork below shares a real frontier. */
const baseDoc = (): AutomergeDoc<Named> =>
  A.change(A.from<Named>({ name: 'original' }), { time: 0 }, (doc) => {
    doc.name = 'base';
  });

/** Forks `doc` at `heads` under the sentinel actor and writes `value` -- the bare-metal shape of `foldAt`'s user-wins path, without any ECHO document structure. */
const forkAt = (
  doc: AutomergeDoc<Named>,
  heads: Heads,
  value: string,
  options: ChangeOptions<unknown>,
): AutomergeDoc<Named> => {
  const view = A.view(doc, heads);
  const clone = A.clone(view, { actor: SENTINEL_ACTOR });
  const { newDoc } = A.changeAt(clone, heads, options, (draft: Named) => {
    draft.name = value;
  });
  return newDoc;
};

describe('automerge-only: sentinel-actor reuse under independent concurrent forks', () => {
  test('byte-identical forks (same value, message, time) are the SAME change: merge is a true no-op, no conflict', () => {
    const doc = baseDoc();
    const heads = A.getHeads(doc);

    const forkA = forkAt(doc, heads, 'late', { message: 'fold', time: 0 });
    const forkB = forkAt(doc, heads, 'late', { message: 'fold', time: 0 });

    // Same heads means the SAME change hash -- not merely equal decoded values.
    expect(A.getHeads(forkA)).to.deep.eq(A.getHeads(forkB));

    const merged = A.merge(A.merge(A.clone(doc), forkA), forkB);
    expect(merged.name).to.eq('late');
    expect(A.getConflicts(merged, 'name')).toBeUndefined();
    expect(A.getHeads(merged)).to.deep.eq(A.getHeads(forkA));
  });

  test('differing message/time under the SAME sentinel actor at the SAME heads: two distinct changes at (actor, seq=1)', () => {
    const doc = baseDoc();
    const heads = A.getHeads(doc);

    const forkA = forkAt(doc, heads, 'late', { message: 'fold-peer1', time: 0 });
    const forkB = forkAt(doc, heads, 'late', { message: 'fold-peer2', time: 1 });

    expect(A.getHeads(forkA)).not.to.deep.eq(A.getHeads(forkB));
    const historyA = A.getHistory(forkA);
    const historyB = A.getHistory(forkB);
    const lastA = historyA[historyA.length - 1];
    const lastB = historyB[historyB.length - 1];
    invariant(lastA.change.actor && lastB.change.actor, 'expected an authored change on each fork');
    // Both changes genuinely claim the identical (actor, seq): the equivocation this scenario probes.
    expect(lastA.change.actor).to.eq(SENTINEL_ACTOR);
    expect(lastA.change.actor).to.eq(lastB.change.actor);
    expect(lastA.change.seq).to.eq(lastB.change.seq);

    let mergeError: unknown;
    try {
      A.merge(A.merge(A.clone(doc), forkA), forkB);
    } catch (err) {
      mergeError = err;
    }
    // eslint-disable-next-line no-console
    console.log('sentinel-reuse (differing message/time, same value) -> mergeError:', mergeError);

    // Automerge REJECTS this outright: applying the second change raises "duplicate seq N found for
    // actor <id>" and the merge throws. This is a rejected change, not silent corruption or
    // divergence -- but see the ECHO-level test below for what this means for a live sync connection.
    invariant(mergeError instanceof RangeError, 'expected a RangeError from the duplicate-seq check');
    expect(mergeError.message).to.include('duplicate seq');
    expect(mergeError.message).to.include(SENTINEL_ACTOR);
  });

  test('differing values under the SAME sentinel actor at the SAME heads: same rejection, independent of WHAT differs', () => {
    const doc = baseDoc();
    const heads = A.getHeads(doc);

    const forkA = forkAt(doc, heads, 'value-from-peer1', { message: 'fold', time: 0 });
    const forkB = forkAt(doc, heads, 'value-from-peer2', { message: 'fold', time: 0 });

    expect(A.getHeads(forkA)).not.to.deep.eq(A.getHeads(forkB));

    let mergeError: unknown;
    try {
      A.merge(A.merge(A.clone(doc), forkA), forkB);
    } catch (err) {
      mergeError = err;
    }
    // eslint-disable-next-line no-console
    console.log('sentinel-reuse (differing values) -> mergeError:', mergeError);

    // The duplicate-seq check fires on the (actor, seq) collision alone -- it does not inspect op
    // content, so a differing VALUE is rejected exactly like differing message/time above.
    invariant(mergeError instanceof RangeError, 'expected a RangeError from the duplicate-seq check');
    expect(mergeError.message).to.include('duplicate seq');
  });
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const getRawObjectData = (doc: unknown, objectId: string): Record<string, unknown> => {
  invariant(isRecord(doc), 'expected an automerge doc');
  const objects = doc.objects;
  invariant(isRecord(objects), 'expected doc.objects');
  const entity = objects[objectId];
  invariant(isRecord(entity), 'expected an entity structure');
  const data = entity.data;
  invariant(isRecord(data), 'expected entity.data');
  return data;
};

const conflictsOn = (obj: PersonDoc, prop: string) =>
  A.getConflicts(getRawObjectData(getObjectCore(obj).getDoc(), obj.id), prop);

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

describe('foldAt: primitive rebuild of the essential conflicts.test.ts scenarios', () => {
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

  test('fold-wins: a plain live-handle fold dominates a concurrent direct edit by counter, no conflict left behind', async () => {
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
      obj1.name = 'original';
    });
    await db1.flush();
    await syncAll(db1, db2);
    await expect.poll(() => obj2.name).toBe('original');
    const migrationHeads = headsOf(obj1);

    await partition();
    Obj.update(obj2, (obj2) => {
      obj2.name = 'direct';
    });
    await db2.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.name).toBe('direct');

    foldAt(
      obj1,
      migrationHeads,
      (draft) => {
        draft.name = 'fold-wins-value';
      },
      { policy: 'fold-wins', message: 'fold:fold-wins', time: 0 },
    );
    await db1.flush();

    // Rekeying at the OLD heads makes this concurrent with the direct edit too -- fold-wins differs
    // from user-wins only in WHICH side of that same real conflict is presented, not in whether one
    // exists at all: `changeAt` at a past frontier is what creates the conflict, unconditionally.
    await expect.poll(() => obj1.name).toBe('fold-wins-value');
    const conflicts = conflictsOn(obj1, 'name');
    invariant(conflicts, 'expected fold-wins to also leave a live, browsable conflict');
    expect(Object.values(conflicts).sort()).to.deep.eq(['direct', 'fold-wins-value']);

    await syncAll(db1, db2);
    await expect.poll(() => obj2.name).toBe('fold-wins-value');
  });

  test('user-wins: the fold loses to a concurrent direct edit and is browsable via A.getConflicts, attributed by message', async () => {
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
      obj1.name = 'original';
    });
    await db1.flush();
    await syncAll(db1, db2);
    await expect.poll(() => obj2.name).toBe('original');
    const migrationHeads = headsOf(obj1);

    await partition();
    Obj.update(obj2, (obj2) => {
      obj2.name = 'direct';
    });
    await db2.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.name).toBe('direct');

    const foldMessage = 'fold:org.example.user-wins@1';
    foldAt(
      obj1,
      migrationHeads,
      (draft) => {
        draft.name = 'late';
      },
      { policy: 'user-wins', message: foldMessage, time: 0 },
    );
    await db1.flush();

    // The user's direct edit stays presented; the fold is a live, browsable conflict, not a silent loss.
    await expect.poll(() => obj1.name).toBe('direct');
    const conflicts = conflictsOn(obj1, 'name');
    invariant(conflicts, 'expected a live conflict after the user-wins fold');
    expect(Object.values(conflicts).sort()).to.deep.eq(['direct', 'late']);

    const foldVersion = getEditHistoryWithDiffs(obj1).find((version) => version.message === foldMessage);
    invariant(foldVersion, "expected the fold's message to surface in edit history");
    expect(foldVersion.time).to.eq(0);

    await syncAll(db1, db2);
    await expect.poll(() => obj2.name).toBe('direct');
    await expect.poll(() => Object.keys(conflictsOn(obj2, 'name') ?? {}).length).toBe(Object.keys(conflicts).length);
    expect(conflictsOn(obj2, 'name')).to.deep.eq(conflicts);
  });

  test('idempotent re-run: re-running a user-wins fold with identical deterministic inputs at the same heads is a no-op', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1 } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { fullName: 'original' }));
    await db1.flush();

    Obj.update(obj1, (obj1) => {
      obj1.name = 'original';
    });
    await db1.flush();
    const migrationHeads = headsOf(obj1);

    const run = () =>
      foldAt(
        obj1,
        migrationHeads,
        (draft) => {
          draft.name = 'late';
        },
        { policy: 'user-wins', message: 'fold:idempotent', time: 0 },
      );

    const firstHeads = run();
    await db1.flush();
    await expect.poll(() => obj1.name).toBe('late');
    const headsAfterFirst = headsOf(obj1);

    // A crash-recovery re-run recomputes the SAME fold (same heads, same deterministic message/time,
    // same value) -- it must add nothing, not mint a second colliding change under the sentinel actor.
    const secondHeads = run();
    await db1.flush();

    expect(secondHeads).to.deep.eq(firstHeads);
    expect(headsOf(obj1)).to.deep.eq(headsAfterFirst);
    expect(obj1.name).to.eq('late');
    expect(conflictsOn(obj1, 'name')).toBeUndefined();
  });

  test('user-wins, two partitioned peers folding the SAME value at the SAME heads with deterministic inputs converge with zero errors', async () => {
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
      obj1.name = 'original';
    });
    await db1.flush();
    await syncAll(db1, db2);
    await expect.poll(() => obj2.name).toBe('original');
    const heads1 = headsOf(obj1);
    const heads2 = headsOf(obj2);
    expect(heads2).to.deep.eq(heads1);

    await partition();
    // Both peers independently recompute the IDENTICAL fold: same heads, same message, same fixed
    // time, same value -- a pure function of the (shared) source data, as a real fold-forward run is.
    foldAt(
      obj1,
      heads1,
      (draft) => {
        draft.name = 'late';
      },
      { policy: 'user-wins', message: 'fold:deterministic', time: 0 },
    );
    await db1.flush();
    foldAt(
      obj2,
      heads2,
      (draft) => {
        draft.name = 'late';
      },
      { policy: 'user-wins', message: 'fold:deterministic', time: 0 },
    );
    await db2.flush();

    let syncError: unknown;
    try {
      await heal();
      await syncAll(db1, db2);
    } catch (err) {
      syncError = err;
    }
    expect(syncError).toBeUndefined();

    await expect.poll(() => obj1.name).toBe('late');
    await expect.poll(() => obj2.name).toBe('late');
    // No conflict: byte-identical inputs make this the SAME change on both peers, not two colliding ones.
    expect(conflictsOn(obj1, 'name')).toBeUndefined();
    expect(conflictsOn(obj2, 'name')).toBeUndefined();
    expect(headsOf(obj1)).to.deep.eq(headsOf(obj2));
  });

  test('differing metadata under the sentinel actor on a REAL ECHO doc: same duplicate-seq rejection as the bare-automerge probe', async () => {
    // Deliberately single-peer and fully DETACHED: two independent forks are computed with
    // `A.view`/`A.clone`/`A.changeAt` (never `core.docHandle.update`, which `foldAt`'s user-wins path
    // uses to merge into the LIVE, host-connected document). An earlier version of this test called
    // `foldAt` twice with differing metadata against two real (networked) peers and merged their live
    // docs directly -- the duplicate-seq RangeError fired as expected, but because one of the two
    // colliding sentinel-actor changes had already been pushed into a live docHandle and asynchronously
    // flushed towards its host (`RepoProxy._sendUpdates` -> `AutomergeHost.createDoc` ->
    // `Repo.import`), the SAME RangeError then resurfaced later as an unhandled rejection during an
    // UNRELATED subsequent test, and that test's peer network was left in a corrupted state
    // (`EchoNetworkAdapter`'s connection-tracking invariant failed on the NEXT test's `heal()`). That
    // is independent, stronger evidence for the verdict: this is not a contained "rejected change" once
    // it reaches live doc/host plumbing, it is a hazard to the whole process. See findings.md.
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1 } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { fullName: 'original' }));
    await db1.flush();

    Obj.update(obj1, (obj1) => {
      obj1.name = 'original';
    });
    await db1.flush();
    const heads = headsOf(obj1);

    const core = getObjectCore(obj1);
    const view = A.view(core.getDoc(), heads);
    const forkTo = (message: string, time: number): AutomergeDoc<unknown> => {
      const clone = A.clone(view, { actor: SENTINEL_ACTOR });
      const { newDoc } = A.changeAt(clone, heads, { message, time }, (doc: AutomergeDoc<unknown>) => {
        setDeep(doc, [...core.mountPath, 'data', 'name'], 'late');
      });
      return newDoc;
    };

    const forkA = forkTo('fold:peer1-authored', 100);
    const forkB = forkTo('fold:peer2-authored', 200);
    expect(A.getHeads(forkA)).not.to.deep.eq(A.getHeads(forkB));

    let mergeError: unknown;
    try {
      A.merge(A.clone(forkA), forkB);
    } catch (err) {
      mergeError = err;
    }
    // eslint-disable-next-line no-console
    console.log('differing-metadata sentinel fold on a real ECHO doc -> mergeError:', mergeError);

    invariant(mergeError instanceof RangeError, 'expected the same duplicate-seq RangeError on a real ECHO doc');
    expect(mergeError.message).to.include('duplicate seq');
    expect(mergeError.message).to.include(SENTINEL_ACTOR);
  });
});
