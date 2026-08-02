//
// Copyright 2026 DXOS.org
//

import {
  next as A,
  type Doc as AutomergeDoc,
  type ChangeOptions,
  type Conflicts,
  type Heads,
} from '@automerge/automerge';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { type EchoDatabase, checkoutVersion, getEditHistoryWithDiffs } from '@dxos/echo-client';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { setDeep } from '@dxos/util';

import { type PartitionedPair, PersonDoc, createPartitionedPair, foldValue, headsOf } from './harness';

//
// M0 migration research follow-up: verifies the directive in `.agents/projects/lenses/DESIGN.md`
// §10.3/§10.6 to make a fold's semantic conflict browsable via AUTOMERGE HISTORY itself instead of an
// app-level shadow record. The move: write the fold via `changeAt` at the recorded migration heads, so
// the rekeyed late write lands concurrent with any direct edit since -- a real CRDT conflict, durable
// in the op DAG. Reuses the shared harness (partition/heal/syncAll, `PersonDoc`) but is
// otherwise self-contained; `checkoutVersion` is only used to log a value, never asserted against, so
// its import is load-bearing for the history-walk narration, not the claims.
//

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Navigates `objects.<id>.data`, the sub-object `A.getConflicts` needs -- passing the root doc or the
 * bare entity structure returns `undefined` instead of the conflict map (the first working invocation
 * shape for `A.getConflicts` through ECHO's doc structure, established by this file).
 */
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
const conflictsOn = (obj: PersonDoc, prop: string): Conflicts | undefined =>
  A.getConflicts(getRawObjectData(getObjectCore(obj).getDoc(), obj.id), prop);

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

/**
 * H1's central move, reused by every test that needs a live rename conflict: migrate causally
 * (`fullName` -> `name`), partition, let peer2 write `fullName` late and peer1 write `name` directly
 * (both merge silently -- different keys, per DESIGN.md claim 5), then fold NOT causally but via
 * `changeAt` at the recorded migration heads. Re-keying the late value onto `name` there places it
 * concurrent with the direct edit, so automerge's own conflict machinery engages instead of a silent
 * overwrite. Returns the heads recorded just before the fold, so callers can inspect history around it.
 */
const buildRenameConflict = async (
  pair: PartitionedPair,
  db1: EchoDatabase,
  db2: EchoDatabase,
  obj1: PersonDoc,
  obj2: PersonDoc,
  foldOptions?: ChangeOptions<unknown>,
): Promise<Heads> => {
  const { partition, heal, syncAll } = pair;

  Obj.update(obj1, (obj1) => {
    foldValue(obj1, 'fullName', 'name');
  });
  await db1.flush();
  const postMigrationHeads = headsOf(obj1);

  await partition();
  Obj.update(obj2, (obj2) => {
    obj2.fullName = 'late';
  });
  await db2.flush();
  Obj.update(obj1, (obj1) => {
    obj1.name = 'direct';
  });
  await db1.flush();

  await heal();
  await syncAll(db1, db2);
  await expect.poll(() => obj1.fullName).toBe('late');
  await expect.poll(() => obj1.name).toBe('direct');

  // The fold: re-key the late `fullName` value onto `name` at the recorded migration heads, instead
  // of writing causally-downstream -- this is the entire hypothesis under test.
  const accessor = getObjectCore(obj1).getDocAccessor(['name']);
  accessor.handle.changeAt(
    postMigrationHeads,
    (doc: AutomergeDoc<unknown>) => {
      setDeep(doc, accessor.path.slice(), 'late');
    },
    foldOptions,
  );
  await db1.flush();

  return postMigrationHeads;
};

describe('migration research: history-native conflicts (changeAt)', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    // Peers must close before the network so replicator teardown runs against a live network -- and
    // this ordering must hold on the assertion-failure path too, which an in-test `await using
    // network` cannot guarantee.
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('H1: fold-at-heads materializes a real CRDT conflict on `name` for the rename case', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1, peer2 } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { fullName: 'original' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonById(db2, obj1.id);

    await buildRenameConflict(pair, db1, db2, obj1, obj2);

    // (c) ECHO's reactive proxy notices the `changeAt`-driven write like any other mutation -- poll,
    // don't read synchronously, to rule out a reactivity bypass.
    await expect.poll(() => obj1.name).toEqual(expect.stringMatching(/^(direct|late)$/));
    const presentedWinner1 = obj1.name;
    // eslint-disable-next-line no-console
    console.log('H1: presented winner on peer1 ->', presentedWinner1);

    // (a) both op-ids for `name` are live: the direct edit and the fold's rekeyed late write.
    const conflicts1 = conflictsOn(obj1, 'name');
    // eslint-disable-next-line no-console
    console.log('H1: conflicts on peer1 ->', conflicts1);
    invariant(conflicts1, 'expected a live conflict on `name`');
    expect(Object.keys(conflicts1).length).to.eq(2);
    expect(Object.values(conflicts1).sort()).to.deep.eq(['direct', 'late']);

    // (b) the presented value is one of the two -- recorded above, not asserted as a specific one:
    // the tie-break is between two same-actor concurrent ops and is not this test's claim to make.
    expect(['direct', 'late']).to.include(presentedWinner1);

    // (d) after sync, peer2 converges on the SAME conflict set and the SAME presented winner -- a
    // merged register is a pure function of the op set, so both peers must agree.
    await pair.syncAll(db1, db2);
    // Poll on key COUNT, not mere definedness: a peer's own just-applied op can take an extra tick to
    // replicate outward, so an immediate read of the other peer can race a still-in-flight change.
    await expect.poll(() => Object.keys(conflictsOn(obj2, 'name') ?? {}).length).toBe(Object.keys(conflicts1).length);
    const conflicts2 = conflictsOn(obj2, 'name');
    expect(conflicts2).to.deep.eq(conflicts1);
    await expect.poll(() => obj2.name).toBe(presentedWinner1);
  });

  test('H2: the conflict is browsable at a historical view (via an independent clone) and findable in a history walk with zero migration knowledge', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1, peer2 } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { fullName: 'original' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonById(db2, obj1.id);

    await buildRenameConflict(pair, db1, db2, obj1, obj2);
    await expect.poll(() => obj1.name).toEqual(expect.stringMatching(/^(direct|late)$/));

    const conflictFrontier = A.getHeads(getObjectCore(obj1).getDoc());
    const liveConflicts = conflictsOn(obj1, 'name');
    invariant(liveConflicts, 'expected a live conflict to snapshot before resolving it');

    // `A.view` shares the SOURCE doc's underlying handle rather than taking an independent snapshot:
    // a further change on the live doc (the resolution write below) silently empties `getConflicts`
    // on a view taken directly from it, even though the view's plain VALUE reads stay frozen
    // correctly. Cloning first gives an independent handle the resolution write cannot invalidate --
    // this is the working answer to the unverified getConflicts-on-view question.
    const frozenForHistory = A.clone(getObjectCore(obj1).getDoc());

    // Resolve with a genuinely NEW value (neither conflicting side) so the write is unambiguously a
    // real causal change, not an equal-value no-op whose effect on the conflict would be unclear.
    Obj.update(obj1, (obj1) => {
      obj1.name = 'resolved';
    });
    await db1.flush();
    await expect.poll(() => obj1.name).toBe('resolved');

    // (a) the conflict is cleared on the CURRENT doc.
    expect(conflictsOn(obj1, 'name')).toBeUndefined();

    // (b) the conflict remains fully reviewable from the clone-derived snapshot at the frontier --
    // permanently reviewable from history alone, with no migration-specific bookkeeping.
    const historicalConflicts = A.getConflicts(
      getRawObjectData(A.view(frozenForHistory, conflictFrontier), obj1.id),
      'name',
    );
    // eslint-disable-next-line no-console
    console.log('H2: conflicts at the frozen historical view ->', historicalConflicts);
    expect(historicalConflicts).to.deep.eq(liveConflicts);

    // Sanity: a plain historical value reconstruction (no conflict awareness) still resolves to the
    // SAME presented winner recorded at the frontier -- `checkoutVersion` is unaffected by the
    // clone-vs-live-view distinction above since it never calls `getConflicts`.
    const historicalSnapshot = checkoutVersion(obj1, conflictFrontier);
    // eslint-disable-next-line no-console
    console.log('H2: checkoutVersion at the conflict frontier ->', historicalSnapshot);

    // (c) an existing history browser finds the conflict moment with ZERO migration-specific
    // knowledge: `getEditHistoryWithDiffs`'s own heads sequence, re-diffed pairwise, surfaces a `put`
    // patch flagged `conflict: true` (or a bare `ConflictPatch`) on the version where the fold landed.
    const versions = getEditHistoryWithDiffs(obj1);
    const doc = getObjectCore(obj1).getDoc();
    let before: Heads = [];
    let conflictVersionFound = false;
    for (const version of versions) {
      const patches = A.diff(doc, before, version.heads);
      const flagged = patches.some(
        (patch) => patch.action === 'conflict' || (patch.action === 'put' && patch.conflict === true),
      );
      if (flagged) {
        conflictVersionFound = true;
        // eslint-disable-next-line no-console
        console.log('H2: conflict-flagged version ->', {
          time: version.time,
          actor: version.actor,
          message: version.message,
          patches,
        });
      }
      before = version.heads;
    }
    expect(conflictVersionFound).to.eq(true);
  });

  test('H3: fold attribution via changeAt options.message surfaces in getEditHistoryWithDiffs on both peers', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1, peer2 } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { fullName: 'original' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonById(db2, obj1.id);

    const foldMessage = 'fold:org.example.split-address@2';
    await buildRenameConflict(pair, db1, db2, obj1, obj2, { message: foldMessage, time: 0 });
    await expect.poll(() => obj1.name).toEqual(expect.stringMatching(/^(direct|late)$/));

    const findFoldVersion = (obj: PersonDoc) =>
      getEditHistoryWithDiffs(obj).find((version) => version.message === foldMessage);

    const foldVersion1 = findFoldVersion(obj1);
    invariant(foldVersion1, "expected the fold's message to surface in peer1's history");
    expect(foldVersion1.time).to.eq(0);

    await pair.syncAll(db1, db2);
    await expect.poll(() => findFoldVersion(obj2)).toBeDefined();
    const foldVersion2 = findFoldVersion(obj2);
    invariant(foldVersion2, "expected the fold's message to replicate to peer2's history too");
    expect(foldVersion2.message).to.eq(foldMessage);
    expect(foldVersion2.time).to.eq(0);
  });

  test('H4a: both peers independently folding at the SAME heads converge on one presented winner (shape of the conflict set reported, not assumed)', async () => {
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

    // Migrate while still connected so both peers record the IDENTICAL heads for the fold.
    Obj.update(obj1, (obj1) => {
      foldValue(obj1, 'fullName', 'name');
    });
    await db1.flush();
    await syncAll(db1, db2);
    await expect.poll(() => obj2.name).toBe('original');
    const postMigrationHeads1 = headsOf(obj1);
    const postMigrationHeads2 = headsOf(obj2);
    expect(postMigrationHeads2).to.deep.eq(postMigrationHeads1);

    await partition();
    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'late';
    });
    await db2.flush();
    Obj.update(obj1, (obj1) => {
      obj1.name = 'direct';
    });
    await db1.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.fullName).toBe('late');
    await expect.poll(() => obj1.name).toBe('direct');
    await expect.poll(() => obj2.fullName).toBe('late');
    await expect.poll(() => obj2.name).toBe('direct');

    await partition();
    // Both peers independently fold the SAME late value at the SAME recorded heads, each with its
    // own default (random) actor -- deterministic derivation, non-deterministic authorship.
    const accessor1 = getObjectCore(obj1).getDocAccessor(['name']);
    accessor1.handle.changeAt(postMigrationHeads1, (doc: AutomergeDoc<unknown>) => {
      setDeep(doc, accessor1.path.slice(), 'late');
    });
    await db1.flush();
    const accessor2 = getObjectCore(obj2).getDocAccessor(['name']);
    accessor2.handle.changeAt(postMigrationHeads2, (doc: AutomergeDoc<unknown>) => {
      setDeep(doc, accessor2.path.slice(), 'late');
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => obj1.name !== undefined && obj1.name === obj2.name).toBe(true);
    // eslint-disable-next-line no-console
    console.log('H4a: converged presented winner ->', obj1.name);

    // Poll for the conflict SETS to converge, not merely their counts: each peer transiently holds
    // {direct, its-own-fold} — same count, different fold op-ids — until the third concurrent op
    // arrives, so a count-based poll passes before op-id-level convergence.
    const normalized = (conflicts: Conflicts | undefined): string =>
      JSON.stringify(Object.entries(conflicts ?? {}).sort(([a], [b]) => a.localeCompare(b)));
    await expect
      .poll(() => {
        const a = conflictsOn(obj1, 'name');
        const b = conflictsOn(obj2, 'name');
        return a !== undefined && b !== undefined && normalized(a) === normalized(b);
      })
      .toBe(true);
    const conflicts1 = conflictsOn(obj1, 'name');
    invariant(conflicts1, 'expected a live conflict on `name`');
    // eslint-disable-next-line no-console
    console.log('H4a: conflict set shape ->', conflicts1);
    const conflicts2 = conflictsOn(obj2, 'name');
    expect(conflicts2).to.deep.eq(conflicts1);

    // Report the shape rather than assume it: two independently-authored folds of the SAME value can
    // appear as two distinct op-ids in the conflict set even though their VALUES read identically --
    // noise an attribution UI would need to collapse.
    const values = Object.values(conflicts1);
    expect(values).to.include('direct');
    expect(values.filter((value) => value === 'late').length).to.be.greaterThan(0);
  });

  test('H4b: actor-controlled fold via A.clone + changeAt + merge-back through ECHO -- probing the only merge path a docHandle exposes', async () => {
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
      foldValue(obj1, 'fullName', 'name');
    });
    await db1.flush();
    const postMigrationHeads = headsOf(obj1);

    await partition();
    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'late';
    });
    await db2.flush();
    Obj.update(obj1, (obj1) => {
      obj1.name = 'direct';
    });
    await db1.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.fullName).toBe('late');
    await expect.poll(() => obj1.name).toBe('direct');

    // Per-change actor control does not exist through ECHO's `Doc.Handle`/`ObjectCore.changeAt` --
    // there is no `actor` option anywhere on that path. `ObjectCore.docHandle` is public, though, and
    // its ONLY doc-level merge primitive is `update(doc => Doc)`; there is no `DocHandle#merge` for a
    // bare Automerge doc (that method takes another `DocHandle`), so the merge itself has to happen
    // via `A.merge` inside that callback -- the dance the task set out to probe, and it DOES work.
    const core = getObjectCore(obj1);
    invariant(core.docHandle, 'expected a live docHandle to probe the merge-back path through');
    const allZeroActor = '00'.repeat(16);

    // PITFALL, verified rather than assumed: cloning the LIVE (current) doc inherits its op-counter
    // bookkeeping, which already reflects the direct edit -- the fold's new op then gets a HIGHER
    // counter than the direct edit's REGARDLESS of actor, so counter dominance decides the tie before
    // actor comparison is ever reached, and the fold wins even with an all-zeros actor.
    const naiveClone = A.clone(core.getDoc(), { actor: allZeroActor });
    const { newDoc: naiveFoldedClone } = A.changeAt(naiveClone, postMigrationHeads, (doc) => {
      setDeep(doc, ['objects', obj1.id, 'data', 'name'], 'late');
    });
    const naiveMerged = A.merge(A.clone(core.getDoc()), naiveFoldedClone);
    const naiveWinner = getRawObjectData(naiveMerged, obj1.id).name;
    // eslint-disable-next-line no-console
    console.log('H4b: naive clone-from-CURRENT winner (expected to be the FOLD, not the user) ->', naiveWinner);
    expect(naiveWinner).to.eq('late');

    // THE FIX: fork from a VIEW at the recorded migration heads -- a snapshot a real fold-forward
    // runner already has by construction -- so the new op's counter is derived from THAT older state
    // and TIES with the direct edit's, letting actor comparison decide the tie as intended.
    const viewAtMigrationHeads = A.view(core.getDoc(), postMigrationHeads);
    const controlledClone = A.clone(viewAtMigrationHeads, { actor: allZeroActor });
    const { newDoc: foldedClone } = A.changeAt(controlledClone, postMigrationHeads, (doc) => {
      setDeep(doc, ['objects', obj1.id, 'data', 'name'], 'late');
    });

    core.docHandle.update((doc) => A.merge(doc, foldedClone));
    await db1.flush();

    await expect.poll(() => conflictsOn(obj1, 'name')).toBeDefined();
    const conflicts = conflictsOn(obj1, 'name');
    invariant(conflicts, 'expected a live conflict after the merge-back');
    // eslint-disable-next-line no-console
    console.log('H4b: conflicts after actor-controlled merge-back ->', conflicts);
    expect(Object.values(conflicts).sort()).to.deep.eq(['direct', 'late']);

    // The tie-break: the all-zeros actor is the lexicographically lowest possible actor id, and now
    // its op TIES on counter with the direct edit's, so it deterministically LOSES -- the user's
    // direct edit stays the presented winner: "user beats migration by default, conflict browsable".
    // eslint-disable-next-line no-console
    console.log('H4b: presented winner (fork-from-recorded-heads) ->', obj1.name);
    expect(obj1.name).to.eq('direct');

    await syncAll(db1, db2);
    await expect.poll(() => obj2.name).toBe('direct');
    await expect.poll(() => Object.keys(conflictsOn(obj2, 'name') ?? {}).length).toBe(Object.keys(conflicts).length);
    expect(conflictsOn(obj2, 'name')).to.deep.eq(conflicts);
  });

  test('H5: same-key fan-in conflicts are ALREADY history-native -- changeAt is only needed to manufacture concurrency for renames, not for a plain same-key clash', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonDoc, { status: 'pending' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonById(db2, obj1.id);

    await partition();
    Obj.update(obj1, (obj1) => {
      obj1.status = 'peer1-choice';
    });
    await db1.flush();
    Obj.update(obj2, (obj2) => {
      obj2.status = 'peer2-choice';
    });
    await db2.flush();
    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => obj1.status !== undefined && obj1.status === obj2.status).toBe(true);

    // Poll rather than read synchronously: the reactive proxy value can settle a tick before the raw
    // doc's conflict bookkeeping is queried directly through `getObjectCore`.
    await expect.poll(() => conflictsOn(obj1, 'status')).toBeDefined();
    const conflicts1 = conflictsOn(obj1, 'status');
    invariant(conflicts1, 'expected a live same-key conflict with zero changeAt involvement');
    // eslint-disable-next-line no-console
    console.log('H5: conflicts on `status` ->', conflicts1);
    expect(Object.values(conflicts1).sort()).to.deep.eq(['peer1-choice', 'peer2-choice']);

    const conflictFrontier = A.getHeads(getObjectCore(obj1).getDoc());
    // Clone first, per H2's finding, so the resolution write below cannot invalidate this snapshot.
    const frozenForHistory = A.clone(getObjectCore(obj1).getDoc());

    Obj.update(obj1, (obj1) => {
      obj1.status = 'declared-resolution';
    });
    await db1.flush();
    expect(conflictsOn(obj1, 'status')).toBeUndefined();

    const historicalConflicts = A.getConflicts(
      getRawObjectData(A.view(frozenForHistory, conflictFrontier), obj1.id),
      'status',
    );
    // eslint-disable-next-line no-console
    console.log('H5: conflicts at the frozen pre-resolution view ->', historicalConflicts);
    expect(historicalConflicts).to.deep.eq(conflicts1);
  });
});
