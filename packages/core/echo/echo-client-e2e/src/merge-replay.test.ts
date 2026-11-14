//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type PartitionedPair, type TestDatabase, createPartitionedPair, headsOf } from './testing/partitioned-pair.ts';

//
// The creation-heads replay in `ConvergenceKeyMerger#mergeCandidates` (`echo-host/src/db-host/convergence-key-merge.ts`),
// against the real engine: an edit made only on a losing duplicate survives the merge. See
// `.agents/projects/lenses/M0-REPORT.md` "the final design" item 4.
//

class FanOutDoc extends Type.makeObject<FanOutDoc>(DXN.make('org.dxos.test.merge-replay.FanOutDoc', '0.1.0'))(
  Schema.Struct({
    note: Schema.optional(Schema.String),
    tag: Schema.optional(Schema.String),
  }),
) {}

const BASELINE_NOTE = 'baseline note';
const BASELINE_TAG = 'baseline tag';

/** The field is assigned through meta inside an update — there is deliberately no dedicated setter. */
const setConvergenceKey = (object: Obj.Unknown, convergenceKey: string) =>
  Obj.update(object, (object) => {
    Obj.getMeta(object).convergenceKey = convergenceKey;
  });

/** Cross-peer visibility isn't guaranteed the instant replication resolves, so poll rather than read once. */
const queryById = async (db: TestDatabase, id: string): Promise<FanOutDoc> => {
  let found: FanOutDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

/** A tombstoned (merged-away) object is excluded from a default query but readable with `deleted: 'include'`. */
const queryIncludingDeleted = async (db: TestDatabase, id: string): Promise<FanOutDoc> => {
  const [found] = await db.query(Query.select(Filter.id(id)).options({ deleted: 'include' })).run();
  invariant(found, 'expected the object to remain queryable with deleted: include');
  return found;
};

/** Polls until the real worker-driven merge has collapsed the pair on this peer. */
const waitForConverged = async (db: TestDatabase): Promise<void> => {
  await expect.poll(async () => (await db.query(Filter.type(FanOutDoc)).run()).length, { timeout: 10_000 }).toBe(1);
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Navigates `objects.<id>.data`, the sub-object `A.getConflicts` needs. */
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

const conflictsOn = (obj: FanOutDoc, prop: string) =>
  A.getConflicts(getRawObjectData(getObjectCore(obj).getDoc(), obj.id), prop);

type FanOutScenario = {
  db1: TestDatabase;
  db2: TestDatabase;
  /** The pair's roles, decided by id AFTER creation — ids are random, so the role is never chosen. */
  winnerId: string;
  loserId: string;
};

/**
 * Two partitioned peers each mint a fan-out duplicate carrying the SAME convergence key and the
 * SAME baseline field values (as a migration writing every field on both copies would), then the
 * caller-supplied `edit` runs on each while still partitioned. Heals, syncs, and waits for the
 * REAL worker-driven merge to collapse the pair — no replay call anywhere.
 */
const setUpFanOutPair = async (
  pair: PartitionedPair,
  spaceKey: PublicKey,
  convergenceKey: string,
  edit: (args: { winner: FanOutDoc; loser: FanOutDoc }) => void,
): Promise<FanOutScenario> => {
  const { peer1, peer2, partition, heal, syncAll } = pair;

  const db1 = await peer1.createDatabase(spaceKey);
  await db1.flush();
  const rootUrl = db1.rootUrl;
  invariant(rootUrl, 'root url');
  const db2 = await peer2.openDatabase(spaceKey, rootUrl);
  await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
  await db2.updateIndexes();

  await partition();

  const dup1 = db1.add(Obj.make(FanOutDoc, { note: BASELINE_NOTE, tag: BASELINE_TAG }));
  setConvergenceKey(dup1, convergenceKey);
  await db1.flush();

  const dup2 = db2.add(Obj.make(FanOutDoc, { note: BASELINE_NOTE, tag: BASELINE_TAG }));
  setConvergenceKey(dup2, convergenceKey);
  await db2.flush();

  // Ids are random ULIDs — the winner (minimum id, per `mergeCandidates`) is decided AFTER creation.
  const winnerIsDup1 = dup1.id < dup2.id;
  const winner = winnerIsDup1 ? dup1 : dup2;
  const loser = winnerIsDup1 ? dup2 : dup1;

  edit({ winner, loser });
  await db1.flush();
  await db2.flush();

  await heal();
  await syncAll(db1, db2);
  await waitForConverged(db1);
  await waitForConverged(db2);

  return { db1, db2, winnerId: winner.id, loserId: loser.id };
};

describe('creation-heads replay against the real engine', () => {
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

  test('a loser-only edit the winner never touched survives the automatic merge (E5a)', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [FanOutDoc]);
    network = pair.network;

    const { db1, db2, winnerId, loserId } = await setUpFanOutPair(
      pair,
      spaceKey,
      'org.dxos.test.merge-replay:E5a',
      ({ loser }) => {
        Obj.update(loser, (loser) => {
          loser.note = 'loser edit';
        });
      },
    );

    // Real engine, no test-side replay: the fix is in `ConvergenceKeyMerger#mergeCandidates` itself.
    const winnerOnDb1 = await queryById(db1, winnerId);
    expect(winnerOnDb1.note).to.eq('loser edit');
    expect(winnerOnDb1.tag).to.eq(BASELINE_TAG); // untouched field: unaffected.

    // Both peers converge on the same folded value — neither computed it locally in this test.
    const winnerOnDb2 = await queryById(db2, winnerId);
    await expect.poll(() => winnerOnDb2.note).toBe('loser edit');

    // The loser's own edit stays readable on its tombstoned copy — losers are never erased.
    const loserOnDb1 = await queryIncludingDeleted(db1, loserId);
    expect(loserOnDb1.note).to.eq('loser edit');
  });

  test('the replay is stable across further indexing passes with no new edits (E5c essence)', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [FanOutDoc]);
    network = pair.network;

    const { db1, db2, winnerId, loserId } = await setUpFanOutPair(
      pair,
      spaceKey,
      'org.dxos.test.merge-replay:E5c',
      ({ loser }) => {
        Obj.update(loser, (loser) => {
          loser.note = 'loser edit';
        });
      },
    );

    const winnerOnDb1 = await queryById(db1, winnerId);
    expect(winnerOnDb1.note).to.eq('loser edit');
    const headsAfterFirstMerge = headsOf(winnerOnDb1);

    // Further indexing passes on both peers with NO new edits: the group is already serviced, so
    // this exercises the same "nothing left to do" path the crash-retry unit test
    // (`convergence-key-merge.test.ts`) drives directly — the creation-heads replay must not
    // contribute a second write.
    await db1.updateIndexes();
    await db2.updateIndexes();
    await pair.syncAll(db1, db2);

    const winnerAfterResync = await queryById(db1, winnerId);
    expect(winnerAfterResync.note).to.eq('loser edit');
    expect(headsOf(winnerAfterResync)).to.deep.eq(headsAfterFirstMerge);

    const doc = getObjectCore(winnerAfterResync).getDoc();
    const replays = A.getChangesMetaSince(doc, []).filter((meta) => meta.message === `merge-replay: ${loserId}`);
    expect(replays.length).to.eq(1);
  });

  test('a field both sides edited becomes a real Automerge conflict, converged identically on both peers (E5d)', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [FanOutDoc]);
    network = pair.network;
    const { syncAll } = pair;

    const { db1, db2, winnerId, loserId } = await setUpFanOutPair(
      pair,
      spaceKey,
      'org.dxos.test.merge-replay:E5d',
      ({ winner, loser }) => {
        Obj.update(winner, (winner) => {
          winner.note = 'winner value';
        });
        Obj.update(loser, (loser) => {
          loser.note = 'loser value';
        });
      },
    );

    const winnerOnDb1 = await queryById(db1, winnerId);
    await expect.poll(() => conflictsOn(winnerOnDb1, 'note')).toBeDefined();
    const conflicts1 = conflictsOn(winnerOnDb1, 'note');
    invariant(conflicts1, 'expected a live conflict on `note` after the merge');
    expect(Object.values(conflicts1).sort()).to.deep.eq(['loser value', 'winner value']);

    // Both peers converge on the SAME presented value and the SAME conflict set — nothing here was
    // computed locally by this test.
    const winnerOnDb2 = await queryById(db2, winnerId);
    await syncAll(db1, db2);
    await expect.poll(() => winnerOnDb1.note !== undefined && winnerOnDb1.note === winnerOnDb2.note).toBe(true);
    await expect
      .poll(() => {
        const a = conflictsOn(winnerOnDb1, 'note');
        const b = conflictsOn(winnerOnDb2, 'note');
        return (
          a !== undefined && b !== undefined && Object.values(a).sort().join('|') === Object.values(b).sort().join('|')
        );
      })
      .toBe(true);

    const loserOnDb1 = await queryIncludingDeleted(db1, loserId);
    expect(loserOnDb1.note).to.eq('loser value'); // the loser's own copy stays readable, unmodified.
  });
});
