//
// Copyright 2026 DXOS.org
//

import {
  next as A,
  type Doc as AutomergeDoc,
  type DelPatch,
  type Heads,
  type Patch,
  type SpliceTextPatch,
} from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { DXN, Filter, Obj, Type } from '@dxos/echo';
import { updateText } from '@dxos/echo-client';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  type TestDatabase,
  createPartitionedPair,
  diffSince,
  headsOf,
  propertyNameOf,
  writesSince,
} from './harness.ts';

//
// M0 migration research follow-up: item 2 of the M0 research plan (collaborative text, DESIGN.md
// open item "Collaborative-text"). Tests hypothesis (a) -- text fold-forward via `changeAt` replay
// of `A.diff` splice/del patches -- and hypothesis (b) -- text across fan-out duplicates, replaying
// the loser's text edits onto the winner. See `.agents/projects/lenses/M0-REPORT.md` "The final
// design" 1, 4, 6. Self-contained; reuses the shared harness (partition/heal/syncAll, heads/diff
// helpers) but establishes its own text-specific idioms here.
//

/** A single object with an old (`body`) and new (`content`) string property, for the rename case. */
class NoteDoc extends Type.makeObject<NoteDoc>(DXN.make('org.dxos.test.migration.bench.NoteDoc', '0.1.0'))(
  Schema.Struct({
    body: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
  }),
) {}

/** A fan-out-minted duplicate carrying one collaborative text field, for the duplicate-merge case. */
class DuplicateNoteDoc extends Type.makeObject<DuplicateNoteDoc>(
  DXN.make('org.dxos.test.migration.bench.DuplicateNoteDoc', '0.1.0'),
)(
  Schema.Struct({
    content: Schema.optional(Schema.String),
    sourceId: Schema.optional(Schema.String),
  }),
) {}

const isTextPatch = (patch: Patch): patch is SpliceTextPatch | DelPatch =>
  patch.action === 'splice' || patch.action === 'del';

/** Late splice/del patches on `prop`, in diff order -- the fold-forward replay's raw input. */
const lateTextPatches = <T extends { id: string }>(
  obj: T,
  sinceHeads: Heads,
  prop: string,
): (SpliceTextPatch | DelPatch)[] =>
  diffSince(obj, sinceHeads).filter(
    (patch): patch is SpliceTextPatch | DelPatch => isTextPatch(patch) && propertyNameOf(patch) === prop,
  );

/**
 * Replays sequential splice/del patches onto `targetPath` inside a `changeAt` callback. Each
 * patch's trailing path element is a character offset already relative to the state left by the
 * PREVIOUS patch in the same list (per harness: patches are sequential, not independently based on
 * the pre-diff state) -- so applying them in order, unmodified, reproduces the source edit exactly.
 */
const replayTextPatches = (
  doc: AutomergeDoc<unknown>,
  targetPath: (string | number)[],
  patches: readonly (SpliceTextPatch | DelPatch)[],
): void => {
  for (const patch of patches) {
    const offset = patch.path.at(-1);
    invariant(typeof offset === 'number', 'expected a text patch path to end in a numeric character offset');
    if (patch.action === 'splice') {
      A.splice(doc, targetPath, offset, 0, patch.value);
    } else {
      A.splice(doc, targetPath, offset, patch.length ?? 1);
    }
  }
};

/**
 * The fold-forward step under test: replays `prop`'s late patches (since `checkpointHeads`) onto
 * `targetPath`, forked at `forkHeads` -- so the CRDT merges the replay with whatever concurrent
 * edits the target has received since, character-wise, instead of a whole-value overwrite
 * clobbering them. `forkHeads` starts at the migration boundary (where target's value equals
 * source's value) but MUST advance to the heads this call itself produces (the return value) for
 * the NEXT call: that frontier's target value is, by construction, exactly source's value at
 * `checkpointHeads` -- the base the NEXT batch's patch offsets are relative to. Re-forking from the
 * ORIGINAL migration boundary on every call is a bug this bench hit directly: once any patches have
 * been replayed, the source has moved on past what the original boundary's target text represents,
 * so later offsets land out of bounds (verified: `RangeError: index N is out of bounds`). Returns
 * whether it wrote, and the new checkpoint/fork (only advanced on an actual write) -- an unmoved
 * checkpoint is the detection a second run with nothing new is a no-op.
 */
const foldTextForward = <T extends { id: string }>(
  obj: T,
  sourceProp: string,
  targetPath: (string | number)[],
  checkpointHeads: Heads,
  forkHeads: Heads,
): { wrote: boolean; checkpoint: Heads; forkHeads: Heads } => {
  const patches = lateTextPatches(obj, checkpointHeads, sourceProp);
  if (patches.length === 0) {
    return { wrote: false, checkpoint: checkpointHeads, forkHeads };
  }
  const accessor = getObjectCore(obj).getDocAccessor(targetPath);
  const newForkHeads = accessor.handle.changeAt(forkHeads, (doc: AutomergeDoc<unknown>) => {
    replayTextPatches(doc, accessor.path.slice(), patches);
  });
  invariant(newForkHeads, 'expected changeAt to produce new heads for a non-empty replay');
  return { wrote: true, checkpoint: headsOf(obj), forkHeads: newForkHeads };
};

/**
 * Navigates `objects.<id>.data`, the same sub-object `conflicts.test.ts` uses for `A.getConflicts`
 * -- reused here to read a property's value at a historical view rather than the live proxy.
 */
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const dataAt = (doc: unknown, objectId: string): Record<string, unknown> => {
  invariant(isRecord(doc), 'expected an automerge doc');
  const objects = doc.objects;
  invariant(isRecord(objects), 'expected doc.objects');
  const entity = objects[objectId];
  invariant(isRecord(entity), 'expected an entity structure');
  const data = entity.data;
  invariant(isRecord(data), 'expected entity.data');
  return data;
};

/** The value of `prop` as it stood at `heads`, read from an independent clone (never a live view). */
const textValueAt = <T extends { id: string }>(obj: T, heads: Heads, prop: string): unknown => {
  const clone = A.clone(getObjectCore(obj).getDoc());
  return dataAt(A.view(clone, heads), obj.id)[prop];
};

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryById = async <T extends Type.AnyEntity>(
  db: TestDatabase,
  type: T,
  id: string,
): Promise<Type.InstanceType<T>> => {
  let found: Type.InstanceType<T> | undefined;
  await expect
    .poll(async () => {
      const results = await db.query(Filter.type(type)).run();
      found = results.find((candidate) => candidate.id === id);
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

describe('T-a: text fold-forward via changeAt (hypothesis a)', () => {
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

  test('Ta0: an empty-target migration copy produces the SAME patches via plain assignment and via `updateText` -- the distinction only matters once the target already has content', async () => {
    await using peer = await builder.createPeer({ types: [NoteDoc] });
    await using db = await peer.createDatabase();

    const viaAssignment = db.add(Obj.make(NoteDoc, { body: 'Hello world' }));
    await db.flush();
    const preAssign = headsOf(viaAssignment);
    Obj.update(viaAssignment, (viaAssignment) => {
      viaAssignment.content = viaAssignment.body;
    });
    await db.flush();
    const assignPatches = diffSince(viaAssignment, preAssign).filter((patch) => propertyNameOf(patch) === 'content');

    const viaUpdateText = db.add(Obj.make(NoteDoc, { body: 'Hello world' }));
    await db.flush();

    // Surprise, verified rather than assumed: `A.updateText`/`updateText` CANNOT create a field from
    // nothing -- it diffs against the CURRENT value, which requires an existing Text container at
    // that path, and throws when there isn't one yet ("path component ... referenced a nonexistent
    // object"). A migration's very FIRST copy into an empty target therefore has no choice but a
    // plain assignment (or seeding with `''` first); `updateText` only applies to a field the target
    // already holds SOME value for.
    expect(() => updateText(viaUpdateText, ['content'], viaUpdateText.body ?? '')).toThrow(/nonexistent object/);

    // Seed the container first (itself a plain assignment, unavoidably), THEN use `updateText` for
    // the actual copy -- the two-step equivalent of the one-step plain assignment above.
    const preSeed = headsOf(viaUpdateText);
    Obj.update(viaUpdateText, (viaUpdateText) => {
      viaUpdateText.content = '';
    });
    await db.flush();
    updateText(viaUpdateText, ['content'], viaUpdateText.body ?? '');
    await db.flush();
    const updateTextPatches = diffSince(viaUpdateText, preSeed).filter((patch) => propertyNameOf(patch) === 'content');

    // eslint-disable-next-line no-console
    console.log('Ta0: plain-assignment patches ->', assignPatches);
    // eslint-disable-next-line no-console
    console.log('Ta0: seed + updateText patches ->', updateTextPatches);

    // Both end up as a Text-container recreate (`put ''`) plus ONE splice inserting the whole value
    // -- diffing against nothing (an empty/undefined target) degenerates to a full insert either
    // way, so for the MIGRATION'S OWN initial copy the method is interchangeable (mechanically; the
    // seed+updateText form just splits the same two ops across two changes instead of one). It stops
    // being interchangeable the moment the target already holds a DIFFERENT value (Ta2 below):
    // `updateText`/`A.updateText` diffs against the CURRENT value and emits a minimal delta, while a
    // plain assignment always recreates the whole Text object -- destroying its identity and any
    // anchors/cursors into it, even when the values end up equal.
    expect(assignPatches.map((patch) => patch.action)).to.deep.eq(['put', 'splice']);
    expect(updateTextPatches.map((patch) => patch.action)).to.deep.eq(['put', 'splice']);
    const assignSplice = assignPatches.find((patch): patch is SpliceTextPatch => patch.action === 'splice');
    const updateTextSplice = updateTextPatches.find((patch): patch is SpliceTextPatch => patch.action === 'splice');
    expect(assignSplice?.value).to.eq('Hello world');
    expect(updateTextSplice?.value).to.eq('Hello world');
  });

  test('Ta1: fold-forward replays late `body` splices onto `content` via changeAt, merging with a concurrent direct `content` edit character-wise; a no-op re-run and a second late edit are both handled by an advancing checkpoint', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [NoteDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(NoteDoc, { body: 'Hello world' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryById(db2, NoteDoc, obj1.id);

    // Migrate: copy body -> content (target is empty, so per Ta0 either method is equivalent here).
    Obj.update(obj1, (obj1) => {
      obj1.content = obj1.body;
    });
    await db1.flush();
    const postMigrationHeads = headsOf(obj1);
    let bodyCheckpoint = postMigrationHeads;
    let forkHeads = postMigrationHeads;

    await partition();

    // Peer 2, schema-unaware, keeps splicing the OLD `body` field character-by-character (a real
    // editor's minimal diff, via `updateText`, not a whole-value overwrite).
    updateText(obj2, ['body'], 'Hello brave new world');
    await db2.flush();

    // Peer 1, a user editing THROUGH the new schema, concurrently splices `content` in a DISJOINT
    // region of the same original text.
    updateText(obj1, ['content'], 'Hi world');
    await db1.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.body).toBe('Hello brave new world');
    await expect.poll(() => obj1.content).toBe('Hi world'); // not yet folded: content is peer1's edit only.

    // Fold #1: replay body's late splices onto content, forked at the migration boundary.
    const result1 = foldTextForward(obj1, 'body', ['content'], bodyCheckpoint, forkHeads);
    await db1.flush();
    expect(result1.wrote).to.eq(true);
    bodyCheckpoint = result1.checkpoint;
    forkHeads = result1.forkHeads;

    // eslint-disable-next-line no-console
    console.log('Ta1: content after fold #1 ->', obj1.content);
    // Both edit streams survive: peer1's "Hi" (from "Hello" -> "Hi") AND peer2's "brave new" clause,
    // neither clobbering the other -- the defect Ta2 demonstrates for a whole-value fold.
    expect(obj1.content).to.include('Hi');
    expect(obj1.content).to.include('brave new');
    expect(obj1.content).to.not.include('Hello'); // peer1's edit is not reverted by the replay.
    expect(obj1.content?.endsWith('world')).to.eq(true);

    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => obj2.content).toBe(obj1.content);

    // Re-fold immediately with no new late `body` writes: the checkpoint has advanced past every
    // patch already replayed, so this performs ZERO writes -- the idempotence guard.
    const preRefoldHeads = headsOf(obj1);
    const result2 = foldTextForward(obj1, 'body', ['content'], bodyCheckpoint, forkHeads);
    expect(result2.wrote).to.eq(false);
    expect(writesSince(obj1, preRefoldHeads)).to.deep.eq([]);

    // A second late edit: diffing from the ADVANCED checkpoint must name only the NEW edit -- the
    // first late edit, already folded, must never be replayed a second time (which would duplicate
    // it in `content`).
    await partition();
    updateText(obj2, ['body'], 'Hello brave new wonderful world');
    await db2.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.body).toBe('Hello brave new wonderful world');

    const contentBeforeFold2 = obj1.content;
    const result3 = foldTextForward(obj1, 'body', ['content'], bodyCheckpoint, forkHeads);
    await db1.flush();
    expect(result3.wrote).to.eq(true);
    bodyCheckpoint = result3.checkpoint;
    forkHeads = result3.forkHeads;

    // eslint-disable-next-line no-console
    console.log('Ta1: content after fold #2 ->', obj1.content);
    expect(obj1.content).to.include('wonderful');
    expect(obj1.content).to.include('Hi'); // still not reverted.
    // The FIRST fold's insertion must appear exactly ONCE -- a duplicated replay would show it twice.
    expect(obj1.content?.split('brave new').length).to.eq(2);
    expect(obj1.content).to.not.eq(contentBeforeFold2); // the second fold did add the new clause.

    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => obj2.content).toBe(obj1.content);
  });

  test('Ta2: a whole-value guarded fold (the pre-existing vocabulary) clobbers a concurrent `content` edit that a targeted splice replay would have preserved', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [NoteDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(NoteDoc, { body: 'Hello world' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryById(db2, NoteDoc, obj1.id);

    Obj.update(obj1, (obj1) => {
      obj1.content = obj1.body;
    });
    await db1.flush();

    await partition();
    updateText(obj2, ['body'], 'Hello brave new world');
    await db2.flush();
    updateText(obj1, ['content'], 'Hi world');
    await db1.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => obj1.body).toBe('Hello brave new world');
    expect(obj1.content).to.eq('Hi world');

    // The naive fold this bench's OTHER suites use for scalar props: value-compare guarded, but
    // WHOLE-value -- exactly `harness.ts`'s `foldValue`, reproduced inline since it clobbers here.
    Obj.update(obj1, (obj1) => {
      if (obj1.content !== obj1.body) {
        obj1.content = obj1.body;
      }
    });
    await db1.flush();

    // eslint-disable-next-line no-console
    console.log('Ta2: content after the naive whole-value fold ->', obj1.content);
    // The defect: peer1's "Hi world" edit is gone WITHOUT A TRACE -- not recorded as a conflict
    // (design 1's scalar machinery has no notion of a partial/character-level clash here), just
    // silently overwritten by body's whole current value.
    expect(obj1.content).to.eq(obj1.body);
    expect(obj1.content).to.not.include('Hi');
  });
});

describe('T-b: text across fan-out duplicates (hypothesis b)', () => {
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

  // Driven through real ECHO test objects on a single peer/db (not through the actual
  // `mergeCandidates`/db-host merge engine in `merge-core.ts`, and not via bare `@automerge/automerge`
  // docs) -- the position-alignment question hypothesis (b) probes is about `A.diff`/`changeAt`
  // offsets between two Automerge Text objects, which needs no network partition to demonstrate; a
  // single db holding both duplicates (as `fan-out.test.ts` reads them once healed) is enough.

  test('Tb1: replaying the loser text edits onto the winner (both forked from equal creation text) merges both edit streams character-wise', async () => {
    await using peer = await builder.createPeer({ types: [DuplicateNoteDoc] });
    await using db = await peer.createDatabase();

    const baselineText = 'Quarterly report draft.';
    const winner = db.add(Obj.make(DuplicateNoteDoc, { content: baselineText }));
    await db.flush();
    const loser = db.add(Obj.make(DuplicateNoteDoc, { content: baselineText }));
    await db.flush();

    const winnerCreationHeads = headsOf(winner);
    const loserCreationHeads = headsOf(loser);
    // The precondition hypothesis (b) turns on: BOTH copies must be identical at their own creation
    // point for offsets computed against one to line up when replayed onto the other.
    expect(textValueAt(winner, winnerCreationHeads, 'content')).to.eq(
      textValueAt(loser, loserCreationHeads, 'content'),
    );

    // Each "peer" edits its own copy independently, in disjoint regions of the shared baseline text.
    updateText(winner, ['content'], 'Quarterly report draft, final version.');
    await db.flush();
    updateText(loser, ['content'], 'Confidential quarterly report draft.');
    await db.flush();

    expect(winner.content).to.eq('Quarterly report draft, final version.');
    expect(loser.content).to.eq('Confidential quarterly report draft.');

    const loserPatches = lateTextPatches(loser, loserCreationHeads, 'content');
    expect(loserPatches.length).to.be.greaterThan(0);

    const accessor = getObjectCore(winner).getDocAccessor(['content']);
    accessor.handle.changeAt(winnerCreationHeads, (doc: AutomergeDoc<unknown>) => {
      replayTextPatches(doc, accessor.path.slice(), loserPatches);
    });
    await db.flush();

    // eslint-disable-next-line no-console
    console.log('Tb1: winner content after replaying the loser edits ->', winner.content);
    // Both edit streams present: the winner's own "final version" suffix AND the loser's
    // "Confidential" prefix -- neither clobbered the other, matching Ta1's within-object result.
    expect(winner.content).to.include('Confidential');
    expect(winner.content).to.include('final version');
    expect(winner.content?.startsWith('Confidential')).to.eq(true);
    expect(winner.content?.endsWith('final version.')).to.eq(true);
  });

  test('Tb2: mismatched creation text misaligns a naive replay (corruption); comparing creation-time text detects it and the safe fallback keeps the loser text reachable instead of merging', async () => {
    await using peer = await builder.createPeer({ types: [DuplicateNoteDoc] });
    await using db = await peer.createDatabase();

    // Simulates fan-out duplicates minted from DIFFERENT source states (e.g. two peers ran the
    // migration against states that had already diverged) -- same rough shape, different content.
    const winner = db.add(Obj.make(DuplicateNoteDoc, { content: 'Report: Q1 revenue up 5 percent.' }));
    await db.flush();
    const loser = db.add(Obj.make(DuplicateNoteDoc, { content: 'Report: Q1 revenue up 12 percent!!' }));
    await db.flush();

    const winnerCreationHeads = headsOf(winner);
    const loserCreationHeads = headsOf(loser);
    const winnerBaselineText = textValueAt(winner, winnerCreationHeads, 'content');
    const loserBaselineText = textValueAt(loser, loserCreationHeads, 'content');

    // The detection this bench recommends: compare the two copies' CREATION-time text (both cheaply
    // available -- the migration/fan-out transform wrote them, or they're read straight off the
    // recorded creation heads) before ever attempting a positional replay.
    const baselinesMatch = winnerBaselineText === loserBaselineText;
    expect(baselinesMatch).to.eq(false);

    Obj.update(loser, (loser) => {
      loser.content = 'Report: Q1 revenue up 12 percent!! Great quarter.';
    });
    await db.flush();
    const loserPatches = lateTextPatches(loser, loserCreationHeads, 'content');
    expect(loserPatches.length).to.be.greaterThan(0);

    // Demonstrate the hazard: replaying anyway, positions computed against the LOSER's baseline
    // text land at the wrong offsets in the WINNER's different baseline text.
    const naiveAccessor = getObjectCore(winner).getDocAccessor(['content']);
    naiveAccessor.handle.changeAt(winnerCreationHeads, (doc: AutomergeDoc<unknown>) => {
      replayTextPatches(doc, naiveAccessor.path.slice(), loserPatches);
    });
    await db.flush();
    // eslint-disable-next-line no-console
    console.log('Tb2: winner content after a NAIVE misaligned replay (expected corrupted) ->', winner.content);
    // Corrupted: the appended clause did not land at the winner's actual end-of-string, and/or the
    // winner's own text is mangled -- either way it must NOT equal a sane concatenation, evidencing
    // that positional replay across differing baselines is unsafe.
    expect(winner.content).to.not.eq('Report: Q1 revenue up 5 percent. Great quarter.');

    // The safe path: detect the baseline mismatch UP FRONT (as above) and skip the positional
    // replay entirely, falling back to keeping the loser's own text reachable (e.g. the loser stays
    // queryable, un-merged, for review) rather than risking corrupting the winner. Verified on a
    // FRESH pair so the corruption above doesn't contaminate this assertion.
    const winnerSafe = db.add(Obj.make(DuplicateNoteDoc, { content: 'Report: Q1 revenue up 5 percent.' }));
    await db.flush();
    const loserSafe = db.add(Obj.make(DuplicateNoteDoc, { content: 'Report: Q1 revenue up 12 percent!!' }));
    await db.flush();
    Obj.update(loserSafe, (loserSafe) => {
      loserSafe.content = 'Report: Q1 revenue up 12 percent!! Great quarter.';
    });
    await db.flush();

    // No merge attempted below -- winner keeps its own text untouched, loser stays independently
    // readable (a real implementation would tombstone-and-keep it, per design 4's "losers are
    // tombstoned, never erased", not delete it outright).
    const safeBaselinesMatch =
      textValueAt(winnerSafe, headsOf(winnerSafe), 'content') === textValueAt(loserSafe, headsOf(loserSafe), 'content');
    expect(safeBaselinesMatch).to.eq(false);
    expect(winnerSafe.content).to.eq('Report: Q1 revenue up 5 percent.'); // untouched: no corruption risked.
    expect(loserSafe.content).to.eq('Report: Q1 revenue up 12 percent!! Great quarter.'); // still fully readable.
  });
});
