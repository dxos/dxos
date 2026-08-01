//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  type ConflictEntry,
  type PartitionedPair,
  PersonDoc,
  createPartitionedPair,
  foldInto,
  headsOf,
  recordConflict,
  writesSince,
} from './harness';

//
// E4: definitive port of `migration-research-merge.test.ts`'s baseline-aware three-way merge
// prototype into the fan-out (1->N) framing: duplicates minted by two peers independently fanning
// out the SAME source, collapsed by a merge that minimizes data loss to only genuine conflicts. See
// `.agents/projects/lenses/DESIGN.md` §10.3.
//

/** Local extracted type: `street`/`city`/`note` are mergeable data fields, `sourceId` a back-reference. */
class ExtractedAddressDoc extends Type.makeObject<ExtractedAddressDoc>(
  DXN.make('org.dxos.test.migration.bench.ExtractedAddressDoc', '0.1.0'),
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
type ConflictRecord = Partial<Record<DataField, ConflictEntry>>;

/** The recomputable baseline: a pure function of a parent `PersonDoc`, split on its `employerName`. */
const deriveBaseline = (parent: PersonDoc): AddressFields => {
  const raw = parent.employerName ?? '';
  const [street = '', city = ''] = raw.split(',').map((part) => part.trim());
  return { street, city, note: '' };
};

/** Reads the mergeable data fields off a live ECHO object into a plain value snapshot. */
const readFields = (obj: ExtractedAddressDoc): AddressFields => ({
  street: obj.street ?? '',
  city: obj.city ?? '',
  note: obj.note ?? '',
});

/**
 * Naive field-wise winner-preference (the defect): a migration transform writes every field on
 * BOTH duplicates (baseline or edited), so "the winner defines it" is vacuously true everywhere —
 * the loser's value is never consulted, even for a field the winner never touched.
 */
const mergeWinnerPreference = (winner: AddressFields, loser: AddressFields): AddressFields => {
  const merged: AddressFields = { street: '', city: '', note: '' };
  for (const field of DATA_FIELDS) {
    merged[field] = winner[field] !== undefined ? winner[field] : loser[field];
  }
  return merged;
};

/**
 * The fix: per field, compare winner and loser against the recomputable BASELINE, not just against
 * each other. An edit only the loser made (winner still at baseline) is preserved; a genuine
 * conflict (both diverged AND disagree) keeps the winner's value but records the loser's side.
 */
const mergeThreeWay = (
  winner: AddressFields,
  loser: AddressFields,
  baseline: AddressFields,
  loserId: string,
): { merged: AddressFields; conflicts: ConflictRecord } => {
  const merged: AddressFields = { street: '', city: '', note: '' };
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
      merged[field] = mine; // both diverged AND disagree: keep winner, record the loser's side.
      conflicts[field] = { mine, theirs, loserId };
    }
  }
  return { merged, conflicts };
};

/**
 * Applies `mergeThreeWay` to live ECHO objects via the harness's guarded writers, and tombstones
 * the loser unless it already is one. Returns whether ANY write happened, for idempotence checks.
 */
const applyThreeWayMerge = (
  db: EchoDatabase,
  winner: ExtractedAddressDoc,
  loser: ExtractedAddressDoc,
  baseline: AddressFields,
): boolean => {
  const { merged, conflicts } = mergeThreeWay(readFields(winner), readFields(loser), baseline, loser.id);
  let wrote = false;
  Obj.update(winner, (winner) => {
    for (const field of DATA_FIELDS) {
      if (foldInto(winner, field, merged[field])) {
        wrote = true;
      }
    }
    for (const field of DATA_FIELDS) {
      const entry = conflicts[field];
      if (entry?.mine === undefined || entry.theirs === undefined) {
        continue;
      }
      if (recordConflict(winner, field, entry.mine, entry.theirs, entry.loserId)) {
        wrote = true;
      }
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
  objs: readonly [ExtractedAddressDoc, ExtractedAddressDoc],
): { winner: ExtractedAddressDoc; loser: ExtractedAddressDoc } => {
  const [first, second] = objs;
  return first.id < second.id ? { winner: first, loser: second } : { winner: second, loser: first };
};

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

const queryByIdentityKey = (db: EchoDatabase, identityKey: string): Promise<ExtractedAddressDoc[]> =>
  db.query(Filter.key(identityKey, { version: '1.0.0' })).run();

/** A tombstoned object is excluded from a default `Filter.id` query but readable with `deleted: 'include'`. */
const queryDeletedById = async (db: EchoDatabase, id: string): Promise<ExtractedAddressDoc> => {
  const [found] = await db.query(Query.select(Filter.id(id)).options({ deleted: 'include' })).run();
  invariant(found, 'expected the tombstoned object to remain queryable with deleted: include');
  return found;
};

type DuplicateScenario = {
  db1: EchoDatabase;
  db2: EchoDatabase;
  identityKey: string;
  baseline: AddressFields;
};

/**
 * Both peers, synced on one `PersonDoc`, partitioned, independently fan it out into a duplicate
 * stamped with the SAME derived identity key (content = `deriveBaseline(parent)`, identical on
 * both). Still partitioned, peer 1 edits `street` (disjoint) and peer 2 edits `note` (disjoint) —
 * both ALSO set `city` to DIFFERENT values, the genuine conflict. Heals and polls until both
 * duplicates are visible on both peers via `Filter.key`. Takes an already-created `pair` (with
 * `network` already assigned by the caller) so it never owns the harness's own teardown resource.
 */
const setUpDuplicateScenario = async (pair: PartitionedPair, spaceKey: PublicKey): Promise<DuplicateScenario> => {
  const { peer1, peer2, partition, heal, syncAll } = pair;

  const db1 = await peer1.createDatabase(spaceKey);
  const parent1 = db1.add(Obj.make(PersonDoc, { employerName: '221B Baker Street, London' }));
  await db1.flush();

  const rootUrl = db1.rootUrl;
  invariant(rootUrl, 'root url');
  const db2 = await peer2.openDatabase(spaceKey, rootUrl);
  await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
  await db2.updateIndexes();
  const parent2 = await queryPersonById(db2, parent1.id);

  const baseline = deriveBaseline(parent1);
  const identityKey = `org.dxos.test.migration.bench.fanout:${parent1.id}:address`;

  await partition();

  const dup1 = db1.add(
    Obj.make(ExtractedAddressDoc, {
      [Obj.Meta]: { key: identityKey, version: '1.0.0' },
      street: baseline.street,
      city: baseline.city,
      note: baseline.note,
      sourceId: parent1.id,
    }),
  );
  await db1.flush();
  const dup2 = db2.add(
    Obj.make(ExtractedAddressDoc, {
      [Obj.Meta]: { key: identityKey, version: '1.0.0' },
      street: baseline.street,
      city: baseline.city,
      note: baseline.note,
      sourceId: parent2.id,
    }),
  );
  await db2.flush();

  // Peer 1: its own disjoint edit, plus one side of the contested field.
  Obj.update(dup1, (dup1) => {
    dup1.street = '221B Baker Street (renovated)';
    dup1.city = 'City of Westminster';
  });
  await db1.flush();

  // Peer 2: a DIFFERENT disjoint edit, plus the OTHER side of the contested field.
  Obj.update(dup2, (dup2) => {
    dup2.note = 'gate code 4471';
    dup2.city = 'Greater London';
  });
  await db2.flush();

  await heal();
  await syncAll(db1, db2);

  await expect.poll(async () => (await queryByIdentityKey(db1, identityKey)).length, { timeout: 10_000 }).toBe(2);
  await expect.poll(async () => (await queryByIdentityKey(db2, identityKey)).length, { timeout: 10_000 }).toBe(2);

  return { db1, db2, identityKey, baseline };
};

describe('E4: fan-out (1→N) with meta-key merging', () => {
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

  test('E4a: naive winner-preference loses an unconflicted edit; baseline-aware three-way merge does not', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, ExtractedAddressDoc]);
    network = pair.network;
    const { db1, identityKey, baseline } = await setUpDuplicateScenario(pair, spaceKey);

    const dupsOnDb1 = await queryByIdentityKey(db1, identityKey);
    const { winner, loser } = pickWinnerLoser(dupsOnDb1 as [ExtractedAddressDoc, ExtractedAddressDoc]);
    const loserId = loser.id;

    const winnerFields = readFields(winner);
    const loserFields = readFields(loser);
    const naiveMerged = mergeWinnerPreference(winnerFields, loserFields);

    // Classify each field: a GENUINE conflict is "both sides diverged from baseline AND disagree".
    const isGenuineConflict = (field: DataField): boolean =>
      winnerFields[field] !== baseline[field] &&
      loserFields[field] !== baseline[field] &&
      winnerFields[field] !== loserFields[field];
    const lostWithoutConflict = DATA_FIELDS.filter(
      (field) =>
        naiveMerged[field] !== loserFields[field] &&
        loserFields[field] !== baseline[field] &&
        !isGenuineConflict(field),
    );

    // The quantified defect: `note` is a loser-only, unconflicted edit, dropped anyway because the
    // migration transform ALSO wrote `note` (as the baseline placeholder) on the winner's copy.
    expect(lostWithoutConflict).to.deep.eq(['note']);
    expect(naiveMerged.note).to.eq(winnerFields.note);
    expect(naiveMerged.note).to.not.eq(loserFields.note);
    expect(isGenuineConflict('city')).to.eq(true);

    // Now the real fix: baseline-aware three-way merge, applied and tombstoning the loser.
    const wrote = applyThreeWayMerge(db1, winner, loser, baseline);
    expect(wrote).to.eq(true);
    await db1.flush();

    // Winner carries BOTH disjoint edits — nothing unconflicted was lost this time.
    expect(winner.street).to.eq('221B Baker Street (renovated)');
    expect(winner.note).to.eq('gate code 4471');
    // The genuine conflict: winner's own value wins, but the loser's side is recorded, not erased.
    expect(winner.city).to.eq('City of Westminster');
    expect(winner.conflicts?.city).to.deep.eq({ mine: 'City of Westminster', theirs: 'Greater London', loserId });

    // The loser is tombstoned but fully readable, and agrees with what the conflict record claims.
    await expect.poll(async () => (await db1.query(Filter.id(loserId)).run()).length).toBe(0);
    const loserOnDb1 = await queryDeletedById(db1, loserId);
    expect(loserOnDb1.street).to.eq(baseline.street); // peer 2 never touched street.
    expect(loserOnDb1.city).to.eq(winner.conflicts?.city?.theirs);
    expect(loserOnDb1.note).to.eq('gate code 4471');
  });

  test('E4b: the contested field can be flipped to "theirs" after the fact, and the tombstoned loser independently confirms it', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, ExtractedAddressDoc]);
    network = pair.network;
    const { db1, db2, identityKey, baseline } = await setUpDuplicateScenario(pair, spaceKey);

    const dupsOnDb1 = await queryByIdentityKey(db1, identityKey);
    const { winner, loser } = pickWinnerLoser(dupsOnDb1 as [ExtractedAddressDoc, ExtractedAddressDoc]);
    const loserId = loser.id;
    applyThreeWayMerge(db1, winner, loser, baseline);
    await db1.flush();

    const cityConflict = winner.conflicts?.city;
    invariant(cityConflict?.theirs, 'expected a recorded city conflict with a "theirs" side');
    const theirsValue = cityConflict.theirs;

    // The flip could equally be derived straight from the tombstoned loser: record and tombstone
    // agree even BEFORE the flip — a UI could source the decision from either.
    const loserOnDb1Before = await queryDeletedById(db1, loserId);
    expect(loserOnDb1Before.city).to.eq(theirsValue);

    Obj.update(winner, (winner) => {
      winner.city = theirsValue;
      // A `conflicts` entry represents a PENDING decision; once resolved there is nothing left to
      // inspect that the tombstoned loser doesn't already carry, so the entry is removed.
      if (winner.conflicts) {
        const { city: _city, ...rest } = winner.conflicts;
        winner.conflicts = rest;
      }
    });
    await db1.flush();

    expect(winner.city).to.eq(theirsValue);
    expect(winner.conflicts?.city).to.eq(undefined);

    await pair.syncAll(db1, db2);

    let winnerOnDb2: ExtractedAddressDoc | undefined;
    await expect
      .poll(async () => {
        [winnerOnDb2] = await db2.query(Filter.id(winner.id)).run();
        return winnerOnDb2?.city;
      })
      .toBe(theirsValue);
    invariant(winnerOnDb2, 'expected the flip to replicate to peer 2');
    expect(winnerOnDb2.conflicts?.city).to.eq(undefined);

    // The tombstoned loser INDEPENDENTLY confirms the same value on both peers.
    const loserOnDb1 = await queryDeletedById(db1, loserId);
    const loserOnDb2 = await queryDeletedById(db2, loserId);
    expect(loserOnDb1.city).to.eq(theirsValue);
    expect(loserOnDb2.city).to.eq(theirsValue);
  });

  test('E4c: independent merges on both peers converge (including the conflicts record), and re-merging is zero writes', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, ExtractedAddressDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;
    const { db1, db2, identityKey, baseline } = await setUpDuplicateScenario(pair, spaceKey);

    // Partition AGAIN: both peers independently run the merge from the SAME already-synced input.
    await partition();

    const dupsOnDb1 = await queryByIdentityKey(db1, identityKey);
    const dupsOnDb2 = await queryByIdentityKey(db2, identityKey);
    const { winner: winner1, loser: loser1 } = pickWinnerLoser(dupsOnDb1 as [ExtractedAddressDoc, ExtractedAddressDoc]);
    const { winner: winner2, loser: loser2 } = pickWinnerLoser(dupsOnDb2 as [ExtractedAddressDoc, ExtractedAddressDoc]);
    expect(winner1.id).to.eq(winner2.id);
    expect(loser1.id).to.eq(loser2.id);

    applyThreeWayMerge(db1, winner1, loser1, baseline);
    await db1.flush();
    applyThreeWayMerge(db2, winner2, loser2, baseline);
    await db2.flush();

    await heal();
    await syncAll(db1, db2);

    // Both peers converge on identical winner state, INCLUDING the conflicts record: two
    // independently-computed writes carrying the same content are indistinguishable to the CRDT.
    await expect.poll(() => winner1.street).toBe('221B Baker Street (renovated)');
    await expect.poll(() => winner2.street).toBe('221B Baker Street (renovated)');
    expect(winner1.note).to.eq('gate code 4471');
    expect(winner2.note).to.eq('gate code 4471');
    expect(winner1.city).to.eq(winner2.city);
    expect(winner1.conflicts).to.deep.eq(winner2.conflicts);

    // The winner keeps its OWN city edit; the conflict record's `theirs` is the loser's other value.
    const theirsCity = winner1.city === 'City of Westminster' ? 'Greater London' : 'City of Westminster';
    expect(winner1.conflicts?.city).to.deep.eq({ mine: winner1.city, theirs: theirsCity, loserId: loser1.id });

    await expect.poll(async () => (await db1.query(Filter.id(loser1.id)).run()).length).toBe(0);
    await expect.poll(async () => (await db2.query(Filter.id(loser1.id)).run()).length).toBe(0);

    // Re-merge on peer 1 with no new divergence since: value-compare guards plus the already-
    // tombstoned loser mean this performs ZERO writes.
    const preRemergeHeads = headsOf(winner1);
    const wroteOnRerun = applyThreeWayMerge(db1, winner1, loser1, baseline);
    await db1.flush();

    expect(wroteOnRerun).to.eq(false);
    expect(writesSince(winner1, preRemergeHeads)).to.deep.eq([]);
  });
});
