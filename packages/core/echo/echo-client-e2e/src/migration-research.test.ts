//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads, type Patch, type SpliceTextPatch } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
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
});
