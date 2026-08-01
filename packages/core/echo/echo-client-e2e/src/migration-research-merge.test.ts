//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicator, TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

//
// M0 migration research follow-up to PR #12412 (not landed, not on this branch — nothing here
// imports or depends on it). #12412's natural-key merge collapses identity-key duplicates via
// min-EntityId winner with PER-FIELD "winner defines it -> take winner's" preference. For
// MIGRATION-minted duplicates the deterministic transform writes every field on BOTH copies, so
// that rule always picks the winner — a loser-side edit is silently dropped even on a field the
// winner never touched. `mergeWinnerPreference` below prototypes that defect (test 1);
// `mergeThreeWay` prototypes the proposed fix — a three-way, baseline-aware merge that loses data
// only on a GENUINE conflict (both sides diverged from a recomputable baseline) and records it as
// inspectable, reversible data instead of erasing the loser (tests 2-4). Both functions are
// test-local prototypes, not production code.
//

/** Source-of-truth type: `address` is the split source a migration would fold from. */
class Parent extends Type.makeObject<Parent>(DXN.make('org.dxos.test.migration.merge.Parent', '0.1.0'))(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    address: Schema.optional(Schema.String),
  }),
) {}

/**
 * All fields optional, matching sibling files, so no schema validation gets in the way of the
 * partition/edit choreography. `conflicts` is a Record keyed by property name (not an array) so
 * that two peers independently recording the SAME conflict converge on the same content instead of
 * appending duplicate entries — see test 4.
 */
class ExtractedAddress extends Type.makeObject<ExtractedAddress>(
  DXN.make('org.dxos.test.migration.merge.ExtractedAddress', '0.1.0'),
)(
  Schema.Struct({
    street: Schema.optional(Schema.String),
    city: Schema.optional(Schema.String),
    note: Schema.optional(Schema.String),
    sourceId: Schema.optional(Schema.String),
    conflicts: Schema.optional(
      Schema.Record({
        key: Schema.String,
        value: Schema.Struct({
          mine: Schema.optional(Schema.String),
          theirs: Schema.optional(Schema.String),
          loserId: Schema.optional(Schema.String),
        }),
      }),
    ),
  }),
) {}

const DATA_FIELDS = ['street', 'city', 'note'] as const;
type DataField = (typeof DATA_FIELDS)[number];
type AddressFields = Record<DataField, string>;
type FieldConflict = { mine: string; theirs: string; loserId: string };
type ConflictRecord = Partial<Record<DataField, FieldConflict>>;

/**
 * The recomputable baseline: a pure function of the parent, exactly what the migration transform
 * would have written into a brand-new duplicate. `note` gets an explicit `''` placeholder (the
 * transform doesn't derive a note from the address, but it still WRITES the field on every
 * duplicate it mints) — this is what makes both copies "define every field" per #12412's finding.
 */
const deriveBaseline = (parent: Parent): AddressFields => {
  const raw = parent.address ?? '';
  const [street = '', city = ''] = raw.split(',').map((part) => part.trim());
  return { street, city, note: '' };
};

/** Reads the mergeable data fields off a live ECHO object into a plain value snapshot. */
const readFields = (obj: ExtractedAddress): AddressFields => ({
  street: obj.street ?? '',
  city: obj.city ?? '',
  note: obj.note ?? '',
});

/**
 * #12412's semantics: winner = min EntityId; per field, take the winner's value if the winner
 * defines it, else fall back to the loser's. Since a migration duplicate's transform writes every
 * field on BOTH copies (baseline or edited), "the winner defines it" is true for every field here —
 * the fallback to the loser never fires, so this always resolves to the winner's values.
 */
const mergeWinnerPreference = (winner: AddressFields, loser: AddressFields): AddressFields => {
  const merged = {} as AddressFields;
  for (const field of DATA_FIELDS) {
    merged[field] = winner[field] !== undefined ? winner[field] : loser[field];
  }
  return merged;
};

/**
 * The proposed fix: per field, compare winner and loser against the recomputable BASELINE, not just
 * against each other. An edit only the loser made (winner still at baseline) is preserved; a
 * genuine conflict (both diverged from baseline AND from each other) keeps the winner's value but
 * records what the loser had, instead of erasing it.
 */
const mergeThreeWay = (
  winner: AddressFields,
  loser: AddressFields,
  baseline: AddressFields,
  loserId: string,
): { merged: AddressFields; conflicts: ConflictRecord } => {
  const merged = {} as AddressFields;
  const conflicts: ConflictRecord = {};
  for (const field of DATA_FIELDS) {
    const mine = winner[field];
    const theirs = loser[field];
    const base = baseline[field];
    if (mine === base && theirs !== base) {
      merged[field] = theirs; // unconflicted loser edit, winner never touched this field.
    } else if (theirs === base || theirs === mine) {
      merged[field] = mine; // no genuine conflict: nothing to take from the loser.
    } else {
      merged[field] = mine; // both diverged AND disagree: keep winner, but record the loser's side.
      conflicts[field] = { mine, theirs, loserId };
    }
  }
  return { merged, conflicts };
};

const conflictsEqual = (a: ConflictRecord | undefined, b: ConflictRecord): boolean => {
  const left = a ?? {};
  const rightFields = Object.keys(b) as DataField[];
  const leftFields = Object.keys(left) as DataField[];
  if (leftFields.length !== rightFields.length) {
    return false;
  }
  return rightFields.every((field) => {
    const existing = left[field];
    const next = b[field];
    return existing?.mine === next?.mine && existing?.theirs === next?.theirs && existing?.loserId === next?.loserId;
  });
};

/**
 * Applies `mergeThreeWay` to live ECHO objects: value-compares every field and the conflicts record
 * before writing (claim 3 — an equal-value write still emits an Automerge patch, so a real merge
 * loop must not re-write values that already match), and tombstones the loser unless it already is
 * one. Returns whether ANY write happened, for the idempotence check in test 4.
 */
const applyThreeWayMerge = (
  db: EchoDatabase,
  winner: ExtractedAddress,
  loser: ExtractedAddress,
  baseline: AddressFields,
): boolean => {
  const { merged, conflicts } = mergeThreeWay(readFields(winner), readFields(loser), baseline, loser.id);
  let wrote = false;
  Obj.update(winner, (obj) => {
    for (const field of DATA_FIELDS) {
      if ((obj[field] ?? '') !== merged[field]) {
        obj[field] = merged[field];
        wrote = true;
      }
    }
    if (!conflictsEqual(obj.conflicts, conflicts)) {
      obj.conflicts = conflicts;
      wrote = true;
    }
  });
  if (!getObjectCore(loser).isDeleted()) {
    db.remove(loser);
    wrote = true;
  }
  return wrote;
};

/** ULIDs are lexicographically sortable by construction, so plain string `<` decides the winner unambiguously. */
const pickWinnerLoser = (
  objs: readonly [ExtractedAddress, ExtractedAddress],
): { winner: ExtractedAddress; loser: ExtractedAddress } => {
  const [first, second] = objs;
  return first.id < second.id ? { winner: first, loser: second } : { winner: second, loser: first };
};

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryParentById = async (db: EchoDatabase, id: string): Promise<Parent> => {
  let found: Parent | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated parent to be queryable');
  return found;
};

const queryByIdentityKey = (db: EchoDatabase, identityKey: string): Promise<ExtractedAddress[]> =>
  db.query(Filter.key(identityKey, { version: '1.0.0' })).run();

/** A tombstoned object is excluded from a default `Filter.id` query but readable with `deleted: 'include'`. */
const queryDeletedById = async (db: EchoDatabase, id: string): Promise<ExtractedAddress> => {
  const [found] = await db.query(Query.select(Filter.id(id)).options({ deleted: 'include' })).run();
  invariant(found, 'expected the tombstoned object to remain queryable with deleted: include');
  return found;
};

type PartitionedDuplicateScenario = {
  network: TestReplicationNetwork;
  peer1: Awaited<ReturnType<EchoTestBuilder['createPeer']>>;
  peer2: Awaited<ReturnType<EchoTestBuilder['createPeer']>>;
  db1: EchoDatabase;
  db2: EchoDatabase;
  identityKey: string;
  baseline: AddressFields;
  /** The replicator pair active after the heal, so a caller can partition a SECOND time (test 4). */
  healReplicator1: TestReplicator;
  healReplicator2: TestReplicator;
};

/**
 * Claim-6b's substrate: both peers synced on one parent, partitioned, each independently folds the
 * SAME parent into its own duplicate stamped with the SAME derived identity key (content =
 * `deriveBaseline(parent)`, identical on both). Still partitioned, peer 1 edits `street` (its copy
 * only) and peer 2 edits `note` (disjoint) — both ALSO set `city` to DIFFERENT values, the genuine
 * conflict. Heals and polls until both duplicates are visible on both peers via `Filter.key`.
 */
const setUpMigrationDuplicateScenario = async (
  builder: EchoTestBuilder,
  network: TestReplicationNetwork,
): Promise<PartitionedDuplicateScenario> => {
  const [spaceKey] = PublicKey.randomSequence();

  const peer1 = await builder.createPeer({ types: [Parent, ExtractedAddress] });
  const peer2 = await builder.createPeer({ types: [Parent, ExtractedAddress] });
  const replicator1 = await network.createReplicator();
  const replicator2 = await network.createReplicator();
  await peer1.host.addReplicator(Context.default(), replicator1);
  await peer2.host.addReplicator(Context.default(), replicator2);

  const db1 = await peer1.createDatabase(spaceKey);
  const parent1 = db1.add(Obj.make(Parent, { title: 'contact', address: '221B Baker Street, London' }));
  await db1.flush();

  const rootUrl = db1.rootUrl;
  invariant(rootUrl, 'root url');
  const db2 = await peer2.openDatabase(spaceKey, rootUrl);
  await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
  await db2.updateIndexes();
  const parent2 = await queryParentById(db2, parent1.id);

  const baseline = deriveBaseline(parent1);
  const identityKey = `org.dxos.test.lens.merge:${parent1.id}:address`;

  // Partition: each peer independently folds the SAME parent into its own duplicate.
  await peer1.host.removeReplicator(replicator1);
  await peer2.host.removeReplicator(replicator2);

  const dup1 = db1.add(
    Obj.make(ExtractedAddress, {
      [Obj.Meta]: { key: identityKey, version: '1.0.0' },
      street: baseline.street,
      city: baseline.city,
      note: baseline.note,
      sourceId: parent1.id,
    }),
  );
  await db1.flush();
  const dup2 = db2.add(
    Obj.make(ExtractedAddress, {
      [Obj.Meta]: { key: identityKey, version: '1.0.0' },
      street: baseline.street,
      city: baseline.city,
      note: baseline.note,
      sourceId: parent2.id,
    }),
  );
  await db2.flush();

  // Peer 1 edits its own copy only: street plus one side of the city conflict.
  Obj.update(dup1, (obj) => {
    obj.street = '221B Baker Street (renovated)';
    obj.city = 'City of Westminster';
  });
  await db1.flush();

  // Peer 2 edits its own copy only: a disjoint field (note) plus the OTHER side of the city conflict.
  Obj.update(dup2, (obj) => {
    obj.note = 'gate code 4471';
    obj.city = 'Greater London';
  });
  await db2.flush();

  // Heal: reconnect with fresh replicator instances, sync both ways.
  const healReplicator1 = await network.createReplicator();
  const healReplicator2 = await network.createReplicator();
  await peer1.host.addReplicator(Context.default(), healReplicator1);
  await peer2.host.addReplicator(Context.default(), healReplicator2);
  await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
  await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
  await db1.updateIndexes();
  await db2.updateIndexes();

  await expect.poll(async () => (await queryByIdentityKey(db1, identityKey)).length, { timeout: 10_000 }).toBe(2);
  await expect.poll(async () => (await queryByIdentityKey(db2, identityKey)).length, { timeout: 10_000 }).toBe(2);

  return { network, peer1, peer2, db1, db2, identityKey, baseline, healReplicator1, healReplicator2 };
};

describe('migration research (M0) — baseline-aware three-way merge', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('test 1: naive field-wise winner-preference loses an unconflicted edit (the defect)', async () => {
    await using network = await new TestReplicationNetwork().open();
    const { db1, identityKey, baseline } = await setUpMigrationDuplicateScenario(builder, network);

    const dups = await queryByIdentityKey(db1, identityKey);
    expect(dups.length).to.eq(2);
    const { winner, loser } = pickWinnerLoser(dups as [ExtractedAddress, ExtractedAddress]);

    // The min-EntityId comparison itself: plain string `<` on two ULIDs, unambiguous by design.
    expect(winner.id < loser.id).to.eq(true);

    const winnerFields = readFields(winner);
    const loserFields = readFields(loser);
    const merged = mergeWinnerPreference(winnerFields, loserFields);

    // Classify each field: a GENUINE conflict is "both sides diverged from baseline AND disagree".
    const isGenuineConflict = (field: DataField): boolean =>
      winnerFields[field] !== baseline[field] &&
      loserFields[field] !== baseline[field] &&
      winnerFields[field] !== loserFields[field];
    const lostWithoutConflict = DATA_FIELDS.filter(
      (field) =>
        merged[field] !== loserFields[field] && loserFields[field] !== baseline[field] && !isGenuineConflict(field),
    );

    // eslint-disable-next-line no-console
    console.log(
      'test 1: naive winner-preference lost',
      lostWithoutConflict.length,
      'field(s) with NO genuine conflict:',
      lostWithoutConflict,
    );

    // The quantified defect: `note` is a loser-only, unconflicted edit, dropped anyway because the
    // migration transform ALSO wrote `note` (as the baseline placeholder) on the winner's copy.
    expect(lostWithoutConflict).to.deep.eq(['note']);
    expect(merged.note).to.eq(winnerFields.note);
    expect(merged.note).to.not.eq(loserFields.note);

    // `city` is lost too, but it IS a genuine conflict -- the naive scheme still drops it silently,
    // with no record of what was overwritten (that absence of a record is what test 2 fixes).
    expect(isGenuineConflict('city')).to.eq(true);
    expect(merged.city).to.not.eq(loserFields.city);

    // `street` was the winner's OWN edit: never at risk regardless of merge scheme.
    expect(merged.street).to.eq(winnerFields.street);

    // Close the peers (disconnecting their replicators) BEFORE `network` disposes at scope end --
    // `afterEach`'s own `builder.close()` no-ops safely afterward (`Resource.close` is idempotent).
    await builder.close();
  });

  test('test 2: baseline-aware three-way merge loses only on genuine conflict, and records it', async () => {
    await using network = await new TestReplicationNetwork().open();
    const { db1, db2, identityKey, baseline } = await setUpMigrationDuplicateScenario(builder, network);

    const dupsOnDb1 = await queryByIdentityKey(db1, identityKey);
    const { winner, loser } = pickWinnerLoser(dupsOnDb1 as [ExtractedAddress, ExtractedAddress]);
    const loserId = loser.id;

    const wrote = applyThreeWayMerge(db1, winner, loser, baseline);
    expect(wrote).to.eq(true);
    await db1.flush();

    // Nothing unconflicted lost: winner carries BOTH sides' non-conflicting edits.
    expect(winner.street).to.eq('221B Baker Street (renovated)'); // peer 1's own edit.
    expect(winner.note).to.eq('gate code 4471'); // peer 2's disjoint edit, preserved.
    // The genuine conflict: winner's own value wins, but the loser's side is recorded.
    expect(winner.city).to.eq('City of Westminster');
    expect(winner.conflicts?.city).to.deep.eq({ mine: 'City of Westminster', theirs: 'Greater London', loserId });

    // The merge and the tombstone both replicate to peer 2.
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();

    let winnerOnDb2: ExtractedAddress | undefined;
    await expect
      .poll(async () => {
        [winnerOnDb2] = await db2.query(Filter.id(winner.id)).run();
        return winnerOnDb2?.note;
      })
      .toBe('gate code 4471');
    invariant(winnerOnDb2, 'expected the merged winner to replicate to peer 2');
    expect(winnerOnDb2.street).to.eq('221B Baker Street (renovated)');
    expect(winnerOnDb2.city).to.eq('City of Westminster');
    expect(winnerOnDb2.conflicts?.city).to.deep.eq({ mine: 'City of Westminster', theirs: 'Greater London', loserId });

    // The loser is gone from default queries on BOTH peers...
    await expect.poll(async () => (await db1.query(Filter.id(loserId)).run()).length).toBe(0);
    await expect.poll(async () => (await db2.query(Filter.id(loserId)).run()).length).toBe(0);

    // ...but every field is intact under `deleted: 'include'` -- the alternative history is inspectable.
    const loserOnDb1 = await queryDeletedById(db1, loserId);
    expect(loserOnDb1.street).to.eq(baseline.street); // peer 2 never touched street.
    expect(loserOnDb1.city).to.eq('Greater London');
    expect(loserOnDb1.note).to.eq('gate code 4471');

    const loserOnDb2 = await queryDeletedById(db2, loserId);
    expect(loserOnDb2.street).to.eq(baseline.street);
    expect(loserOnDb2.city).to.eq('Greater London');
    expect(loserOnDb2.note).to.eq('gate code 4471');

    // Close peers before `network` disposes at scope end (see test 1's comment).
    await builder.close();
  });

  test('test 3: the UI re-choice flips a recorded conflict to "theirs" after the fact', async () => {
    await using network = await new TestReplicationNetwork().open();
    const { db1, db2, identityKey, baseline } = await setUpMigrationDuplicateScenario(builder, network);

    const dupsOnDb1 = await queryByIdentityKey(db1, identityKey);
    const { winner, loser } = pickWinnerLoser(dupsOnDb1 as [ExtractedAddress, ExtractedAddress]);
    const loserId = loser.id;
    applyThreeWayMerge(db1, winner, loser, baseline);
    await db1.flush();

    const cityConflict = winner.conflicts?.city;
    invariant(cityConflict, 'expected a recorded city conflict');
    const theirsValue = cityConflict.theirs;

    // The flip could equally be derived straight from the tombstoned loser: record and tombstone agree.
    const loserOnDb1 = await queryDeletedById(db1, loserId);
    expect(loserOnDb1.city).to.eq(theirsValue);

    Obj.update(winner, (obj) => {
      obj.city = theirsValue;
      // A `conflicts` entry represents a PENDING decision; once resolved there is nothing left to
      // inspect that the tombstoned loser doesn't already carry, so the entry is removed rather than
      // kept as stale swapped bookkeeping.
      if (obj.conflicts) {
        const { city: _city, ...rest } = obj.conflicts;
        obj.conflicts = rest;
      }
    });
    await db1.flush();

    expect(winner.city).to.eq(theirsValue);
    expect(winner.conflicts?.city).to.eq(undefined);

    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(async () => (await db2.query(Filter.id(winner.id)).run())[0]?.city).toBe(theirsValue);
    const winnerOnDb2 = (await db2.query(Filter.id(winner.id)).run())[0];
    invariant(winnerOnDb2, 'expected the flip to replicate to peer 2');
    expect(winnerOnDb2.conflicts?.city).to.eq(undefined);

    // Close peers before `network` disposes at scope end (see test 1's comment).
    await builder.close();
  });

  test('test 4: independent merges converge, including the conflicts record, and re-merging is a no-op', async () => {
    await using network = await new TestReplicationNetwork().open();
    const { peer1, peer2, db1, db2, identityKey, baseline, healReplicator1, healReplicator2 } =
      await setUpMigrationDuplicateScenario(builder, network);

    // Partition AGAIN: both peers independently run the merge from the SAME already-synced input.
    await peer1.host.removeReplicator(healReplicator1);
    await peer2.host.removeReplicator(healReplicator2);

    const dupsOnDb1 = await queryByIdentityKey(db1, identityKey);
    const dupsOnDb2 = await queryByIdentityKey(db2, identityKey);
    const { winner: winner1, loser: loser1 } = pickWinnerLoser(dupsOnDb1 as [ExtractedAddress, ExtractedAddress]);
    const { winner: winner2, loser: loser2 } = pickWinnerLoser(dupsOnDb2 as [ExtractedAddress, ExtractedAddress]);
    expect(winner1.id).to.eq(winner2.id);
    expect(loser1.id).to.eq(loser2.id);

    applyThreeWayMerge(db1, winner1, loser1, baseline);
    await db1.flush();
    applyThreeWayMerge(db2, winner2, loser2, baseline);
    await db2.flush();

    // Heal: reconnect with fresh replicator instances, sync both ways.
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // Both peers converge on identical winner state, INCLUDING the conflicts record: the Record's
    // content is the same on both independently-computed writes, so whichever value wins the
    // underlying CRDT register is indistinguishable from the other -- this is exactly why the shape
    // is a Record keyed by property, not an array (two concurrent appends would instead duplicate).
    await expect.poll(() => winner1.street).toBe('221B Baker Street (renovated)');
    await expect.poll(() => winner2.street).toBe('221B Baker Street (renovated)');
    expect(winner1.note).to.eq('gate code 4471');
    expect(winner2.note).to.eq('gate code 4471');
    expect(winner1.city).to.eq('City of Westminster');
    expect(winner2.city).to.eq('City of Westminster');
    expect(winner1.conflicts).to.deep.eq(winner2.conflicts);
    expect(winner1.conflicts?.city).to.deep.eq({
      mine: 'City of Westminster',
      theirs: 'Greater London',
      loserId: loser1.id,
    });

    // The loser is tombstoned on both peers.
    await expect.poll(async () => (await db1.query(Filter.id(loser1.id)).run()).length).toBe(0);
    await expect.poll(async () => (await db2.query(Filter.id(loser1.id)).run()).length).toBe(0);

    // Idempotence: re-running the merge on the converged state performs ZERO writes -- value-compare
    // before writing (claim 3) plus the already-tombstoned loser means nothing changes.
    const core = getObjectCore(winner1);
    const headsBefore = A.getHeads(core.getDoc());
    const wroteOnRerun = applyThreeWayMerge(db1, winner1, loser1, baseline);
    await db1.flush();
    const headsAfter = A.getHeads(core.getDoc());

    expect(wroteOnRerun).to.eq(false);
    expect(headsAfter).to.deep.eq(headsBefore);
    expect(A.diff(core.getDoc(), headsBefore, headsAfter)).to.deep.eq([]);

    // Close peers before `network` disposes at scope end (see test 1's comment).
    await builder.close();
  });
});
