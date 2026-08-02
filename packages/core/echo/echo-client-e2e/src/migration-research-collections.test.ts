//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { DXN, Filter, Obj, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { createPartitionedPair, headsOf, writesSince } from './migration-bench/harness';

//
// M0 migration research follow-up: verifies the §3 "1->N element identity" resolution recorded in
// `.agents/projects/lenses/M0-REPORT.md` -- splitting `parent.items: Item[]` into a keyed
// `itemsById` map by deriving each key from the FROZEN BASELINE VIEW (`A.view(doc, baselineHeads)`)
// rather than from live array structure, so independently-converting peers derive IDENTICAL keys
// with zero coordination, immune to any concurrent reorder of the live array (spike 1); and that
// late old-schema edits to the retained source array can be folded back to the right keyed entry
// via live-to-baseline correspondence, with genuinely ambiguous cases detected and parked rather
// than silently mis-folded (spike 2). Reuses the migration-bench harness (partition/heal/syncAll);
// otherwise self-contained.
//

class ParentDoc extends Type.makeObject<ParentDoc>(DXN.make('org.dxos.test.migration.collections.ParentDoc', '0.1.0'))(
  Schema.Struct({
    items: Schema.optional(
      Schema.Array(Schema.Struct({ label: Schema.optional(Schema.String), note: Schema.optional(Schema.String) })),
    ),
    itemsById: Schema.optional(
      Schema.Record({
        key: Schema.String,
        value: Schema.Struct({
          label: Schema.optional(Schema.String),
          note: Schema.optional(Schema.String),
          sourceIndex: Schema.optional(Schema.Number),
        }),
      }),
    ),
    order: Schema.optional(Schema.Array(Schema.String)),
  }),
) {}

type ElementContent = { label?: string; note?: string };
type FoldEntry = { key: string; content: ElementContent };
type CorrespondReport = { folds: FoldEntry[]; ambiguous: ElementContent[] };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);
const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number';

/**
 * Navigates `objects.<id>.data.<prop>` -- on the LIVE doc or on a frozen `A.view` of one, the two
 * share the same shape -- with only `unknown` + type guards, never a cast.
 */
const getRawArray = (doc: unknown, objectId: string, prop: string): unknown[] => {
  invariant(isRecord(doc), 'expected an automerge doc');
  const objects = doc.objects;
  invariant(isRecord(objects), 'expected doc.objects');
  const entity = objects[objectId];
  invariant(isRecord(entity), 'expected an entity structure');
  const data = entity.data;
  invariant(isRecord(data), 'expected entity.data');
  const list = data[prop];
  invariant(isUnknownArray(list), 'expected an array property');
  return list;
};

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

/** Reads a raw element's `label`/`note` -- the only shape the local schema's array elements use. */
const readElementContent = (element: unknown): ElementContent => {
  invariant(isRecord(element), 'expected an element struct');
  const { label, note } = element;
  invariant(isOptionalString(label), 'expected label to be a string or undefined');
  invariant(isOptionalString(note), 'expected note to be a string or undefined');
  return { label, note };
};

const contentEquals = (a: ElementContent, b: ElementContent): boolean => a.label === b.label && a.note === b.note;

/** Short stand-in for `<lensId>:<parentId>:<i>` -- this spike only needs distinct, deterministic keys. */
const keyOf = (index: number): string => `k${index}`;

/**
 * The conversion under test: derives every element's key from the FROZEN BASELINE VIEW at
 * `baselineHeads`, never from the live (reorderable) `items` array -- so independently-converting
 * peers derive identical keys with zero coordination, immune to any concurrent reorder. One
 * `Obj.update`, each of the two writes (`itemsById`, `order`) value-compare guarded so a re-run
 * with nothing changed is zero-write.
 */
const convert = (parent: ParentDoc, baselineHeads: Heads): void => {
  const view = A.view(getObjectCore(parent).getDoc(), baselineHeads);
  const baselineContents = getRawArray(view, parent.id, 'items').map(readElementContent);

  Obj.update(parent, (parent) => {
    invariant(parent.itemsById, 'expected the itemsById container to pre-exist (seeded at object creation)');
    baselineContents.forEach((content, index) => {
      invariant(parent.itemsById, 'expected the itemsById container to pre-exist (seeded at object creation)');
      const key = keyOf(index);
      const existing = parent.itemsById[key];
      const next = { label: content.label, note: content.note, sourceIndex: index };
      if (
        existing === undefined ||
        existing.label !== next.label ||
        existing.note !== next.note ||
        existing.sourceIndex !== next.sourceIndex
      ) {
        // A per-key write into the ALREADY-EXISTING map -- never a wholesale container replace --
        // so two peers writing DIFFERENT keys concurrently merge as plain map keys, not a
        // container-level LWW conflict (see the S1 finding on this).
        parent.itemsById[key] = next;
      }
    });

    const nextOrder = baselineContents.map((_, index) => keyOf(index));
    const currentOrder = parent.order;
    const orderChanged =
      currentOrder === undefined ||
      currentOrder.length !== nextOrder.length ||
      nextOrder.some((key, index) => currentOrder[index] !== key);
    if (orderChanged) {
      parent.order = nextOrder;
    }
  });
};

/**
 * Diffs the live doc from `conversionHeads` and classifies changes to the retained `items` array.
 * With NO structural (insert/del) patches on the array itself, index mapping is identity. With
 * structural patches present, del/insert are replayed against a tag array tracking each slot's
 * baseline origin; a freshly-inserted slot resolves to a pure move only when its FINAL live content
 * content-matches an as-yet-unclaimed removed baseline element -- an edit riding along with the
 * same move bakes the content change into that very slot, so it can never content-match the
 * pre-move baseline and is surfaced as ambiguous instead of guessed at.
 */
const correspond = (parent: ParentDoc, conversionHeads: Heads): CorrespondReport => {
  const doc = getObjectCore(parent).getDoc();
  const patches = A.diff(doc, conversionHeads, A.getHeads(doc)).filter((patch) => patch.action !== 'conflict');
  const itemPatches = patches.filter((patch) => patch.path[3] === 'items');

  const baselineItems = getRawArray(A.view(doc, conversionHeads), parent.id, 'items').map(readElementContent);
  const liveItems = getRawArray(doc, parent.id, 'items').map(readElementContent);

  const structural = itemPatches.filter(
    (patch) => patch.path.length === 5 && (patch.action === 'insert' || patch.action === 'del'),
  );

  const folds: FoldEntry[] = [];
  const ambiguous: ElementContent[] = [];

  if (structural.length === 0) {
    // No structural patches: index mapping is identity -- every edited element folds to k<sameIndex>.
    const editedIndices = new Set<number>();
    for (const patch of itemPatches) {
      const index = patch.path[4];
      if (patch.path.length > 5 && isNumber(index)) {
        editedIndices.add(index);
      }
    }
    for (const index of editedIndices) {
      const content = liveItems[index];
      invariant(content !== undefined, 'expected the edited index to still exist');
      folds.push({ key: keyOf(index), content });
    }
    return { folds, ambiguous };
  }

  // Structural patches present: replay del/insert against a tag array tracking each slot's
  // baseline origin (or 'new' for a freshly-inserted slot not yet matched to one).
  type Tag = { kind: 'baseline'; index: number } | { kind: 'new'; id: number };
  const virtual: Tag[] = baselineItems.map((_, index) => ({ kind: 'baseline', index }) as const);
  const pendingRemovals: Tag[] = [];
  let nextNewId = 0;

  for (const patch of structural) {
    const index = patch.path[4];
    invariant(isNumber(index), 'expected a numeric array index on a structural patch');
    if (patch.action === 'del') {
      const length = patch.length ?? 1;
      for (let i = 0; i < length; i++) {
        const [removed] = virtual.splice(index, 1);
        invariant(removed !== undefined, 'expected a tag at the removed index');
        pendingRemovals.push(removed);
      }
    } else if (patch.action === 'insert') {
      const count = patch.values.length;
      for (let i = 0; i < count; i++) {
        virtual.splice(index + i, 0, { kind: 'new', id: nextNewId++ });
      }
    } else {
      invariant(false, 'expected only insert/del patches in the structural set');
    }
  }

  invariant(virtual.length === liveItems.length, 'expected the replayed tag array to align with the live array');

  for (let position = 0; position < virtual.length; position++) {
    const tag = virtual[position];
    if (tag.kind !== 'new') {
      continue;
    }
    const liveContent = liveItems[position];
    invariant(liveContent !== undefined, 'expected live content at every position');
    const matchIndex = pendingRemovals.findIndex(
      (removal) => removal.kind === 'baseline' && contentEquals(baselineItems[removal.index], liveContent),
    );
    if (matchIndex >= 0) {
      const [matched] = pendingRemovals.splice(matchIndex, 1);
      invariant(matched.kind === 'baseline', 'a matched removal is always a baseline tag');
      virtual[position] = matched;
    } else {
      ambiguous.push(liveContent);
    }
  }

  for (let position = 0; position < virtual.length; position++) {
    const tag = virtual[position];
    if (tag.kind !== 'baseline') {
      continue;
    }
    const liveContent = liveItems[position];
    invariant(liveContent !== undefined, 'expected live content at every position');
    if (!contentEquals(baselineItems[tag.index], liveContent)) {
      folds.push({ key: keyOf(tag.index), content: liveContent });
    }
  }

  return { folds, ambiguous };
};

/** Applies decidable folds into `itemsById`, guarded like `convert` so a re-fold with nothing new is zero-write. */
const applyFolds = (parent: ParentDoc, folds: readonly FoldEntry[]): void => {
  Obj.update(parent, (parent) => {
    invariant(parent.itemsById, 'expected the itemsById container to pre-exist (seeded at object creation)');
    for (const { key, content } of folds) {
      const existing = parent.itemsById[key];
      const next = { label: content.label, note: content.note, sourceIndex: existing?.sourceIndex };
      if (existing === undefined || existing.label !== next.label || existing.note !== next.note) {
        // Per-key write into the already-existing map, same rationale as `convert`.
        parent.itemsById[key] = next;
      }
    }
  });
};

const headsEqual = (a: Heads, b: Heads): boolean =>
  a.length === b.length && a.every((head, index) => head === b[index]);

/**
 * Two peers independently `put`-ing the SAME key with equal-valued content stay causally
 * concurrent at that key: reconciling which op is "live" (the `conflict: true` flag surfaced on a
 * later diff) is a background step that can trail the plain head-replication `syncAll` already
 * waits for -- so a diff started before that settles can still see the OTHER branch's full content
 * arrive late. Re-`syncAll` until both peers' heads stop moving, THEN snapshot "before" heads.
 */
const settleSync = async (
  syncAll: (db1: EchoDatabase, db2: EchoDatabase) => Promise<void>,
  db1: EchoDatabase,
  db2: EchoDatabase,
  obj1: ParentDoc,
  obj2: ParentDoc,
): Promise<void> => {
  const requiredStableRounds = 3;
  let previous1 = headsOf(obj1);
  let previous2 = headsOf(obj2);
  let stableRounds = 0;
  for (let attempt = 0; attempt < 30 && stableRounds < requiredStableRounds; attempt++) {
    await syncAll(db1, db2);
    const current1 = headsOf(obj1);
    const current2 = headsOf(obj2);
    if (headsEqual(current1, previous1) && headsEqual(current2, previous2)) {
      stableRounds++;
    } else {
      stableRounds = 0;
    }
    previous1 = current1;
    previous2 = current2;
  }
  invariant(stableRounds >= requiredStableRounds, 'expected both peers to reach stable heads within the retry budget');
};

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryParentById = async (db: EchoDatabase, id: string): Promise<ParentDoc> => {
  let found: ParentDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

describe('migration research: 1->N collection split via keyed-map + baseline-view derivation', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    // Peers must close before the network so replicator teardown runs against a live network.
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('S1a: baseline-view derivation converges identical keyed content across peers despite a concurrent reorder', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [ParentDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(
      Obj.make(ParentDoc, { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], itemsById: {} }),
    );
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryParentById(db2, obj1.id);

    // Migrate-marker moment: both peers record IDENTICAL baseline heads while still connected.
    const baselineHeads1 = headsOf(obj1);
    const baselineHeads2 = headsOf(obj2);
    expect(baselineHeads2).to.deep.eq(baselineHeads1);

    await partition();

    // Peer 2 reorders its LIVE array FIRST -- the killer case for any scheme anchored to live
    // structure -- and only then converts, using the SHARED baseline heads.
    Obj.update(obj2, (obj2) => {
      invariant(obj2.items, 'expected items');
      const [moved] = obj2.items.splice(0, 1);
      obj2.items.push(moved);
    });
    await db2.flush();
    convert(obj2, baselineHeads2);
    await db2.flush();

    // Peer 1 converts without ever reordering: at THIS moment, still partitioned, peer1's live
    // array genuinely differs from peer2's -- proving each conversion saw different live structure.
    expect(obj2.items?.map((item) => item.label)).to.deep.eq(['b', 'c', 'a']);
    expect(obj1.items?.map((item) => item.label)).to.deep.eq(['a', 'b', 'c']);
    convert(obj1, baselineHeads1);
    await db1.flush();

    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => Object.keys(obj1.itemsById ?? {}).length).toBe(3);
    await expect.poll(() => Object.keys(obj2.itemsById ?? {}).length).toBe(3);

    // Post-heal, the shared `items` list is one CRDT list with one converged state on both peers --
    // the reorder op replicates like any other, so both peers now show the SAME (reordered) array.
    await expect.poll(() => obj1.items?.map((item) => item.label)).toEqual(['b', 'c', 'a']);
    expect(obj2.items?.map((item) => item.label)).to.deep.eq(obj1.items?.map((item) => item.label));

    // Yet the derived keyed content and order converge, identically, on both peers: the reorder
    // changed nothing because derivation never read the live array.
    expect(obj1.order).to.deep.eq(['k0', 'k1', 'k2']);
    expect(obj2.order).to.deep.eq(obj1.order);
    expect(obj1.itemsById?.k0?.label).to.eq('a');
    expect(obj1.itemsById?.k1?.label).to.eq('b');
    expect(obj1.itemsById?.k2?.label).to.eq('c');
    expect(obj1.itemsById?.k0?.sourceIndex).to.eq(0);
    expect(obj1.itemsById?.k1?.sourceIndex).to.eq(1);
    expect(obj1.itemsById?.k2?.sourceIndex).to.eq(2);
    expect(obj2.itemsById).to.deep.eq(obj1.itemsById);

    // No merge-engine machinery was involved: a plain automerge map key concurrently `put` from both
    // peers with byte-identical nested content leaves no live `getConflicts` entry once merged.
    const conflictsOnItemsById = A.getConflicts(getRawObjectData(getObjectCore(obj1).getDoc(), obj1.id), 'itemsById');
    // eslint-disable-next-line no-console
    console.log('S1a: getConflicts on `itemsById` after convergence ->', conflictsOnItemsById);
    expect(conflictsOnItemsById).toBeUndefined();
  });

  test('S1b: re-running convert is a zero-write no-op and the converged maps stay stable across an extra sync round', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [ParentDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(
      Obj.make(ParentDoc, { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], itemsById: {} }),
    );
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryParentById(db2, obj1.id);

    const baselineHeads1 = headsOf(obj1);
    const baselineHeads2 = headsOf(obj2);

    await partition();
    convert(obj2, baselineHeads2);
    await db2.flush();
    convert(obj1, baselineHeads1);
    await db1.flush();
    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => Object.keys(obj1.itemsById ?? {}).length).toBe(3);
    await expect.poll(() => Object.keys(obj2.itemsById ?? {}).length).toBe(3);
    expect(obj2.itemsById).to.deep.eq(obj1.itemsById);
    expect(obj2.order).to.deep.eq(obj1.order);

    // Both peers wrote the SAME keys concurrently -- reconciling which op is "live" per key is a
    // background step that can trail plain head-replication, so settle fully before snapshotting
    // "before" heads (see `settleSync`'s doc comment).
    await settleSync(syncAll, db1, db2, obj1, obj2);

    // Idempotence: re-running the SAME conversion on both peers, from the SAME baseline heads,
    // writes nothing -- every value already matches.
    const preRerunHeads1 = headsOf(obj1);
    const preRerunHeads2 = headsOf(obj2);
    convert(obj1, baselineHeads1);
    await db1.flush();
    convert(obj2, baselineHeads2);
    await db2.flush();

    expect(writesSince(obj1, preRerunHeads1)).to.deep.eq([]);
    expect(writesSince(obj2, preRerunHeads2)).to.deep.eq([]);

    // One more sync round-trip: no lingering divergence from the initial concurrent conversions.
    await syncAll(db1, db2);
    expect(obj1.itemsById).to.deep.eq(obj2.itemsById);
    expect(obj1.order).to.deep.eq(obj2.order);
  });

  test('S2a: a clean late edit (no reorder) folds to the right keyed entry on both peers', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [ParentDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(
      Obj.make(ParentDoc, { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], itemsById: {} }),
    );
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryParentById(db2, obj1.id);

    // Both peers convert (per spike 1) so the fold-forward scenario starts from a realistic
    // converged state.
    const baselineHeads1 = headsOf(obj1);
    const baselineHeads2 = headsOf(obj2);
    convert(obj1, baselineHeads1);
    await db1.flush();
    convert(obj2, baselineHeads2);
    await db2.flush();
    await syncAll(db1, db2);
    await expect.poll(() => Object.keys(obj1.itemsById ?? {}).length).toBe(3);
    await expect.poll(() => Object.keys(obj2.itemsById ?? {}).length).toBe(3);

    const conversionHeads = headsOf(obj1);
    expect(headsOf(obj2)).to.deep.eq(conversionHeads);

    await partition();
    // Old-schema-shaped edit, no reorder.
    Obj.update(obj2, (obj2) => {
      invariant(obj2.items, 'expected items');
      invariant(obj2.items[1], 'expected items[1]');
      obj2.items[1].label = 'late edit';
    });
    await db2.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.items?.[1].label).toBe('late edit');

    const report = correspond(obj1, conversionHeads);
    // eslint-disable-next-line no-console
    console.log('S2a: correspond report ->', report);
    expect(report.ambiguous).to.deep.eq([]);
    expect(report.folds).to.deep.eq([{ key: 'k1', content: { label: 'late edit', note: undefined } }]);

    applyFolds(obj1, report.folds);
    await db1.flush();
    await syncAll(db1, db2);

    await expect.poll(() => obj1.itemsById?.k1?.label).toBe('late edit');
    await expect.poll(() => obj2.itemsById?.k1?.label).toBe('late edit');
    expect(obj1.itemsById?.k0?.label).to.eq('a');
    expect(obj1.itemsById?.k2?.label).to.eq('c');
    expect(obj1.itemsById?.k1?.sourceIndex).to.eq(1);

    // Re-fold is zero-write: nothing changed since.
    const preRefoldHeads = headsOf(obj1);
    const refoldReport = correspond(obj1, conversionHeads);
    applyFolds(obj1, refoldReport.folds);
    await db1.flush();
    expect(writesSince(obj1, preRefoldHeads)).to.deep.eq([]);
  });

  test('S2b: a pure move content-matches as decidable, and an edit of a distinct un-moved element still folds', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [ParentDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(
      Obj.make(ParentDoc, { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], itemsById: {} }),
    );
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryParentById(db2, obj1.id);

    const baselineHeads1 = headsOf(obj1);
    const baselineHeads2 = headsOf(obj2);
    convert(obj1, baselineHeads1);
    await db1.flush();
    convert(obj2, baselineHeads2);
    await db2.flush();
    await syncAll(db1, db2);
    await expect.poll(() => Object.keys(obj1.itemsById ?? {}).length).toBe(3);
    await expect.poll(() => Object.keys(obj2.itemsById ?? {}).length).toBe(3);

    const conversionHeads = headsOf(obj1);
    expect(headsOf(obj2)).to.deep.eq(conversionHeads);

    await partition();
    // Move element 'a' (index 0) to the end -- content unchanged -- then, in a SEPARATE update,
    // edit the element that did NOT move (identify it by content, since its index shifted).
    Obj.update(obj2, (obj2) => {
      invariant(obj2.items, 'expected items');
      const [moved] = obj2.items.splice(0, 1);
      obj2.items.push(moved);
    });
    await db2.flush();
    Obj.update(obj2, (obj2) => {
      invariant(obj2.items, 'expected items');
      const target = obj2.items.find((item) => item.label === 'b');
      invariant(target, "expected the un-moved 'b' element to still be present");
      target.label = 'b-edited';
    });
    await db2.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.items?.map((item) => item.label)).toEqual(['b-edited', 'c', 'a']);

    const report = correspond(obj1, conversionHeads);
    // eslint-disable-next-line no-console
    console.log('S2b: correspond report ->', report);

    // If content-matching turns out infeasible in practice this assertion is where it would show up
    // as a failure -- report that as a finding rather than force it; observed: content-matching
    // DOES decide the pure move and the un-moved edit, so nothing is parked.
    expect(report.ambiguous).to.deep.eq([]);
    expect(report.folds).to.deep.eq([{ key: 'k1', content: { label: 'b-edited', note: undefined } }]);

    applyFolds(obj1, report.folds);
    await db1.flush();
    await syncAll(db1, db2);

    await expect.poll(() => obj1.itemsById?.k1?.label).toBe('b-edited');
    await expect.poll(() => obj2.itemsById?.k1?.label).toBe('b-edited');
    // The moved-but-unedited element's entry is untouched: same content, same sourceIndex.
    expect(obj1.itemsById?.k0?.label).to.eq('a');
    expect(obj1.itemsById?.k0?.sourceIndex).to.eq(0);
    expect(obj1.itemsById?.k2?.label).to.eq('c');
  });

  test('S2c: move+edit of the SAME element is ambiguous -- detected, parked, nothing lost', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [ParentDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(
      Obj.make(ParentDoc, { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], itemsById: {} }),
    );
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryParentById(db2, obj1.id);

    const baselineHeads1 = headsOf(obj1);
    const baselineHeads2 = headsOf(obj2);
    convert(obj1, baselineHeads1);
    await db1.flush();
    convert(obj2, baselineHeads2);
    await db2.flush();
    await syncAll(db1, db2);
    await expect.poll(() => Object.keys(obj1.itemsById ?? {}).length).toBe(3);
    await expect.poll(() => Object.keys(obj2.itemsById ?? {}).length).toBe(3);

    const conversionHeads = headsOf(obj1);
    expect(headsOf(obj2)).to.deep.eq(conversionHeads);
    const preConflictK0 = obj1.itemsById?.k0;

    await partition();
    // Move element 'a' (index 0) to the end AND edit ITS OWN label, in the same update -- the
    // content change lands inside the very slot the move creates, so it can never content-match
    // the pre-move baseline.
    Obj.update(obj2, (obj2) => {
      invariant(obj2.items, 'expected items');
      const [moved] = obj2.items.splice(0, 1);
      moved.label = 'a-moved-and-edited';
      obj2.items.push(moved);
    });
    await db2.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.items?.map((item) => item.label)).toEqual(['b', 'c', 'a-moved-and-edited']);

    const report = correspond(obj1, conversionHeads);
    // eslint-disable-next-line no-console
    console.log('S2c: correspond report (ambiguity surfaced for review beats silent mis-folding) ->', report);

    expect(report.ambiguous).to.deep.eq([{ label: 'a-moved-and-edited', note: undefined }]);
    expect(report.folds).to.deep.eq([]);

    const preFoldHeads = headsOf(obj1);
    applyFolds(obj1, report.folds);
    await db1.flush();
    // Nothing was written for the ambiguous element: `k0` keeps its pre-partition value.
    expect(writesSince(obj1, preFoldHeads)).to.deep.eq([]);
    expect(obj1.itemsById?.k0).to.deep.eq(preConflictK0);
    expect(obj1.itemsById?.k0?.label).to.eq('a');

    // Nothing was lost: the late-edited value is present and readable in the retained live array.
    await expect.poll(() => obj1.items?.some((item) => item.label === 'a-moved-and-edited')).toBe(true);
  });
});
