//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc as AutomergeDoc, type Heads } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { setDeep } from '@dxos/util';

import { type PartitionedPair, type TestDatabase, createPartitionedPair, headsOf, writesSince } from './harness.ts';

//
// M0 follow-up (item 3): #12412's landed convergence-key merge (`ConvergenceKeyMerger` /
// `mergeCandidates`) is a per-field "smallest-id candidate that defines the field wins" rule with
// no baseline -- for migration-minted fan-out duplicates the migration wrote EVERY field on both
// copies, so a loser-only edit made before the merge is silently dropped even when the winner
// never touched that field (M0-REPORT.md, "the final design" item 4). This suite (a) reproduces
// the loss against the REAL landed engine (not a hand-rolled merge function, unlike
// `fan-out.test.ts`), and (b) prototypes the proposed fix -- replaying the loser's since-creation
// edits onto the winner via `changeAt` at the winner's OWN recorded creation heads, so an
// unconflicted edit lands and a genuinely double-edited field becomes a real automerge register
// conflict (DESIGN.md item 6's history-native-conflicts idiom, reused from `conflicts.test.ts`'s
// `changeAt` dance).
//

class FanOutEngineDoc extends Type.makeObject<FanOutEngineDoc>(
  DXN.make('org.dxos.test.migration.bench.FanOutEngineDoc', '0.1.0'),
)(
  Schema.Struct({
    note: Schema.optional(Schema.String),
    tag: Schema.optional(Schema.String),
  }),
) {}

const DATA_FIELDS = ['note', 'tag'] as const;
type DataField = (typeof DATA_FIELDS)[number];

const BASELINE_NOTE = 'baseline note';
const BASELINE_TAG = 'baseline tag';

/** The field is assigned through meta inside an update -- there is deliberately no dedicated setter (mirrors `merge.test.ts`). */
const setConvergenceKey = (object: Obj.Unknown, convergenceKey: string) =>
  Obj.update(object, (object) => {
    Obj.getMeta(object).convergenceKey = convergenceKey;
  });

/** Cross-peer visibility isn't guaranteed the instant replication resolves, so poll rather than read once. */
const queryById = async (db: TestDatabase, id: string): Promise<FanOutEngineDoc> => {
  let found: FanOutEngineDoc | undefined;
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
const queryIncludingDeleted = async (db: TestDatabase, id: string): Promise<FanOutEngineDoc> => {
  const [found] = await db.query(Query.select(Filter.id(id)).options({ deleted: 'include' })).run();
  invariant(found, 'expected the object to remain queryable with deleted: include');
  return found;
};

/** Polls until the REAL worker-driven merge has collapsed the pair on this peer -- no merge call anywhere. */
const waitForConverged = async (db: TestDatabase): Promise<void> => {
  await expect
    .poll(async () => (await db.query(Filter.type(FanOutEngineDoc)).run()).length, { timeout: 10_000 })
    .toBe(1);
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Navigates `objects.<id>.data`, the sub-object `A.getConflicts` needs (established by `conflicts.test.ts`). */
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

/** `A.getConflicts` reads the object's OWN `data` sub-object, never the root doc or the object itself. */
const conflictsOn = (obj: FanOutEngineDoc, prop: string) =>
  A.getConflicts(getRawObjectData(getObjectCore(obj).getDoc(), obj.id), prop);

const headsKey = (heads: Heads): string => [...heads].sort().join(',');
const headsEqual = (a: Heads, b: Heads): boolean => headsKey(a) === headsKey(b);

/**
 * The prototype fix: diff the loser's OWN doc from its recorded creation heads to its current
 * heads (its since-creation edits), and replay every changed data field onto the winner via
 * `changeAt` at the WINNER's own recorded creation heads -- landing concurrent with whatever the
 * winner itself wrote since ITS OWN creation, so an untouched winner field picks up the loser's
 * edit cleanly and a field both sides edited becomes a real automerge register conflict instead of
 * a silent drop.
 *
 * `replayed` is a stand-in for the watermark a real engine would persist as `system.mergedAtHeads`
 * (item 4's minimal-change proposal below) -- diffing from it, not from the creation heads on
 * every call, is what makes a second call with no new loser edits a genuine no-op.
 */
const replayLoserEditsAtWinnerCreation = (
  winner: FanOutEngineDoc,
  loser: FanOutEngineDoc,
  winnerCreationHeads: Heads,
  loserCreationHeads: Heads,
  replayed: Map<string, Heads>,
): boolean => {
  const loserDoc = getObjectCore(loser).getDoc();
  const loserCurrentHeads = A.getHeads(loserDoc);
  const since = replayed.get(loser.id) ?? loserCreationHeads;
  if (headsEqual(since, loserCurrentHeads)) {
    return false; // Nothing new since the last replay -- the idempotence guard.
  }

  const loserPrefix = getObjectCore(loser).getDocAccessor([]).path;
  const changedFields = new Set<DataField>();
  for (const patch of A.diff(loserDoc, since, loserCurrentHeads)) {
    if (patch.path.length <= loserPrefix.length || !loserPrefix.every((key, index) => patch.path[index] === key)) {
      continue;
    }
    const field = String(patch.path[loserPrefix.length]);
    if ((DATA_FIELDS as readonly string[]).includes(field)) {
      changedFields.add(field as DataField);
    }
  }
  replayed.set(loser.id, loserCurrentHeads);
  if (changedFields.size === 0) {
    return false;
  }

  const winnerAccessor = getObjectCore(winner).getDocAccessor([]);
  let wrote = false;
  winnerAccessor.handle.changeAt(winnerCreationHeads, (doc: AutomergeDoc<unknown>) => {
    for (const field of changedFields) {
      setDeep(doc, [...winnerAccessor.path, field], loser[field]);
      wrote = true;
    }
  });
  return wrote;
};

type FanOutScenario = {
  db1: TestDatabase;
  db2: TestDatabase;
  /** The pair's roles, decided by id AFTER creation -- ids are random, so the role is never chosen. */
  winnerId: string;
  loserId: string;
  winnerCreationHeads: Heads;
  loserCreationHeads: Heads;
};

/**
 * Two partitioned peers each mint a fan-out duplicate carrying the SAME convergence key and the
 * SAME baseline field values (as a migration writing every field on both copies would), then the
 * caller-supplied `edit` runs on each while still partitioned. Heals, syncs, and waits for the REAL
 * worker-driven merge (`ConvergenceKeyMerger`) to collapse the pair -- no merge call anywhere.
 */
const setUpFanOutPair = async (
  pair: PartitionedPair,
  spaceKey: PublicKey,
  convergenceKey: string,
  edit: (args: { winner: FanOutEngineDoc; loser: FanOutEngineDoc }) => void,
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

  const dup1 = db1.add(Obj.make(FanOutEngineDoc, { note: BASELINE_NOTE, tag: BASELINE_TAG }));
  setConvergenceKey(dup1, convergenceKey);
  await db1.flush();
  const dup1CreationHeads = headsOf(dup1);

  const dup2 = db2.add(Obj.make(FanOutEngineDoc, { note: BASELINE_NOTE, tag: BASELINE_TAG }));
  setConvergenceKey(dup2, convergenceKey);
  await db2.flush();
  const dup2CreationHeads = headsOf(dup2);

  // Ids are random ULIDs -- the winner (minimum id, per `mergeCandidates`) is decided AFTER creation.
  const winnerIsDup1 = dup1.id < dup2.id;
  const winner = winnerIsDup1 ? dup1 : dup2;
  const loser = winnerIsDup1 ? dup2 : dup1;
  const winnerCreationHeads = winnerIsDup1 ? dup1CreationHeads : dup2CreationHeads;
  const loserCreationHeads = winnerIsDup1 ? dup2CreationHeads : dup1CreationHeads;

  edit({ winner, loser });
  await db1.flush();
  await db2.flush();

  await heal();
  await syncAll(db1, db2);
  await waitForConverged(db1);
  await waitForConverged(db2);

  return { db1, db2, winnerId: winner.id, loserId: loser.id, winnerCreationHeads, loserCreationHeads };
};

describe('E5: fan-out (1->N) against the LANDED convergence-key merge engine (#12412)', () => {
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

  test('E5a: FIXED -- the real engine now recovers an unconflicted loser edit the winner never touched', async () => {
    // Landed fix (object-merging project, Phase A item 2): `ConvergenceKeyMerger#mergeCandidates`
    // now runs the creation-heads replay this file's `replayLoserEditsAtWinnerCreation` prototyped
    // below -- that helper is superseded by the real engine and kept here only as this bench's
    // documentation of the mechanism (E5c-e still exercise it directly against cloned doc state).
    // The real-engine equivalent, with no test-side replay call, lives in
    // `echo-client-e2e/src/merge-replay.test.ts`.
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [FanOutEngineDoc]);
    network = pair.network;

    const { db1, winnerId, loserId } = await setUpFanOutPair(
      pair,
      spaceKey,
      'org.dxos.test.migration.bench.fanout-engine:E5a',
      ({ loser }) => {
        Obj.update(loser, (loser) => {
          loser.note = 'loser edit';
        });
      },
    );

    const winnerOnDb1 = await queryById(db1, winnerId);
    const loserOnDb1 = await queryIncludingDeleted(db1, loserId);

    // Finding: confirms the hypothesis -- each fan-out duplicate is created in its OWN linked
    // document (a distinct documentId), not inlined together in the space's shared root document.
    // The prototype below never depended on them sharing a doc, and neither does the real fix: it
    // reads the loser's doc separately and writes to the winner's doc through its OWN handle.
    expect(getObjectCore(winnerOnDb1).docHandle?.documentId).to.not.eq(getObjectCore(loserOnDb1).docHandle?.documentId);

    // The tombstoned loser still carries its edit -- losers are never erased.
    expect(loserOnDb1.note).to.eq('loser edit');
    // Was the defect (the winner's untouched baseline trivially "defining" the field); now the
    // creation-heads replay lands the loser's unconflicted edit onto the winner automatically.
    expect(winnerOnDb1.note).to.eq('loser edit');
  });

  test('E5b: FIXED -- the recovery holds even when the winner edits a DIFFERENT (disjoint) field', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [FanOutEngineDoc]);
    network = pair.network;

    const { db1, winnerId, loserId } = await setUpFanOutPair(
      pair,
      spaceKey,
      'org.dxos.test.migration.bench.fanout-engine:E5b',
      ({ winner, loser }) => {
        Obj.update(winner, (winner) => {
          winner.tag = 'winner tag edit';
        });
        Obj.update(loser, (loser) => {
          loser.note = 'loser note edit';
        });
      },
    );

    const winnerOnDb1 = await queryById(db1, winnerId);
    const loserOnDb1 = await queryIncludingDeleted(db1, loserId);

    // The winner's own edit survives -- it is the smallest-id candidate that defines `tag`.
    expect(winnerOnDb1.tag).to.eq('winner tag edit');
    // And its DISJOINT field is now ALSO recovered: the replay is per-field, so `tag` staying the
    // winner's own edit does not block `note` being folded in from the loser.
    expect(loserOnDb1.note).to.eq('loser note edit');
    expect(winnerOnDb1.note).to.eq('loser note edit');
  });

  test('E5c: FIXED -- the real engine`s own replay lands the unconflicted edit as a clean fast-forward, idempotently', async () => {
    // Superseded: this used to run the prototype `replayLoserEditsAtWinnerCreation` by hand on top
    // of the (then-buggy) real engine's output. The real engine now performs exactly this replay
    // itself inside `ConvergenceKeyMerger#mergeCandidates`, so running the prototype again here
    // would fork a SECOND, independent concurrent write from a different actor at the same
    // `winnerCreationHeads` -- manufacturing a spurious conflict on an already-correct value instead
    // of demonstrating one. The real-engine equivalent of this test (with no test-side replay call
    // anywhere) lives in `echo-client-e2e/src/merge-replay.test.ts`.
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [FanOutEngineDoc]);
    network = pair.network;

    const { db1, winnerId } = await setUpFanOutPair(
      pair,
      spaceKey,
      'org.dxos.test.migration.bench.fanout-engine:E5c',
      ({ loser }) => {
        Obj.update(loser, (loser) => {
          loser.note = 'loser edit';
        });
      },
    );

    const winnerOnDb1 = await queryById(db1, winnerId);
    expect(winnerOnDb1.note).to.eq('loser edit');
    // Unconflicted: the winner never wrote `note` after its own creation, so the engine's replay
    // landed as a clean fast-forward, not a register conflict.
    expect(conflictsOn(winnerOnDb1, 'note')).to.be.undefined;

    // Idempotence: a further indexing pass with no new edits on either side writes nothing new —
    // the engine's own message-tagged idempotence guard (`convergence-key-merge.ts`), not this
    // bench's prototype map.
    const preRerunHeads = headsOf(winnerOnDb1);
    await db1.updateIndexes();
    expect(writesSince(winnerOnDb1, preRerunHeads)).to.deep.eq([]);
  });

  test('E5d: FIXED -- a field BOTH sides edited becomes a real automerge conflict automatically, converged identically on both peers', async () => {
    // Superseded, like E5c: the real engine now runs the replay itself, so this asserts directly on
    // its output instead of driving the prototype helper. See `echo-client-e2e/src/merge-replay.test.ts`
    // for the up-to-date, no-test-side-replay version of this scenario.
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [FanOutEngineDoc]);
    network = pair.network;
    const { syncAll } = pair;

    const { db1, db2, winnerId, loserId } = await setUpFanOutPair(
      pair,
      spaceKey,
      'org.dxos.test.migration.bench.fanout-engine:E5d',
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
    const loserOnDb1 = await queryIncludingDeleted(db1, loserId);
    const conflicts1 = conflictsOn(winnerOnDb1, 'note');
    invariant(conflicts1, 'expected a live conflict on `note` after the engine`s own replay');
    expect(Object.values(conflicts1).sort()).to.deep.eq(['loser value', 'winner value']);
    expect(loserOnDb1.note).to.eq('loser value'); // the loser's own copy stays readable, unmodified.

    // Both peers converge on the SAME presented value and the SAME conflict set — nothing here was
    // computed locally by this test; each peer's own worker ran the replay independently.
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
  });

  test('E5e: divergent baselines (peers fanned out from different source states) are NOT misapplied by the replay -- it is a safe no-op', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [FanOutEngineDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    const db1 = await peer1.createDatabase(spaceKey);
    await db1.flush();
    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    const db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();

    await partition();

    const convergenceKey = 'org.dxos.test.migration.bench.fanout-engine:E5e';
    // Peer 1 fanned out BEFORE a late source edit arrived; peer 2 fanned out AFTER it -- the two
    // copies' baseline values differ from the START, with no edit made after either's creation.
    const dup1 = db1.add(Obj.make(FanOutEngineDoc, { note: 'source-state-v1', tag: BASELINE_TAG }));
    setConvergenceKey(dup1, convergenceKey);
    await db1.flush();
    const dup1CreationHeads = headsOf(dup1);

    const dup2 = db2.add(Obj.make(FanOutEngineDoc, { note: 'source-state-v2', tag: BASELINE_TAG }));
    setConvergenceKey(dup2, convergenceKey);
    await db2.flush();
    const dup2CreationHeads = headsOf(dup2);

    const winnerIsDup1 = dup1.id < dup2.id;
    const winnerId = winnerIsDup1 ? dup1.id : dup2.id;
    const loserId = winnerIsDup1 ? dup2.id : dup1.id;
    const winnerCreationHeads = winnerIsDup1 ? dup1CreationHeads : dup2CreationHeads;
    const loserCreationHeads = winnerIsDup1 ? dup2CreationHeads : dup1CreationHeads;
    const winnerBaselineNote = winnerIsDup1 ? 'source-state-v1' : 'source-state-v2';

    await heal();
    await syncAll(db1, db2);
    await waitForConverged(db1);

    const winnerOnDb1 = await queryById(db1, winnerId);
    const loserOnDb1 = await queryIncludingDeleted(db1, loserId);
    expect(winnerOnDb1.note).to.eq(winnerBaselineNote); // The engine's existing (unaffected) behavior.

    const replayed = new Map<string, Heads>();
    const wrote = replayLoserEditsAtWinnerCreation(
      winnerOnDb1,
      loserOnDb1,
      winnerCreationHeads,
      loserCreationHeads,
      replayed,
    );
    await db1.flush();

    // The replay diffs the loser from ITS OWN creation heads -- a divergence that PREDATES
    // creation (the differing baseline) produces no patch to replay, by construction. It neither
    // fixes nor breaks anything here: it is a genuine no-op, not a misapplication.
    expect(wrote).to.eq(false);
    expect(winnerOnDb1.note).to.eq(winnerBaselineNote);

    // What SHOULD reconcile the two source states is a separate mechanism: fold-forward on the
    // SOURCE object (design item 1), which would re-run the migration transform against the late
    // source write and correct BOTH fanned-out copies' baseline through ordinary migration
    // machinery -- not this merge-time replay, which only ever sees post-creation edits.
  });
});
