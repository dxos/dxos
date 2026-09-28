//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Annotation, DXN, Lens, Migration, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { EchoTestBuilder, getObjectCore } from '../testing/index.ts';
import { updateText } from '../text.ts';

//
// Phase C2/C3 (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md` Phase C; M0-REPORT.md design items
// 1, 6, 9): fold-forward as a standing rule, derived from the document rather than a durable intent.
// Single-db suite — see `../../../echo-client-e2e/src/fold-forward.test.ts` for the cross-peer
// (partitioned, asymmetric-schema) acceptance suite. A "late old-schema write" is simulated here by
// writing the retired key directly through `ObjectCore` (`setDecoded`/`getDocAccessor`), the same way
// an old client's replicated change would land: through the raw document, never through the current
// (target) typed proxy, which schema-rejects a write to a retired property.
//

class ContactV1 extends Type.makeObject<ContactV1>(DXN.make('org.dxos.test.foldForward.Contact', '0.1.0'))(
  Schema.Struct({ fullName: Schema.String }),
) {}

class ContactV2 extends Type.makeObject<ContactV2>(DXN.make('org.dxos.test.foldForward.Contact', '0.2.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

/** An opaque `define`-style migration (not lens-backed) so the generic recompute-and-compare path is exercised. */
const contactMigration = Migration.define({
  from: ContactV1,
  to: ContactV2,
  transform: async (from) => ({ name: from.fullName }),
});

class ContactV3 extends Type.makeObject<ContactV3>(DXN.make('org.dxos.test.foldForward.Contact', '0.3.0'))(
  Schema.Struct({ displayName: Schema.String }),
) {}

/** Second hop of the `@1 -> @2 -> @3` chain exercised by the "chained migrations" describe block below. */
const contactMigration23 = Migration.define({
  from: ContactV2,
  to: ContactV3,
  transform: async (from) => ({ displayName: from.name }),
});

// A second chain, for the "per-step actor scoping" describe block: unlike `ContactV1/V2/V3` above,
// `name` is a property BOTH steps carry through untouched (never retired by either), so a direct edit
// to it is never dominated by an ordinary late write to a retired property -- only by which fold actor
// a later step's fold happens to share.
class ScopeV1 extends Type.makeObject<ScopeV1>(DXN.make('org.dxos.test.foldForward.scope.Contact', '0.1.0'))(
  Schema.Struct({ fullName: Schema.String }),
) {}

class ScopeV2 extends Type.makeObject<ScopeV2>(DXN.make('org.dxos.test.foldForward.scope.Contact', '0.2.0'))(
  Schema.Struct({ name: Schema.String, note: Schema.optional(Schema.String) }),
) {}

class ScopeV3 extends Type.makeObject<ScopeV3>(DXN.make('org.dxos.test.foldForward.scope.Contact', '0.3.0'))(
  Schema.Struct({ name: Schema.String, label: Schema.optional(Schema.String) }),
) {}

/** Step 0: renames `fullName` to `name`; never mentions `note`, so recomputing it never touches `label`. */
const scopeMigration12 = Migration.define({
  from: ScopeV1,
  to: ScopeV2,
  transform: async (from) => ({ name: from.fullName }),
});

/** Step 1: carries `name` through unchanged (echoes it back, so its own write never touches it) and renames `note` to `label`. */
const scopeMigration23 = Migration.define({
  from: ScopeV2,
  to: ScopeV3,
  transform: async (from) => ({ name: from.name, label: from.note }),
});

class NoteV1 extends Type.makeObject<NoteV1>(DXN.make('org.dxos.test.foldForward.Note', '0.1.0'))(
  Schema.Struct({ body: Schema.optional(Schema.String) }),
) {}

class NoteV2 extends Type.makeObject<NoteV2>(DXN.make('org.dxos.test.foldForward.Note', '0.2.0'))(
  Schema.Struct({ content: Schema.optional(Schema.String) }),
) {}

/** A bare rename (`content` <- `body`): the one shape `fromLens` folds character-wise instead of whole-value. */
const noteLens = Lens.make('org.dxos.test.foldForward.note.lens', NoteV1, NoteV2, { content: 'body' });
const noteMigration = Migration.fromLens(noteLens);

class TaskV1 extends Type.makeObject<TaskV1>(DXN.make('org.dxos.test.foldForward.Task', '0.1.0'))(
  Schema.Struct({ title: Schema.String }),
) {}

class TaskV2 extends Type.makeObject<TaskV2>(DXN.make('org.dxos.test.foldForward.Task', '0.2.0'))(
  Schema.Struct({ title: Schema.String, priority: Schema.optional(Schema.String) }),
) {}

/** `priority` has no source counterpart, so the lens stores it as an overlay (`Lens.coverage(lens).overlaid`). */
const taskLens = Lens.make('org.dxos.test.foldForward.task.lens', TaskV1, TaskV2, {});
const taskMigration = Migration.fromLens(taskLens);

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('fold-forward: retired scalar properties', () => {
  test('a late write to a retired property folds into the migrated target, and a second pass is a no-op', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2]);

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Ada Lovelace' }));
    await db.flush();
    await db.runMigrations([contactMigration]);
    // `contact`'s compile-time type is still `ContactV1` (the runtime type switch does not change the
    // TypeScript type of the binding) — `Obj.getValue` reads the migrated property without a cast.
    expect(Obj.getValue(contact, ['name'])).to.eq('Ada Lovelace');

    // Simulate an old client's late write to the retired `fullName` key, straight on the raw core.
    getObjectCore(contact).setDecoded(['data', 'fullName'], 'Ada Lovelace-Byron');
    await db.flush();
    expect(Obj.getValue(contact, ['name'])).to.eq('Ada Lovelace'); // not yet folded.

    await db.foldForward([contactMigration]);
    expect(Obj.getValue(contact, ['name'])).to.eq('Ada Lovelace-Byron');

    // The checkpoint (`foldedAt`) advanced, so a second pass with nothing new writes nothing.
    const core = getObjectCore(contact);
    const historyLengthAfterFold = A.getHistory(core.getDoc()).length;
    await db.foldForward([contactMigration]);
    expect(A.getHistory(core.getDoc())).to.have.length(historyLengthAfterFold);
    expect(Obj.getValue(contact, ['name'])).to.eq('Ada Lovelace-Byron');
  });

  test('a pass scoped to other objects leaves an unlisted object unfolded', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2]);

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Ada Lovelace' }));
    await db.flush();
    await db.runMigrations([contactMigration]);
    getObjectCore(contact).setDecoded(['data', 'fullName'], 'Ada Lovelace-Byron');
    await db.flush();

    await db.foldForward([contactMigration], { objectIds: new Set(['some-other-object']) });
    expect(Obj.getValue(contact, ['name'])).to.eq('Ada Lovelace');

    await db.foldForward([contactMigration], { objectIds: new Set([contact.id]) });
    expect(Obj.getValue(contact, ['name'])).to.eq('Ada Lovelace-Byron');
  });

  test('watchFoldForward folds a late write once objects update', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2]);

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Ada Lovelace' }));
    await db.flush();
    await db.runMigrations([contactMigration]);
    const unwatch = db.watchFoldForward(() => [contactMigration], { debounceMs: 10 });
    try {
      getObjectCore(contact).setDecoded(['data', 'fullName'], 'Ada Lovelace-Byron');
      await db.flush();
      await expect.poll(() => Obj.getValue(contact, ['name'])).toBe('Ada Lovelace-Byron');
    } finally {
      unwatch();
    }
  });

  test('a concurrent direct edit to the target creates a real conflict; Obj.getConflict presents the direct edit', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2]);

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Grace Hopper' }));
    await db.flush();
    await db.runMigrations([contactMigration]);

    // A direct edit through the new schema...
    Obj.update(contact, (contact) => {
      Obj.setValue(contact, ['name'], 'Amazing Grace');
    });
    await db.flush();

    // ...concurrent (in CRDT terms — the fold is forced back to the migration's own heads) with a
    // late old-schema write to the retired property.
    getObjectCore(contact).setDecoded(['data', 'fullName'], 'Grace Murray Hopper');
    await db.flush();

    await db.foldForward([contactMigration]);

    // User wins: `Obj.getConflict`'s policy-resolved `presented` value is the direct edit, the late
    // value is not lost. The ORDINARY property read is a plain Automerge counter-dominance read, not
    // policy-filtered (`ObjectCore.foldAt`'s own doc comment: "typically" the direct edit wins there,
    // not guaranteed), so only `presented` is asserted on.
    const conflict = Obj.getConflict(contact, 'name');
    invariant(conflict, 'expected a real Automerge conflict on `name`');
    expect(conflict.presented).to.eq('Amazing Grace');
    expect(conflict.alternatives).to.have.length(2);
    const fold = conflict.alternatives.find((alternative) => alternative.fold);
    const direct = conflict.alternatives.find((alternative) => !alternative.fold);
    expect(fold?.value).to.eq('Grace Murray Hopper');
    expect(direct?.value).to.eq('Amazing Grace');

    // Re-running performs no further writes: the checkpoint already covers this late write, and the
    // conflict — read straight from Automerge — is untouched by a fold that changes nothing.
    const core = getObjectCore(contact);
    const historyLength = A.getHistory(core.getDoc()).length;
    await db.foldForward([contactMigration]);
    expect(A.getHistory(core.getDoc())).to.have.length(historyLength);
  });
});

describe('fold-forward: text (fromLens identity rename)', () => {
  test('a late source splice merges character-wise with a concurrent target edit', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([NoteV1, NoteV2]);

    const note = db.add(Obj.make(NoteV1, { body: 'Hello world' }));
    await db.flush();
    await db.runMigrations([noteMigration]);
    // `note`'s compile-time type is still `NoteV1` — `Obj.getValue` reads `content` without a cast.
    expect(Obj.getValue(note, ['content'])).to.eq('Hello world');

    // A direct edit through the new schema, in a disjoint region of the original text.
    updateText(note, ['content'], 'Hi world');
    await db.flush();

    // A late old-schema splice edit to the retired `body` key.
    updateText(note, ['body'], 'Hello brave new world');
    await db.flush();
    expect(Obj.getValue(note, ['content'])).to.eq('Hi world'); // not yet folded.

    await db.foldForward([noteMigration]);

    // Both edit streams survive, character-wise — neither clobbers the other.
    const content = Obj.getValue(note, ['content']);
    expect(content).to.include('Hi');
    expect(content).to.include('brave new');
    expect(content).to.not.include('Hello');
    expect(content?.endsWith('world')).to.eq(true);
  });

  test('two successive late text edits fold correctly via the advancing target frontier', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([NoteV1, NoteV2]);

    const note = db.add(Obj.make(NoteV1, { body: 'Hello world' }));
    await db.flush();
    await db.runMigrations([noteMigration]);

    updateText(note, ['content'], 'Hi world');
    await db.flush();
    updateText(note, ['body'], 'Hello brave new world');
    await db.flush();
    await db.foldForward([noteMigration]);
    expect(Obj.getValue(note, ['content'])).to.include('brave new');

    // A second late edit on the source: diffing from the ADVANCED checkpoint must name only the new
    // edit, and the replay must fork from the frontier the FIRST replay returned — re-forking from the
    // original migration heads would overrun offsets (M0-REPORT.md design item 9).
    updateText(note, ['body'], 'Hello brave new wonderful world');
    await db.flush();
    await db.foldForward([noteMigration]);

    const content = Obj.getValue(note, ['content']);
    expect(content).to.include('wonderful');
    expect(content).to.include('Hi'); // still not reverted.
    // The first fold's insertion appears exactly once — a re-fork bug would duplicate it.
    expect(content?.split('brave new').length).to.eq(2);
  });
});

describe('fold-forward: lens overlay properties', () => {
  test('an overlay value present before migration is promoted onto the real property, and stays in the overlay', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TaskV1, TaskV2]);

    const task = db.add(Obj.make(TaskV1, { title: 'Write report' }));
    await db.flush();
    Lens.put(task, taskLens, { priority: 'high' });
    await db.flush();

    await db.runMigrations([taskMigration]);
    expect(Obj.getValue(task, ['priority'])).to.eq('high');

    // The migration promotes the overlay into a real property but does not delete the source-side
    // annotation — it is what an old client, still lensing through `taskLens`, keeps writing to.
    expect(Lens.getOverlays(task, taskLens.id).priority).to.eq('high');
  });

  test('a late overlay write folds into the promoted property, and a second pass is a no-op', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TaskV1, TaskV2]);

    const task = db.add(Obj.make(TaskV1, { title: 'Write report' }));
    await db.flush();
    await db.runMigrations([taskMigration]);
    expect(Obj.getValue(task, ['priority'])).to.eq(undefined);

    // An old client, still lensing through `taskLens`, writes the overlaid property — it lands in the
    // annotation dictionary (`meta.annotations`), never the (now-real) `priority` data key.
    Lens.put(task, taskLens, { priority: 'urgent' });
    await db.flush();
    expect(Obj.getValue(task, ['priority'])).to.eq(undefined); // not yet folded.

    await db.foldForward([taskMigration]);
    expect(Obj.getValue(task, ['priority'])).to.eq('urgent');

    // The checkpoint (`foldedAt`) advanced, so a second pass with nothing new writes nothing.
    const core = getObjectCore(task);
    const historyLengthAfterFold = A.getHistory(core.getDoc()).length;
    await db.foldForward([taskMigration]);
    expect(A.getHistory(core.getDoc())).to.have.length(historyLengthAfterFold);
    expect(Obj.getValue(task, ['priority'])).to.eq('urgent');
  });

  test('a raw overlay annotation write (simulating an old client with no Lens.put) folds the same way', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TaskV1, TaskV2]);

    const task = db.add(Obj.make(TaskV1, { title: 'Write report' }));
    await db.flush();
    await db.runMigrations([taskMigration]);

    // Straight to the annotation dictionary, bypassing `Lens.put` entirely.
    Obj.update(task, (task) => {
      Annotation.set(task, Lens.OverlayAnnotation, { [taskLens.id]: { priority: 'urgent' } });
    });
    await db.flush();
    expect(Obj.getValue(task, ['priority'])).to.eq(undefined); // not yet folded.

    await db.foldForward([taskMigration]);
    expect(Obj.getValue(task, ['priority'])).to.eq('urgent');
  });

  test('a concurrent direct edit to the promoted property creates a real conflict; Obj.getConflict presents the direct edit and lists the fold', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TaskV1, TaskV2]);

    const task = db.add(Obj.make(TaskV1, { title: 'Write report' }));
    await db.flush();
    await db.runMigrations([taskMigration]);

    // A direct edit through the new schema...
    Obj.update(task, (task) => {
      Obj.setValue(task, ['priority'], 'medium');
    });
    await db.flush();

    // ...concurrent (in CRDT terms — the fold is forced back to the migration's own heads) with a late
    // overlay write from an old client still lensing through `taskLens`.
    Lens.put(task, taskLens, { priority: 'urgent' });
    await db.flush();

    await db.foldForward([taskMigration]);

    // User wins: `Obj.getConflict`'s policy-resolved `presented` value is the direct edit, the late
    // overlay value is not lost.
    const conflict = Obj.getConflict(task, 'priority');
    invariant(conflict, 'expected a real Automerge conflict on `priority`');
    expect(conflict.presented).to.eq('medium');
    expect(conflict.alternatives).to.have.length(2);
    const fold = conflict.alternatives.find((alternative) => alternative.fold);
    const direct = conflict.alternatives.find((alternative) => !alternative.fold);
    expect(fold?.value).to.eq('urgent');
    expect(direct?.value).to.eq('medium');

    // Re-running performs no further writes: the checkpoint already covers this late write.
    const core = getObjectCore(task);
    const historyLength = A.getHistory(core.getDoc()).length;
    await db.foldForward([taskMigration]);
    expect(A.getHistory(core.getDoc())).to.have.length(historyLength);
  });
});

describe('fold-forward: safety', () => {
  test('an object with a foreign migration checkpoint, and one with no marker at all, are both skipped safely', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2]);

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Katherine Johnson' }));
    await db.flush();
    await db.runMigrations([contactMigration]);
    getObjectCore(contact).setDecoded(['data', 'fullName'], 'Katherine Coleman Johnson');
    await db.flush();

    // Corrupt step 0's `preHeads` to a hash the document has never seen — the ancestry check
    // (M0-REPORT.md design item 1: "never fold on foreign heads") must skip it, not throw or diff
    // against "everything is new".
    const marker = Option.getOrThrow(Annotation.get(contact, Migration.MigrationMarkerAnnotation));
    const [step] = Migration.getSteps(marker);
    Obj.update(contact, (contact) => {
      Annotation.set(contact, Migration.MigrationMarkerAnnotation, {
        steps: [{ ...step, preHeads: ['0'.repeat(64)] }],
      });
    });
    await db.flush();

    // An object of the target type that was never migrated (no marker at all).
    const untouched = db.add(Obj.make(ContactV2, { name: 'Direct' }));
    await db.flush();

    await expect(db.foldForward([contactMigration])).resolves.toBeUndefined();

    // Skipped: the late write to `fullName` was never folded into `name`.
    expect(Obj.getValue(contact, ['name'])).to.eq('Katherine Johnson');
    expect(untouched.name).to.eq('Direct');
  });
});

describe('fold-forward: chained migrations', () => {
  test('a late @1-shaped write folds all the way to @3 in one call, and a second call is a no-op', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2, ContactV3]);

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Ada Lovelace' }));
    await db.flush();
    await db.runMigrations([contactMigration, contactMigration23]);
    expect(Obj.getValue(contact, ['displayName'])).to.eq('Ada Lovelace');

    const marker = Option.getOrThrow(Annotation.get(contact, Migration.MigrationMarkerAnnotation));
    expect(Migration.getSteps(marker)).to.have.length(2);

    // A late `@1`-shaped write from an old client that never saw either migration, straight on the raw core.
    getObjectCore(contact).setDecoded(['data', 'fullName'], 'Ada Lovelace-Byron');
    await db.flush();
    expect(Obj.getValue(contact, ['displayName'])).to.eq('Ada Lovelace'); // not yet folded.

    await db.foldForward([contactMigration, contactMigration23]);
    expect(Obj.getValue(contact, ['displayName'])).to.eq('Ada Lovelace-Byron');

    // Idempotent: the checkpoints on both steps advanced, so a second pass writes nothing further.
    const core = getObjectCore(contact);
    const historyLength = A.getHistory(core.getDoc()).length;
    await db.foldForward([contactMigration, contactMigration23]);
    expect(A.getHistory(core.getDoc())).to.have.length(historyLength);
    expect(Obj.getValue(contact, ['displayName'])).to.eq('Ada Lovelace-Byron');
  });

  test('an old single-step marker, written directly in its pre-chaining shape, is still folded', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2]);

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Grace Hopper' }));
    await db.flush();
    await db.runMigrations([contactMigration]);

    // Downgrade the marker to its pre-chaining (flat, no `steps` wrapper) shape -- simulating an object
    // migrated before chained migrations existed.
    const marker = Option.getOrThrow(Annotation.get(contact, Migration.MigrationMarkerAnnotation));
    const [step] = Migration.getSteps(marker);
    Obj.update(contact, (contact) => {
      Annotation.set(contact, Migration.MigrationMarkerAnnotation, step);
    });
    await db.flush();

    getObjectCore(contact).setDecoded(['data', 'fullName'], 'Grace Brewster Murray Hopper');
    await db.flush();
    expect(Obj.getValue(contact, ['name'])).to.eq('Grace Hopper'); // not yet folded.

    await db.foldForward([contactMigration]);
    expect(Obj.getValue(contact, ['name'])).to.eq('Grace Brewster Murray Hopper');
  });
});

describe('fold-forward: per-step actor scoping', () => {
  test(
    "a step-0 fold does not inherit a step-1 fold's ancestry: a direct edit made between the two " +
      'migrations survives as a real conflict, not silently overwritten',
    async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([ScopeV1, ScopeV2, ScopeV3]);

      const contact = db.add(Obj.make(ScopeV1, { fullName: 'A0' }));
      await db.flush();
      await db.runMigrations([scopeMigration12]);
      expect(Obj.getValue(contact, ['name'])).to.eq('A0');

      // A direct edit to `name` -- a property BOTH migrations carry through untouched (neither step
      // ever retires it) -- made strictly between the two migrations.
      Obj.update(contact, (contact) => {
        Obj.setValue(contact, ['name'], 'direct');
      });
      await db.flush();

      // Seed `note` before migrating on, so step 1 has something to carry into `label`.
      getObjectCore(contact).setDecoded(['data', 'note'], 'note-seed');
      await db.flush();

      await db.runMigrations([scopeMigration23]);
      expect(Obj.getValue(contact, ['name'])).to.eq('direct'); // step 1 never touches it.
      expect(Obj.getValue(contact, ['label'])).to.eq('note-seed');

      // A late write to step 1's retired property (`note`) triggers a step-1 (marker index 1) fold --
      // it writes only `label`, never `name`.
      getObjectCore(contact).setDecoded(['data', 'note'], 'note-late');
      await db.flush();
      await db.foldForward([scopeMigration12, scopeMigration23]);
      expect(Obj.getValue(contact, ['label'])).to.eq('note-late');
      expect(Obj.getValue(contact, ['name'])).to.eq('direct'); // untouched by the step-1 fold.

      // A late write to step 0's retired property (`fullName`) then triggers a step-0 (marker index 0)
      // fold, writing `name` -- the SAME property the direct edit above landed on.
      getObjectCore(contact).setDecoded(['data', 'fullName'], 'late-fullname');
      await db.flush();
      await db.foldForward([scopeMigration12, scopeMigration23]);

      // With a fold actor shared across steps, this fold's fork point would have inherited the step-1
      // fold's ancestry above -- which already includes the direct edit -- and silently dominated it.
      // Scoped per (object, step), it stays concurrent: the direct edit survives as a real conflict.
      const conflict = Obj.getConflict(contact, 'name');
      invariant(conflict, 'expected the direct edit and the step-0 fold to remain a real conflict on `name`');
      expect(conflict.presented).to.eq('direct');
      expect(conflict.alternatives).to.have.length(2);
      const direct = conflict.alternatives.find((alternative) => !alternative.fold);
      const fold = conflict.alternatives.find((alternative) => alternative.fold);
      invariant(direct, 'expected the direct edit among the alternatives');
      invariant(fold, 'expected the step-0 fold among the alternatives');
      expect(direct.value).to.eq('direct');
      expect(fold.value).to.eq('late-fullname');
    },
  );

  test(
    "two objects sharing one document: object A's step-0 fold does not inherit object B's step-1 " + "fold's ancestry",
    async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([ScopeV1, ScopeV2, ScopeV3]);

      // `placeIn: 'root-doc'` is a public `Database.AddOptions` (default is `'linked-doc'`, one document
      // PER object): apps use it for small objects that should load eagerly with the space, and it is
      // exactly how two objects end up inlined into ONE shared document (`DatabaseDirectory.objects`,
      // `echo-protocol/src/document-structure.ts`) in practice, not merely hypothetically.
      const a = db.add(Obj.make(ScopeV1, { fullName: 'A0' }), { placeIn: 'root-doc' });
      const b = db.add(Obj.make(ScopeV1, { fullName: 'B0' }), { placeIn: 'root-doc' });
      await db.flush();

      invariant(
        getObjectCore(a).docHandle && getObjectCore(a).docHandle === getObjectCore(b).docHandle,
        'expected A and B to share one document',
      );

      await db.runMigrations([scopeMigration12]); // migrates both A and B.

      // A direct edit to A's `name` -- a property neither step retires.
      Obj.update(a, (a) => {
        Obj.setValue(a, ['name'], 'direct-a');
      });
      await db.flush();

      getObjectCore(a).setDecoded(['data', 'note'], 'note-seed-a');
      getObjectCore(b).setDecoded(['data', 'note'], 'note-seed-b');
      await db.flush();
      await db.runMigrations([scopeMigration23]); // migrates both A and B.

      // A late write to B's `note` triggers a step-1 fold on B -- a DIFFERENT object, sharing A's document.
      getObjectCore(b).setDecoded(['data', 'note'], 'note-late-b');
      await db.flush();
      await db.foldForward([scopeMigration12, scopeMigration23]);
      expect(Obj.getValue(b, ['label'])).to.eq('note-late-b');

      // A late write to A's `fullName` then triggers a step-0 fold on A.
      getObjectCore(a).setDecoded(['data', 'fullName'], 'late-fullname-a');
      await db.flush();
      await db.foldForward([scopeMigration12, scopeMigration23]);

      // With a fold actor shared across the whole DOCUMENT, A's fold's fork point would have inherited
      // B's fold's ancestry -- unrelated to A -- and silently dominated A's own direct edit. Scoped per
      // (object, step), A's fold never sees B's history at all.
      const conflict = Obj.getConflict(a, 'name');
      invariant(conflict, "expected A's direct edit to remain a real conflict, not overwritten by B's fold");
      expect(conflict.presented).to.eq('direct-a');
      expect(conflict.alternatives).to.have.length(2);
    },
  );
});
