//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads, type Patch, type SpliceTextPatch } from '@automerge/automerge';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { Annotation, DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

//
// M0 research spike: does a "fold-forward" migration survive a partitioned peer's late write to the
// old shape, and can that late write be distinguished from data the migration already consumed?
// See `.agents/projects/lenses/DESIGN.md` §10.3 for the hypothesis under test. This file only
// verifies raw Automerge/ECHO merge semantics — no Lens/Migration machinery is involved. Genuine
// transport-level partition here depends on the `test-replicator.ts` connection-bookkeeping fix.
//

/** Declares both the old and the new shape as optional so no schema validation gets in the way. */
class TaskDoc extends Type.makeObject<TaskDoc>(DXN.make('org.dxos.test.migration.TaskDoc', '0.1.0'))(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    status: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
    done: Schema.optional(Schema.Boolean),
    // Stands in for the annotation a real fold would use to record a semantic conflict (claim 5) —
    // Automerge itself never sees the conflict, so it must be data the application writes.
    conflicts: Schema.optional(Schema.Array(Schema.Struct({ property: Schema.String, theirs: Schema.String }))),
  }),
) {}

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryTaskDoc = async (db: EchoDatabase): Promise<TaskDoc> => {
  let found: TaskDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Query.select(Filter.type(TaskDoc))).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

describe('migration research (M0)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('claim 1a: a concurrent (partitioned) write to a deleted key survives the merge', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(TaskDoc, { title: 'original' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryTaskDoc(db2);
    expect(obj2.id).to.eq(obj1.id);

    // Partition: sever the transport so neither side can observe the other's write.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    Obj.update(obj1, (obj1) => {
      delete obj1.title;
    });
    await db1.flush();
    Obj.update(obj2, (obj2) => {
      obj2.title = 'concurrent write';
    });
    await db2.flush();

    // Heal: reconnect with fresh replicator instances (re-adding removed ones is unexplored/unneeded).
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // Per Automerge semantics a delete only supersedes ops it causally saw; the partitioned peer's
    // `put` is concurrent with the delete, so the put should win the merge on both peers.
    await expect.poll(() => obj1.title).toBe('concurrent write');
    await expect.poll(() => obj2.title).toBe('concurrent write');
  });

  test('claim 1b: a sequential (post-sync) write to a deleted key trivially re-adds it', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(TaskDoc, { title: 'original' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryTaskDoc(db2);

    // Peer 1 deletes, and peer 2 observes the delete before writing (fully synced, no partition).
    Obj.update(obj1, (obj1) => {
      delete obj1.title;
    });
    await db1.flush();
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => obj2.title).toBe(undefined);

    // Old-code client re-adds the key: this write is causally AFTER the delete, so it plainly wins.
    Obj.update(obj2, (obj2) => {
      obj2.title = 're-added by old client';
    });
    await db2.flush();
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db1.updateIndexes();

    await expect.poll(() => obj1.title).toBe('re-added by old client');
    expect(obj2.title).to.eq('re-added by old client');
  });

  test('claim 2: A.diff from recorded migration heads names exactly the late write, not consumed data', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(TaskDoc, { title: 'hello', status: 'in-progress' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryTaskDoc(db2);

    // Partition: sever the transport so peer 2's late write and peer 1's migration are concurrent.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    // Peer 1 "migrates": record heads immediately before the migration writes, then write the new
    // shape while keeping the old properties (claim 1 found deletes are unsafe under partition).
    const core1 = getObjectCore(obj1);
    const migrationHeads: Heads = A.getHeads(core1.getDoc());
    Obj.update(obj1, (obj1) => {
      obj1.name = obj1.title;
      obj1.done = obj1.status === 'done';
    });
    await db1.flush();

    // Peer 2, schema-unaware, keeps writing the old shape while partitioned.
    Obj.update(obj2, (obj2) => {
      obj2.title = 'late edit';
    });
    await db2.flush();
    expect(obj2.title).to.eq('late edit');

    // Heal: reconnect with fresh replicator instances.
    const replicator1b = await network.createReplicator();
    const replicator2b = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1b);
    await peer2.host.addReplicator(Context.default(), replicator2b);
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // `waitUntilHeadsReplicated` settling doesn't guarantee the live proxy has already re-rendered
    // off the merged doc, so poll for the actual content before reading heads off it for the diff.
    await expect.poll(() => obj1.title).toBe('late edit');

    // Re-fetch the doc: automerge docs are immutable snapshots, the merge produced a new one.
    const docAfterHeal = core1.getDoc();
    const headsAfterHeal = A.getHeads(docAfterHeal);
    const patches = A.diff(docAfterHeal, migrationHeads, headsAfterHeal);
    // eslint-disable-next-line no-console
    console.log('claim 2: patches from migrationHeads to headsAfterHeal:', JSON.stringify(patches, null, 2));

    // Property name sits at a fixed path index (3), not at the end: a string write is a `put ''`
    // (Automerge Text is recreated) followed by a `splice` carrying the content, whose path ends in
    // a character offset rather than the property name.
    const propertyNameOf = (patch: Patch): string | undefined => {
      const name = patch.path[3];
      return typeof name === 'string' ? name : undefined;
    };
    const sourceProps = new Set(['title', 'status']);
    const isSourceProp = (patch: Patch): boolean => {
      const name = propertyNameOf(patch);
      return name !== undefined && sourceProps.has(name);
    };
    const isSplicePatch = (patch: Patch): patch is SpliceTextPatch => patch.action === 'splice';
    const sourcePatches = patches.filter(isSourceProp);

    // Only `title` was touched after the migration heads, never `status` (the migration's own reads
    // of `status` are not writes, so they cannot appear as patches here).
    expect(sourcePatches.every((patch) => propertyNameOf(patch) === 'title')).to.eq(true);
    expect(sourcePatches.map((patch) => patch.action)).to.deep.eq(['put', 'splice']);
    const titleSplice = sourcePatches.find(isSplicePatch);
    expect(titleSplice?.value).to.eq('late edit');

    // The migration's own writes show up too, but only under the TARGET paths (`name`, `done`) —
    // never mistaken for source-property patches.
    const targetPatches = patches.filter((patch) => {
      const name = propertyNameOf(patch);
      return name !== undefined && ['name', 'done'].includes(name);
    });
    expect(targetPatches.length).to.be.greaterThan(0);

    // Fold the late write forward: re-derive `name` from the now-current `title`, and record the
    // heads at fold time so a subsequent merge can tell this property has been dealt with.
    Obj.update(obj1, (obj1) => {
      obj1.name = obj1.title;
    });
    await db1.flush();
    const postFoldHeads = A.getHeads(core1.getDoc());

    // Iterate the fold: partition again, peer 2 makes a SECOND late edit, heal, then diff from
    // `postFoldHeads`. The already-folded `'late edit'` must not reappear — only the new edit should,
    // proving the fold advances its stored heads instead of re-consuming what it already folded.
    await peer1.host.removeReplicator(replicator1b);
    await peer2.host.removeReplicator(replicator2b);
    Obj.update(obj2, (obj2) => {
      obj2.title = 'later edit';
    });
    await db2.flush();
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();
    await expect.poll(() => obj1.title).toBe('later edit');

    const secondPassPatches = A.diff(core1.getDoc(), postFoldHeads, A.getHeads(core1.getDoc()));
    const secondPassSourcePatches = secondPassPatches.filter(isSourceProp);
    const secondPassTitleSplice = secondPassSourcePatches.find(isSplicePatch);
    expect(secondPassSourcePatches.every((patch) => propertyNameOf(patch) === 'title')).to.eq(true);
    expect(secondPassTitleSplice?.value).to.eq('later edit');
  });

  test("claim 2 (epoch sub-question): A.diff across an unrelated doc's heads (best-effort)", async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TaskDoc] });
    await using db = await peer.createDatabase();

    const objX = db.add(Obj.make(TaskDoc, { title: 'doc X' }));
    await db.flush();
    const headsFromX = A.getHeads(getObjectCore(objX).getDoc());

    // A fresh object lives in a DIFFERENT automerge doc (single-object-per-doc test databases), which
    // stands in for the doc identity change an epoch re-root would cause.
    const objY = db.add(Obj.make(TaskDoc, { title: 'doc Y' }));
    await db.flush();
    const docY = getObjectCore(objY).getDoc();

    let outcome: { kind: 'threw'; message: string } | { kind: 'returned'; patchCount: number };
    try {
      const patches = A.diff(docY, headsFromX, A.getHeads(docY));
      outcome = { kind: 'returned', patchCount: patches.length };
    } catch (error) {
      outcome = { kind: 'threw', message: error instanceof Error ? error.message : String(error) };
    }
    // eslint-disable-next-line no-console
    console.log('claim 2 epoch sub-question: A.diff on a foreign doc/heads pair ->', outcome);

    // Best-effort observation only: record whichever happened without asserting a hypothesis. A doc
    // that has never seen `headsFromX` cannot be diffed against them as if they were its own history.
    expect(outcome.kind === 'threw' || outcome.kind === 'returned').to.eq(true);
  });

  test('claim 12: a late-created entity, not just a late property write, is noticed and folded forward', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const objA1 = db1.add(Obj.make(TaskDoc, { title: 'hello', status: 'in-progress' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const objA2 = await queryTaskDoc(db2);
    expect(objA2.id).to.eq(objA1.id);

    // Peer 1 "migrates" A (the claim-2 pattern): every object of the old type has now been processed.
    Obj.update(objA1, (objA1) => {
      objA1.name = objA1.title;
      objA1.done = objA1.status === 'done';
    });
    await db1.flush();

    // Partition: sever the transport before peer 2 creates a brand-new old-shape object.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    // Peer 2, schema-unaware, creates an entity the migration never saw: old shape only.
    const objB2 = db2.add(Obj.make(TaskDoc, { title: 'born late' }));
    await db2.flush();

    // Heal: reconnect with fresh replicator instances.
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // (a) Does the late-created entity replicate at all? Poll until both objects are queryable.
    let peer1Objects: TaskDoc[] = [];
    await expect
      .poll(async () => {
        peer1Objects = await db1.query(Query.select(Filter.type(TaskDoc))).run();
        return peer1Objects.length;
      })
      .toBe(2);

    const objB1 = peer1Objects.find((obj) => obj.id === objB2.id);
    invariant(objB1, 'expected the late-created object to replicate to peer 1');
    expect(objB1.title).to.eq('born late');

    // (b) Is it distinguishable from already-migrated objects? A new entity is a new automerge doc —
    // there are no stored migration heads for it, so heads-based detection cannot apply here. Shape
    // is the realistic signal: the migrated object carries the target property, the late one doesn't.
    const migrated = peer1Objects.filter((obj) => obj.name !== undefined);
    const unmigrated = peer1Objects.filter((obj) => obj.name === undefined);
    expect(migrated.map((obj) => obj.id)).to.deep.eq([objA1.id]);
    expect(unmigrated.map((obj) => obj.id)).to.deep.eq([objB1.id]);

    // Probe: does `EntityMeta` offer a place to stamp a per-object migration version (the design
    // wants `EntityMeta.version`)? `Annotation.set`/`EntityMeta.annotations` is the sanctioned way to
    // write into meta from inside `Obj.update`; try it and report what actually happens.
    const MigrationVersionAnnotation = Annotation.make({
      id: 'org.dxos.test.migration.version',
      schema: Schema.Number,
    });
    let stampingOutcome: { kind: 'worked'; value: number } | { kind: 'threw'; message: string };
    try {
      Obj.update(objA1, (objA1) => {
        Annotation.set(objA1, MigrationVersionAnnotation, 1);
      });
      await db1.flush();
      stampingOutcome = { kind: 'worked', value: Option.getOrThrow(Annotation.get(objA1, MigrationVersionAnnotation)) };
    } catch (error) {
      stampingOutcome = { kind: 'threw', message: error instanceof Error ? error.message : String(error) };
    }
    // eslint-disable-next-line no-console
    console.log('claim 12b: EntityMeta annotation stamping probe ->', stampingOutcome);
    expect(stampingOutcome.kind === 'worked' || stampingOutcome.kind === 'threw').to.eq(true);
    if (stampingOutcome.kind === 'worked') {
      // A stamp that doesn't survive sync is useless for fold-forward, so confirm replication too.
      await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
      await db2.updateIndexes();
      await expect.poll(() => Option.getOrElse(Annotation.get(objA2, MigrationVersionAnnotation), () => -1)).toBe(1);
    }

    // (c) Does folding the late entity converge when BOTH peers do it independently? Deterministic
    // minimal writes on both replicas should produce identical changes and merge to one state.
    Obj.update(objB1, (objB1) => {
      objB1.name = objB1.title;
      objB1.done = objB1.status === 'done';
    });
    await db1.flush();
    Obj.update(objB2, (objB2) => {
      objB2.name = objB2.title;
      objB2.done = objB2.status === 'done';
    });
    await db2.flush();

    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    await expect.poll(() => objB1.name).toBe('born late');
    await expect.poll(() => objB2.name).toBe('born late');
    expect(objB1.done).to.eq(false);
    expect(objB2.done).to.eq(false);

    // Re-assert after another sync round-trip: nothing should oscillate.
    await db1.flush();
    await db2.flush();
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();
    expect(objB1.name).to.eq('born late');
    expect(objB2.name).to.eq('born late');
    expect(objB1.done).to.eq(false);
    expect(objB2.done).to.eq(false);
  });

  test('claim 5: a genuine conflict (rename target) surfaces only at the application level, never in Automerge', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(TaskDoc, { title: 'original', status: 'in-progress' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryTaskDoc(db2);

    // Peer 1 migrates (claim-2 pattern), recording heads BOTH before and after its own writes.
    const core1 = getObjectCore(obj1);
    const preMigrationHeads: Heads = A.getHeads(core1.getDoc());
    Obj.update(obj1, (obj1) => {
      obj1.name = obj1.title;
      obj1.done = obj1.status === 'done';
    });
    await db1.flush();
    // Re-fetch the doc: automerge docs are immutable snapshots, the migration produced a new one.
    const postMigrationHeads: Heads = A.getHeads(core1.getDoc());

    // Partition: peer 1's direct edit and peer 2's late edits become concurrent.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    // Peer 1: a user editing THROUGH the new schema.
    Obj.update(obj1, (obj1) => {
      obj1.name = 'direct edit';
    });
    await db1.flush();

    // Peer 2: an old-schema client, still writing `title` (renamed target) and `status` (same-named
    // target `done`) while partitioned.
    Obj.update(obj2, (obj2) => {
      obj2.title = 'late edit';
      obj2.status = 'done';
    });
    await db2.flush();

    // Heal: reconnect with fresh replicator instances.
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // Automerge merges both silently: `title` and `name` are DIFFERENT keys, so no CRDT conflict ever
    // fires here — this is exactly the problem the fold has to detect for itself.
    await expect.poll(() => obj1.title).toBe('late edit');
    await expect.poll(() => obj1.name).toBe('direct edit');
    expect(obj1.status).to.eq('done');

    const docAfterHeal = core1.getDoc();
    const headsAfterHeal = A.getHeads(docAfterHeal);

    // Property name sits at a fixed path index (3): see claim 2 for why.
    const propertyNameOf = (patch: Patch): string | undefined => {
      const name = patch.path[3];
      return typeof name === 'string' ? name : undefined;
    };
    const sourceProps = new Set(['title', 'status']);
    const targetProps = new Set(['name', 'done']);

    // 1. Late source writes: diff from PRE-migration heads. Fine to reuse pre-migration heads for the
    // source filter because the migration itself never writes source properties.
    const sourcePatches = A.diff(docAfterHeal, preMigrationHeads, headsAfterHeal).filter((patch) => {
      const name = propertyNameOf(patch);
      return name !== undefined && sourceProps.has(name);
    });
    const lateSourceProps = new Set(
      sourcePatches.map(propertyNameOf).filter((name): name is string => name !== undefined),
    );
    expect([...lateSourceProps].sort()).to.deep.eq(['status', 'title']);

    // 2. Conflict detection: diff from POST-migration heads, restricted to TARGET properties, so the
    // migration's own target writes are excluded — only a DIRECT edit since the migration remains.
    const targetPatches = A.diff(docAfterHeal, postMigrationHeads, headsAfterHeal).filter((patch) => {
      const name = propertyNameOf(patch);
      return name !== undefined && targetProps.has(name);
    });
    const directlyEditedTargets = new Set(
      targetPatches.map(propertyNameOf).filter((name): name is string => name !== undefined),
    );
    expect([...directlyEditedTargets]).to.deep.eq(['name']);

    // 3. Fold: `title` maps to `name` and both changed since the migration -> semantic conflict, do
    // NOT overwrite `name`, record the conflict as data instead. `status` maps to `done` (same-named
    // pattern) and `done` was never directly edited -> folds through cleanly, no conflict record.
    const conflicts: Array<{ property: string; theirs: string }> = [];
    Obj.update(obj1, (obj1) => {
      if (lateSourceProps.has('title')) {
        if (directlyEditedTargets.has('name')) {
          conflicts.push({ property: 'name', theirs: obj1.title ?? '' });
        } else {
          obj1.name = obj1.title;
        }
      }
      if (lateSourceProps.has('status') && !directlyEditedTargets.has('done')) {
        obj1.done = obj1.status === 'done';
      }
      obj1.conflicts = conflicts;
    });
    await db1.flush();

    // Winner not clobbered, loser not erased, conflict recorded, non-conflicting fold went through.
    expect(obj1.name).to.eq('direct edit');
    expect(obj1.title).to.eq('late edit');
    expect(obj1.done).to.eq(true);
    expect(obj1.conflicts).to.deep.eq([{ property: 'name', theirs: 'late edit' }]);

    // The conflict record must replicate: it is the only trace that a decision is still pending.
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => obj2.conflicts?.length).toBe(1);
    expect(obj2.conflicts).to.deep.eq([{ property: 'name', theirs: 'late edit' }]);
    expect(obj2.done).to.eq(true);
  });
});
