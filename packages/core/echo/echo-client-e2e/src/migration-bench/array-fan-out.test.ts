//
// Copyright 2026 DXOS.org
//

import { next as A, type Conflicts } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type PartitionedPair, type TestDatabase, createPartitionedPair, headsOf, writesSince } from './harness.ts';

//
// Open item (M0-REPORT.md design 5, RATIFIED): proves or disproves the two-step array fan-out
// composition against the REAL merge engine landed in #12412 (`meta.convergenceKey`,
// `echo-host/src/db-host/{merge-core,convergence-key-merge}.ts`) rather than the passive-collapse
// assumption the report's evidence map leaves untested. Self-contained: reuses only the
// partition/heal choreography from `harness.ts`; schema, raw-doc conflict access, and merge-driving
// helpers are local and array-specific, one array-index deeper than `conflicts.test.ts`'s pattern
// for `A.getConflicts` through ECHO's doc structure.
//

const LENS_ID = 'org.dxos.test.migration.bench.array-fan-out';

const ElementStruct = Schema.Struct({
  id: Schema.optional(Schema.String),
  name: Schema.String,
});

/** Step 2's product: one child per array element, keyed `<lensId>:<parentId>:<elementId>`. Declared
 * before `ArrayParentDoc` so the parent's ref field can name it directly, with no forward-ref suspend. */
class ElementChildDoc extends Type.makeObject<ElementChildDoc>(
  DXN.make('org.dxos.test.migration.bench.ElementChildDoc', '0.1.0'),
)(
  Schema.Struct({
    parentId: Schema.optional(Schema.String),
    elementId: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
  }),
) {}

/** The array-fan-out subject: an id-less-by-default collection needing the two-step composition. */
class ArrayParentDoc extends Type.makeObject<ArrayParentDoc>(
  DXN.make('org.dxos.test.migration.bench.ArrayParentDoc', '0.1.0'),
)(
  Schema.Struct({
    items: Schema.optional(Schema.Array(ElementStruct)),
    firstChild: Schema.optional(Ref.Ref(ElementChildDoc)),
  }),
) {}

const mergeKey = (parentId: string, elementId: string): string => `${LENS_ID}:${parentId}:${elementId}`;

const setConvergenceKey = (object: Obj.Unknown, convergenceKey: string): void => {
  Obj.update(object, (object) => {
    Obj.getMeta(object).convergenceKey = convergenceKey;
  });
};

/**
 * Design 5 step 1: `element.id ??= randomId()` -- presence-guarded so a rerun after reconciliation
 * writes nothing, and independently safe under partition since each peer only ever fills its OWN
 * blanks; the resulting register conflicts (when two peers fill the SAME blank) settle by LWW.
 */
const stampIds = (parent: ArrayParentDoc): boolean => {
  let wrote = false;
  Obj.update(parent, (parent) => {
    for (const item of parent.items ?? []) {
      if (item.id === undefined) {
        item.id = PublicKey.random().toHex();
        wrote = true;
      }
    }
  });
  return wrote;
};

/**
 * Design 5 step 2: one child per array element, keyed by the element's (by-precondition, already
 * stamped) stable id -- never by a caller-chosen object id, so independent peers naturally collapse
 * via the merge engine rather than diverging (the ruled-out "derived object ids" failure mode).
 * Guards on an existing key so a peer re-running its OWN split is a no-op; it does NOT guard against
 * a DIFFERENT peer's split of the same element under a different (not-yet-reconciled) id -- that is
 * exactly the residual `A4` characterizes.
 */
const splitElements = async (db: TestDatabase, parent: ArrayParentDoc): Promise<ElementChildDoc[]> => {
  const created: ElementChildDoc[] = [];
  const existing = await db.query(Filter.type(ElementChildDoc)).run();
  for (const item of parent.items ?? []) {
    invariant(item.id !== undefined, 'step 2 requires every element to already carry a stable id');
    if (existing.some((child) => child.parentId === parent.id && child.elementId === item.id)) {
      continue;
    }
    const child = db.add(Obj.make(ElementChildDoc, { parentId: parent.id, elementId: item.id, name: item.name }));
    setConvergenceKey(child, mergeKey(parent.id, item.id));
    created.push(child);
  }
  await db.flush();
  return created;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Navigates `objects.<id>.data`, one array index deeper than `conflicts.test.ts`'s helper --
 * `A.getConflicts` needs the ELEMENT's own raw map, not the array or the parent object's data.
 */
const getRawItems = (doc: unknown, objectId: string): Record<string, unknown>[] => {
  invariant(isRecord(doc), 'expected an automerge doc');
  const objects = doc.objects;
  invariant(isRecord(objects), 'expected doc.objects');
  const entity = objects[objectId];
  invariant(isRecord(entity), 'expected an entity structure');
  const data = entity.data;
  invariant(isRecord(data), 'expected entity.data');
  const items = data.items;
  invariant(Array.isArray(items), 'expected entity.data.items to be an array');
  return items as Record<string, unknown>[];
};

const idConflictsAt = (parent: ArrayParentDoc, index: number): Conflicts | undefined => {
  const items = getRawItems(getObjectCore(parent).getDoc(), parent.id);
  return A.getConflicts(items[index], 'id');
};

/**
 * Ground truth by name, bypassing the reactive proxy entirely -- `getObjectCore(parent).getDoc()`
 * always re-reads the current merged doc (per `harness.ts`'s `headsOf`/`diffSince`), unlike a
 * long-held live proxy reference, which `A2b` shows can present stale, cross-contaminated data.
 */
const rawItemByName = (parent: ArrayParentDoc, name: string): { id?: unknown } => {
  const items = getRawItems(getObjectCore(parent).getDoc(), parent.id);
  const found = items.find((item) => item.name === name);
  invariant(found, `expected a raw element named ${name}`);
  return found;
};

/**
 * Waits until an object's heads stop advancing for a short quiet window. Needed because a read
 * taken immediately after `syncAll` (`waitUntilHeadsReplicated` + `updateIndexes`) can still race a
 * final in-flight write on some runs -- observed directly while characterizing `A2b`, where reading
 * too early intermittently showed a still-settling intermediate state rather than the converged one.
 */
const waitForQuiescence = (parent: ArrayParentDoc, timeout = 10_000): Promise<boolean> => {
  let lastHeads: readonly string[] | undefined;
  let stableSince = Date.now();
  return waitForCondition({
    condition: () => {
      const heads = headsOf(parent);
      const unchanged =
        lastHeads !== undefined && heads.length === lastHeads.length && heads.every((h, i) => h === lastHeads![i]);
      if (!unchanged) {
        stableSince = Date.now();
      }
      lastHeads = heads;
      return Date.now() - stableSince > 250;
    },
    timeout,
  });
};

/** Merging is worker-driven off the indexing stream (#12412), so convergence is awaited, not synchronous. */
const waitForLiveChildCount = (db: TestDatabase, count: number) =>
  waitForCondition({
    condition: async () => (await db.query(Filter.type(ElementChildDoc)).run()).length === count,
    timeout: 10_000,
  });

const childrenByElementId = async (db: TestDatabase, parentId: string, elementId: string) =>
  (await db.query(Filter.type(ElementChildDoc)).run()).filter(
    (child) => child.parentId === parentId && child.elementId === elementId,
  );

/**
 * `Filter.id` is untyped (unlike `Filter.type`), so every lookup by id needs the same narrowing --
 * centralized here rather than repeated per call site, matching `conflicts.test.ts`'s `queryPersonById`.
 */
const queryParent = async (db: TestDatabase, id: string): Promise<ArrayParentDoc> => {
  const [found] = await db.query(Filter.id(id)).run();
  invariant(found, 'expected the replicated parent');
  return found as ArrayParentDoc;
};

type TwoPeerSetup = {
  pair: PartitionedPair;
  db1: TestDatabase;
  db2: TestDatabase;
  parent1: ArrayParentDoc;
  parent2: ArrayParentDoc;
  spaceKey: PublicKey;
};

/** Two peers, replicated, sharing one freshly-created `ArrayParentDoc` with the given (unstamped) elements. */
const openPeers = async (
  builder: EchoTestBuilder,
  items: ReadonlyArray<{ readonly name: string }>,
): Promise<TwoPeerSetup> => {
  const [spaceKey] = PublicKey.randomSequence();
  const pair = await createPartitionedPair(builder, [ArrayParentDoc, ElementChildDoc]);
  const db1 = await pair.peer1.createDatabase(spaceKey);
  const parent1 = db1.add(Obj.make(ArrayParentDoc, { items: [...items] }));
  await db1.flush();

  const rootUrl = db1.rootUrl;
  invariant(rootUrl, 'root url');
  const db2 = await pair.peer2.openDatabase(spaceKey, rootUrl);
  await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
  await db2.updateIndexes();
  const parent2 = await queryParent(db2, parent1.id);

  return { pair, db1, db2, parent1, parent2, spaceKey };
};

const findByName = (parent: ArrayParentDoc, name: string) => {
  const item = parent.items?.find((item) => item.name === name);
  invariant(item, `expected an element named ${name}`);
  return item;
};

describe('array fan-out (design 5): two-step composition against the real merge engine', () => {
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

  test('A1: step 1 stamped concurrently under partition converges to one id per element on both peers; a rerun writes nothing', async ({
    expect,
  }) => {
    const { pair, db1, db2, parent1, parent2 } = await openPeers(builder, [
      { name: 'alpha' },
      { name: 'beta' },
      { name: 'gamma' },
    ]);
    network = pair.network;
    const { partition, heal, syncAll } = pair;

    await partition();
    // Both peers stamp the SAME three blanks concurrently -- the register race step 1 is designed
    // to tolerate.
    expect(stampIds(parent1)).to.eq(true);
    await db1.flush();
    expect(stampIds(parent2)).to.eq(true);
    await db2.flush();

    await heal();
    await syncAll(db1, db2);

    // Each peer's OWN pre-heal stamp already made its local `every(... !== undefined)` true, so that
    // alone proves nothing about convergence -- poll for the two peers' id SETS actually agreeing.
    await expect
      .poll(
        () =>
          JSON.stringify(parent1.items?.map((item) => item.id)) ===
          JSON.stringify(parent2.items?.map((item) => item.id)),
        {
          timeout: 10_000,
        },
      )
      .toBe(true);
    await waitForQuiescence(parent1);
    await waitForQuiescence(parent2);

    // Exactly one id per element, identical on both peers -- the register converged, not merely
    // "both non-empty".
    const ids1 = parent1.items!.map((item) => item.id);
    const ids2 = parent2.items!.map((item) => item.id);
    expect(new Set(ids1).size).to.eq(3);
    expect(ids2).to.deep.eq(ids1);

    // The rerun: presence-guarded, so nothing is left to stamp -- zero writes, not just "returns false".
    const preRerunHeads = headsOf(parent1);
    expect(stampIds(parent1)).to.eq(false);
    await db1.flush();
    expect(writesSince(parent1, preRerunHeads)).to.deep.eq([]);
  });

  test('A2a: a reorder AFTER the stamp was seen carries the id with the element', async ({ expect }) => {
    const { pair, db1, db2, parent1 } = await openPeers(builder, [
      { name: 'alpha' },
      { name: 'beta' },
      { name: 'gamma' },
    ]);
    network = pair.network;

    stampIds(parent1);
    await db1.flush();

    const idsByName = new Map(parent1.items!.map((item) => [item.name, item.id]));

    // A move-to-end: automerge's list splice is delete+reinsert, so this is the case under test --
    // does the JS-level snapshot spliced back in still carry the field the array element already had.
    Obj.update(parent1, (parent1) => {
      const [moved] = parent1.items!.splice(0, 1);
      parent1.items!.push(moved);
    });
    await db1.flush();

    expect(parent1.items!.map((item) => item.name)).to.deep.eq(['beta', 'gamma', 'alpha']);
    for (const item of parent1.items!) {
      expect(item.id).to.eq(idsByName.get(item.name));
      expect(item.id).to.not.eq(undefined);
    }

    // Replicates intact, not just locally consistent.
    await pair.syncAll(db1, db2);
    const parent2 = await queryParent(db2, parent1.id);
    await expect.poll(() => parent2.items?.map((item) => item.name)).toEqual(['beta', 'gamma', 'alpha']);
    for (const item of parent2.items!) {
      expect(item.id).to.eq(idsByName.get(item.name));
    }
  });

  test('A2b: a reorder racing an unseen stamp drops the id -- the recreated element gets a second id on the next stamp pass', async ({
    expect,
  }) => {
    const { pair, db1, db2, parent1, parent2, spaceKey } = await openPeers(builder, [
      { name: 'alpha' },
      { name: 'beta' },
      { name: 'gamma' },
    ]);
    network = pair.network;
    const { partition, heal, syncAll } = pair;

    await partition();
    // Peer 1 stamps all three elements -- unseen by peer 2, which is still partitioned. Peer 1
    // writes to array index 2 (`gamma`, its own local order is unchanged) as part of this.
    stampIds(parent1);
    await db1.flush();
    // Peer 2, unaware, reorders `alpha` while its own copy still has no ids at all. `alpha` also
    // ends up at index 2 in the post-merge order, which matters below.
    Obj.update(parent2, (parent2) => {
      const [moved] = parent2.items!.splice(0, 1);
      parent2.items!.push(moved);
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => rawItemByName(parent1, 'beta').id !== undefined, { timeout: 10_000 }).toBe(true);
    await expect.poll(() => rawItemByName(parent2, 'beta').id !== undefined, { timeout: 10_000 }).toBe(true);
    // `syncAll` waits on heads replication and index updates, but not on this doc going fully
    // quiet -- a read immediately after can still race a final in-flight write.
    await waitForQuiescence(parent1);
    await waitForQuiescence(parent2);

    // Ground truth is read off the raw automerge doc (`getRawItems`/`rawItemByName`), never off a
    // long-held live proxy -- see the note below on why that distinction turned out to be load-bearing.
    for (const parent of [parent1, parent2]) {
      expect(rawItemByName(parent, 'beta').id).to.not.eq(undefined);
      expect(rawItemByName(parent, 'gamma').id).to.not.eq(undefined);
    }

    // The reordered element: peer 1's stamp targeted the list slot peer 2's splice deleted
    // concurrently -- automerge has no list-move, so the reinsert is a brand-new node carrying
    // peer 2's pre-stamp snapshot. The write is orphaned, not merged onto the new node.
    for (const parent of [parent1, parent2]) {
      expect(rawItemByName(parent, 'alpha').id).to.eq(undefined);
    }

    // A DISTINCT, unplanned finding, verified rather than assumed: peer 1's OWN long-held live
    // proxy -- the same object it called `stampIds` through -- presents a STALE, WRONG id for
    // `alpha` at this point: `gamma`'s id, leaked from peer 1's own earlier write to array index 2
    // (`alpha`'s post-merge slot). Re-querying the SAME db for the SAME object returns the SAME
    // cached instance and is equally stale -- this is scoped to the live object graph of one
    // peer/session, not to a single query call. A genuinely independent peer, never having read
    // this path before the reorder landed, sees the correct (blank) value.
    expect(findByName(parent1, 'alpha').id).to.eq(rawItemByName(parent1, 'gamma').id);
    expect(findByName(parent1, 'alpha').id).to.not.eq(rawItemByName(parent1, 'alpha').id);
    const staleRequery = await queryParent(db1, parent1.id);
    expect(findByName(staleRequery, 'alpha').id).to.eq(findByName(parent1, 'alpha').id);

    const peer3 = await builder.createPeer({ types: [ArrayParentDoc, ElementChildDoc] });
    await peer3.host.addReplicator(Context.default(), await network!.createReplicator());
    const db3 = await peer3.openDatabase(spaceKey, db1.rootUrl!);
    await db3.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db3.updateIndexes();
    const freshParent = await queryParent(db3, parent1.id);
    expect(findByName(freshParent, 'alpha').id).to.eq(undefined);

    // The practical consequence for step 1 specifically, demonstrated directly: iterating the
    // STALE live array (as `stampIds` naturally does) sees `alpha.id` as already defined and
    // WRONGLY skips it -- the presence guard's idempotence claim can be defeated by this proxy
    // artifact, not just by a genuine prior stamp. A migration re-invoked through a FRESH read (as
    // any real re-invocation would be, since it re-queries rather than holding a reference across
    // the whole rollout) sees the genuine blank and mints a SECOND id for `alpha` -- peer 1's
    // original stamp for it is unrecoverable, not merely delayed.
    expect(stampIds(parent1)).to.eq(false);
    expect(stampIds(freshParent)).to.eq(true);
    await db3.flush();
    expect(rawItemByName(freshParent, 'alpha').id).to.not.eq(undefined);
    expect(stampIds(freshParent)).to.eq(false);
  });

  test('A3: step 2 split independently by both peers collapses to one child per element; a parent ref resolves to the survivor', async ({
    expect,
  }) => {
    const { pair, db1, db2, parent1, parent2 } = await openPeers(builder, [
      { name: 'alpha' },
      { name: 'beta' },
      { name: 'gamma' },
    ]);
    network = pair.network;
    const { partition, heal, syncAll } = pair;

    stampIds(parent1);
    await db1.flush();
    // Both peers agree on the stamped ids before splitting -- step 2 ships only after step 1
    // reconciles (the temporal gate), so this is the precondition, not part of what is under test.
    await syncAll(db1, db2);
    await expect.poll(() => parent2.items?.every((item) => item.id !== undefined)).toBe(true);

    await partition();
    const created1 = await splitElements(db1, parent1);
    const created2 = await splitElements(db2, parent2);
    expect(created1).to.have.length(3);
    expect(created2).to.have.length(3);

    // Peer 1 refs its own (not-yet-known-to-be-a-loser) split of `alpha`, before any merge has run.
    const alphaId = findByName(parent1, 'alpha').id!;
    const alphaChild1 = created1.find((child) => child.elementId === alphaId)!;
    Obj.update(parent1, (parent1) => {
      parent1.firstChild = Ref.make(alphaChild1);
    });
    await db1.flush();

    await heal();
    await syncAll(db1, db2);

    // 3 elements x 2 independent splits = 6 duplicates in, 3 live children out.
    await waitForLiveChildCount(db1, 3);
    await waitForLiveChildCount(db2, 3);

    for (const name of ['alpha', 'beta', 'gamma']) {
      const elementId = findByName(parent1, name).id!;
      const [c1] = created1.filter((child) => child.elementId === elementId);
      const [c2] = created2.filter((child) => child.elementId === elementId);
      const expectedWinner = c1.id < c2.id ? c1.id : c2.id;

      for (const db of [db1, db2]) {
        const live = await childrenByElementId(db, parent1.id, elementId);
        expect(live).to.have.length(1);
        expect(live[0].id).to.eq(expectedWinner);
        expect(live[0].name).to.eq(name);
      }
    }

    // The ref peer 1 made to its own (possibly losing) split resolves to the survivor, per #12412's
    // reference-redirect machinery -- proven generically in `merge.test.ts`, exercised here for a
    // fan-out-minted child specifically.
    const alphaElementId = findByName(parent1, 'alpha').id!;
    const [alphaWinner] = await childrenByElementId(db1, parent1.id, alphaElementId);
    await expect.poll(() => parent1.firstChild?.target?.id).toBe(alphaWinner.id);
    const loaded = await parent1.firstChild!.load();
    expect(loaded.id).to.eq(alphaWinner.id);
  });

  test('A4: step 2 run before reconciliation leaves a residual duplicate under a different key, detectable without active tracking', async ({
    expect,
  }) => {
    const peer: EchoTestPeer = await builder.createPeer({ types: [ArrayParentDoc, ElementChildDoc] });
    const db = await peer.createDatabase();

    const parent = db.add(Obj.make(ArrayParentDoc, { items: [{ name: 'alpha' }] }));
    stampIds(parent);
    await db.flush();
    const finalElementId = findByName(parent, 'alpha').id!;

    // Model the outcome of "peer B split using its own not-yet-reconciled id before hearing that
    // peer A's stamp won the LWW" directly: a live child keyed to a value the array no longer shows,
    // alongside the correct split -- the same end-state a real race produces (proven possible by A1),
    // without depending on which side automerge's LWW happens to prefer.
    const prematureElementId = PublicKey.random().toHex();
    expect(prematureElementId).to.not.eq(finalElementId);
    const orphan = db.add(
      Obj.make(ElementChildDoc, { parentId: parent.id, elementId: prematureElementId, name: 'alpha' }),
    );
    setConvergenceKey(orphan, mergeKey(parent.id, prematureElementId));
    const [correct] = await splitElements(db, parent);
    await db.flush();

    // Different convergence keys: the merge engine has no group to collapse, by design (§4.11's
    // scope is one key). Both stay live -- confirmed by settling, not merely reading once.
    await waitForCondition({
      condition: async () => (await db.query(Filter.type(ElementChildDoc)).run()).length >= 2,
      timeout: 5_000,
    });
    const live = await db.query(Filter.type(ElementChildDoc)).run();
    const forElement = live.filter((child) => child.parentId === parent.id);
    expect(forElement).to.have.length(2);
    expect(forElement.map((child) => child.id).sort()).to.deep.eq([orphan.id, correct.id].sort());

    // The claimed cheap detector: compare each child's recorded elementId against what the parent's
    // array CURRENTLY shows for that logical slot -- no active tracking, one query plus one field
    // read per candidate.
    const currentIds = new Set(parent.items!.map((item) => item.id));
    const flaggedOrphans = forElement.filter((child) => !currentIds.has(child.elementId));
    expect(flaggedOrphans.map((child) => child.id)).to.deep.eq([orphan.id]);
    expect(currentIds.has(correct.elementId!)).to.eq(true);

    // "Reviewable duplicates" as the report claims: nothing here erases or auto-resolves the orphan,
    // it is a live, queryable, ordinary object -- the report's own vocabulary is accurate, not just
    // reassuring.
    expect(orphan.name).to.eq('alpha');
  });

  test('A5: a coordination-free gate ("no local register conflict") has a real blind spot before replication, and stale conflicts need an explicit reconcile write to ever open it', async ({
    expect,
  }) => {
    const { pair, db1, db2, parent1, parent2 } = await openPeers(builder, [{ name: 'alpha' }]);
    network = pair.network;
    const { partition, heal, syncAll } = pair;

    /** The proposed gate: stamped, AND no live register conflict on `id`. */
    const canSplit = (parent: ArrayParentDoc, index: number): boolean =>
      parent.items?.[index]?.id !== undefined && idConflictsAt(parent, index) === undefined;

    await partition();
    stampIds(parent1);
    await db1.flush();
    stampIds(parent2);
    await db2.flush();
    // Captured now, before healing converges both peers onto ONE presented value -- these are the
    // two raced values the conflict set below must contain, not whatever either peer shows later.
    const idA = parent1.items![0].id;
    const idB = parent2.items![0].id;

    // BLIND SPOT: each peer only sees its OWN stamp so far -- the gate reads "safe" locally even
    // though a genuinely concurrent, disagreeing write already exists on the other peer. A
    // coordination-free local check cannot see what has not replicated in yet.
    expect(canSplit(parent1, 0)).to.eq(true);
    expect(canSplit(parent2, 0)).to.eq(true);
    expect(idA).to.not.eq(idB);

    await heal();
    await syncAll(db1, db2);

    // Once replicated, the race becomes visible and the gate correctly withholds the split on BOTH
    // peers, regardless of which value the register happens to present.
    await expect.poll(() => idConflictsAt(parent1, 0) !== undefined, { timeout: 10_000 }).toBe(true);
    await expect.poll(() => idConflictsAt(parent2, 0) !== undefined, { timeout: 10_000 }).toBe(true);
    expect(canSplit(parent1, 0)).to.eq(false);
    expect(canSplit(parent2, 0)).to.eq(false);
    const conflictValues = Object.values(idConflictsAt(parent1, 0)!).sort();
    expect(conflictValues).to.deep.eq([idA, idB].sort());

    // CAVEAT, not assumed: automerge never clears a register's conflict set on its own -- only a
    // FRESH write does (established for a differing value in `conflicts.test.ts`'s H2/H5; here for
    // the degenerate case of re-affirming the ALREADY-PRESENTED value). Without an explicit
    // reconcile step the gate would stay closed FOREVER for this element, well after the race is
    // long resolved -- "no conflicts" alone is not a self-healing signal.
    const settledId = parent1.items![0].id;
    Obj.update(parent1, (parent1) => {
      const item = parent1.items![0];
      const current = item.id;
      invariant(current !== undefined, 'expected the settled id to still be present');
      item.id = current;
    });
    await db1.flush();

    expect(parent1.items![0].id).to.eq(settledId);
    expect(idConflictsAt(parent1, 0)).to.eq(undefined);
    expect(canSplit(parent1, 0)).to.eq(true);
  });
});
