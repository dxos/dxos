//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads, type Patch } from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import { Context } from '@dxos/context';
import { DXN, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer, getObjectCore } from '@dxos/echo-client/testing';
import { TestReplicationNetwork, type TestReplicator } from '@dxos/echo-host/testing';

//
// Consolidates `migration-research*.test.ts`'s findings into the definitive "fold-forward" schema
// migration bench: shared harness (this file) plus one expectation suite per file. See
// `.agents/projects/lenses/DESIGN.md` §10.3 for the hypothesis under test. Self-contained — no
// imports from the migration-research files, idioms are re-established here.
//

/** A `{ mine, theirs, loserId }` struct recording a fold's semantic conflict — Automerge itself never sees it. */
export type ConflictEntry = { mine?: string; theirs?: string; loserId?: string };

const ConflictEntrySchema = Schema.Struct({
  mine: Schema.optional(Schema.String),
  theirs: Schema.optional(Schema.String),
  loserId: Schema.optional(Schema.String),
});

const ConflictsSchema = Schema.optional(Schema.Record({ key: Schema.String, value: ConflictEntrySchema }));

/** All-optional so no schema validation gets in the way of partition/edit choreography; reused across suites. */
export class PersonDoc extends Type.makeObject<PersonDoc>(DXN.make('org.dxos.test.migration.bench.PersonDoc', '0.1.0'))(
  Schema.Struct({
    fullName: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
    employerName: Schema.optional(Schema.String),
    status: Schema.optional(Schema.String),
    done: Schema.optional(Schema.Boolean),
    label: Schema.optional(Schema.String),
    conflicts: ConflictsSchema,
  }),
) {}

/** Sibling type for cross-object (fold-writes-a-different-object) scenarios; same conflicts shape as `PersonDoc`. */
export class CompanyDoc extends Type.makeObject<CompanyDoc>(
  DXN.make('org.dxos.test.migration.bench.CompanyDoc', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    industry: Schema.optional(Schema.String),
    conflicts: ConflictsSchema,
  }),
) {}

export type PartitionedPair = {
  network: TestReplicationNetwork;
  peer1: EchoTestPeer;
  peer2: EchoTestPeer;
  /** Severs the transport: `removeReplicator` on both sides, so subsequent writes are concurrent. */
  partition: () => Promise<void>;
  /** Reconnects with FRESH replicator instances (re-adding removed ones is unexplored/unneeded per prior research). */
  heal: () => Promise<void>;
  /** `waitUntilHeadsReplicated` both ways + `updateIndexes` both, so both dbs observe the fully merged state. */
  syncAll: (db1: EchoDatabase, db2: EchoDatabase) => Promise<void>;
};

/**
 * Wraps the established two-peer partition/heal choreography. Databases are NOT owned here — tests
 * create/open their own via `peer.createDatabase`/`peer.openDatabase`, since a bench test may need
 * more than one database pairing (e.g. E2b's person + company) sharing the same partition state.
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

  const syncAll = async (db1: EchoDatabase, db2: EchoDatabase): Promise<void> => {
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
export const headsOf = <T extends Record<string, unknown>>(obj: T): Heads => A.getHeads(getObjectCore(obj).getDoc());

/** Patches from `heads` to the object's CURRENT heads — re-fetches the doc, never reuses a stale snapshot. */
export const diffSince = <T extends Record<string, unknown>>(obj: T, heads: Heads): Patch[] => {
  const doc = getObjectCore(obj).getDoc();
  return A.diff(doc, heads, A.getHeads(doc));
};

/**
 * A string write is a `put ''` (Automerge Text recreated) followed by a `splice` carrying the
 * content, whose path ends in a character offset — the property name sits at the fixed path index 3
 * on EVERY patch, not at the end.
 */
export const propertyNameOf = (patch: Patch): string | undefined => {
  const name = patch.path[3];
  return typeof name === 'string' ? name : undefined;
};

/**
 * Mutation patches only: an `action: 'conflict'` patch is metadata automerge attaches when
 * concurrent ops (even equal-valued ones) meet on a key, and it can surface in a diff whenever a
 * peer's concurrent op arrives late — so zero-WRITE assertions must ignore it or they race
 * replication traffic.
 */
export const writesSince = <T extends Record<string, unknown>>(obj: T, heads: Heads): Patch[] =>
  diffSince(obj, heads).filter((patch) => patch.action !== 'conflict');

/** The subset of `propSet` actually touched by `patches` — the fold-detection primitive every suite builds on. */
export const changedProps = (patches: readonly Patch[], propSet: ReadonlySet<string>): Set<string> => {
  const changed = new Set<string>();
  for (const patch of patches) {
    const name = propertyNameOf(patch);
    if (name !== undefined && propSet.has(name)) {
      changed.add(name);
    }
  }
  return changed;
};

/**
 * Copies `obj[from]` into `obj[to]` only when the values differ — an equal-value write still emits
 * an Automerge patch (claim 3), so every bench write must compare before writing to stay idempotent.
 * For same-typed source/target pairs (`fullName` -> `name`, `name` -> `label`).
 */
export const foldValue = <T extends Record<string, unknown>, K extends keyof T & string>(
  obj: T,
  from: K,
  to: K,
): boolean => {
  const value = obj[from];
  if (obj[to] === value) {
    return false;
  }
  obj[to] = value;
  return true;
};

/**
 * The general form of the value-compare guard: writes `next` into `obj[to]` only when it differs
 * from the current value. For derived (`done` from `status === 'done'`) and cross-object
 * (`company.industry` from `person.employerName`) folds where source and target types differ.
 */
export const foldInto = <T extends Record<string, unknown>, K extends keyof T & string>(
  obj: T,
  to: K,
  next: T[K],
): boolean => {
  if (obj[to] === next) {
    return false;
  }
  obj[to] = next;
  return true;
};

const conflictEntryEquals = (a: ConflictEntry | undefined, b: ConflictEntry): boolean =>
  a !== undefined && a.mine === b.mine && a.theirs === b.theirs && a.loserId === b.loserId;

/**
 * Writes a keyed conflict entry, guarded like every other bench write — Automerge itself never sees
 * a semantic (fold-level) conflict, so it must be data the application records, keyed by property
 * so two peers independently recording the SAME conflict converge on identical content instead of
 * appending duplicate entries. Returns whether it actually wrote.
 */
export const recordConflict = <T extends { conflicts?: Record<string, ConflictEntry> }>(
  obj: T,
  property: string,
  mine: string,
  theirs: string,
  loserId?: string,
): boolean => {
  const entry: ConflictEntry = loserId === undefined ? { mine, theirs } : { mine, theirs, loserId };
  if (conflictEntryEquals(obj.conflicts?.[property], entry)) {
    return false;
  }
  obj.conflicts = { ...obj.conflicts, [property]: entry };
  return true;
};
