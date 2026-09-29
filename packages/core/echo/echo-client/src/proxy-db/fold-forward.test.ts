//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Annotation, DXN, Lens, Migration, Obj, Ref, Type } from '@dxos/echo';
import { DATA_NAMESPACE, EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { getDeep, setDeep } from '@dxos/util';

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
  transform: (from) => ({ name: from.fullName }),
});

class ContactV3 extends Type.makeObject<ContactV3>(DXN.make('org.dxos.test.foldForward.Contact', '0.3.0'))(
  Schema.Struct({ displayName: Schema.String }),
) {}

/** Second hop of the `@1 -> @2 -> @3` chain exercised by the "chained migrations" describe block below. */
const contactMigration23 = Migration.define({
  from: ContactV2,
  to: ContactV3,
  transform: (from) => ({ displayName: from.name }),
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
  transform: (from) => ({ name: from.fullName }),
});

/** Step 1: carries `name` through unchanged (echoes it back, so its own write never touches it) and renames `note` to `label`. */
const scopeMigration23 = Migration.define({
  from: ScopeV2,
  to: ScopeV3,
  transform: (from) => ({ name: from.name, label: from.note }),
});

class NoteV1 extends Type.makeObject<NoteV1>(DXN.make('org.dxos.test.foldForward.Note', '0.1.0'))(
  Schema.Struct({ body: Schema.optional(Schema.String) }),
) {}

class NoteV2 extends Type.makeObject<NoteV2>(DXN.make('org.dxos.test.foldForward.Note', '0.2.0'))(
  Schema.Struct({ content: Schema.optional(Schema.String) }),
) {}

/** A bare rename (`content` <- `body`) of a string property. */
const noteLens = Lens.make('org.dxos.test.foldForward.note.lens', NoteV1, NoteV2, { content: 'body' });
const noteMigration = Migration.fromLens(noteLens);

class DocV1 extends Type.makeObject<DocV1>(DXN.make('org.dxos.test.foldForward.Doc', '0.1.0'))(
  Schema.Struct({ title: Schema.String, body: Schema.optional(Schema.String) }),
) {}

class DocV2 extends Type.makeObject<DocV2>(DXN.make('org.dxos.test.foldForward.Doc', '0.2.0'))(
  Schema.Struct({ name: Schema.String, content: Schema.optional(Schema.String) }),
) {}

const docLens = Lens.make('org.dxos.test.foldForward.doc.lens', DocV1, DocV2, { name: 'title', content: 'body' });
const docMigration = Migration.fromLens(docLens);

class DerivedV1 extends Type.makeObject<DerivedV1>(DXN.make('org.dxos.test.foldForward.Derived', '0.1.0'))(
  Schema.Struct({ fullName: Schema.String }),
) {}

class DerivedV2 extends Type.makeObject<DerivedV2>(DXN.make('org.dxos.test.foldForward.Derived', '0.2.0'))(
  Schema.Struct({ name: Schema.String, derived: Schema.optional(Schema.String) }),
) {}

class TaskV1 extends Type.makeObject<TaskV1>(DXN.make('org.dxos.test.foldForward.Task', '0.1.0'))(
  Schema.Struct({ title: Schema.String }),
) {}

class TaskV2 extends Type.makeObject<TaskV2>(DXN.make('org.dxos.test.foldForward.Task', '0.2.0'))(
  Schema.Struct({ title: Schema.String, priority: Schema.optional(Schema.String) }),
) {}

/** `priority` has no source counterpart, so the lens stores it as an overlay (`Lens.coverage(lens).overlaid`). */
const taskLens = Lens.make('org.dxos.test.foldForward.task.lens', TaskV1, TaskV2, {});
const taskMigration = Migration.fromLens(taskLens);

class AssignmentV1 extends Type.makeObject<AssignmentV1>(DXN.make('org.dxos.test.foldForward.Assignment', '0.1.0'))(
  Schema.Struct({ title: Schema.String, owner: Schema.optional(Ref.Ref(ContactV2)) }),
) {}

class AssignmentV2 extends Type.makeObject<AssignmentV2>(DXN.make('org.dxos.test.foldForward.Assignment', '0.2.0'))(
  Schema.Struct({ name: Schema.String, owner: Schema.optional(Ref.Ref(ContactV2)) }),
) {}

/** Renames `title` and carries the `owner` ref through unchanged. */
const assignmentLens = Lens.make('org.dxos.test.foldForward.assignment.lens', AssignmentV1, AssignmentV2, {
  name: 'title',
});
const assignmentMigration = Migration.fromLens(assignmentLens);

class ProfileV1 extends Type.makeObject<ProfileV1>(DXN.make('org.dxos.test.foldForward.Profile', '0.1.0'))(
  Schema.Struct({ fullName: Schema.String, nickname: Schema.optional(Schema.String) }),
) {}

class ProfileV2 extends Type.makeObject<ProfileV2>(DXN.make('org.dxos.test.foldForward.Profile', '0.2.0'))(
  Schema.Struct({ name: Schema.String, alias: Schema.optional(Schema.String) }),
) {}

const profileMigration = Migration.define({
  from: ProfileV1,
  to: ProfileV2,
  transform: (from) => ({ name: from.fullName, alias: from.nickname }),
});

class KeyedV1 extends Type.makeObject<KeyedV1>(DXN.make('org.dxos.test.foldForward.Keyed', '0.1.0'))(
  Schema.Struct({ name: Schema.String, key: Schema.String }),
) {}

class KeyedV2 extends Type.makeObject<KeyedV2>(DXN.make('org.dxos.test.foldForward.Keyed', '0.2.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

/** Moves `key` from data into the object's meta. */
const keyedMigration = Migration.define({
  from: KeyedV1,
  to: KeyedV2,
  transform: (from) => ({ [Obj.Meta]: { key: from.key }, name: from.name }),
});

class PlanV1 extends Type.makeObject<PlanV1>(DXN.make('org.dxos.test.foldForward.Plan', '0.1.0'))(
  Schema.Struct({ title: Schema.String }),
) {}

class PlanV2 extends Type.makeObject<PlanV2>(DXN.make('org.dxos.test.foldForward.Plan', '0.2.0'))(
  Schema.Struct({
    title: Schema.String,
    priority: Schema.optional(Schema.String),
    estimate: Schema.optional(Schema.String),
  }),
) {}

/** Two target-only properties, both stored as overlays before the migration. */
const planLens = Lens.make('org.dxos.test.foldForward.plan.lens', PlanV1, PlanV2, {});
const planMigration = Migration.fromLens(planLens);

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

  test('a watch pass still pending at cleanup never runs', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2]);

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Ada Lovelace' }));
    await db.flush();
    await db.runMigrations([contactMigration]);
    const unwatch = db.watchFoldForward(() => [contactMigration], { debounceMs: 500 });
    getObjectCore(contact).setDecoded(['data', 'fullName'], 'Ada Lovelace-Byron');
    await db.flush();
    unwatch();

    await sleep(800);
    expect(Obj.getValue(contact, ['name'])).to.eq('Ada Lovelace');
  });

  test('a late write made while a pass recomputes is folded by the next pass', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2]);

    let duringTransform: (() => void) | undefined;
    const migration = Migration.define({
      from: ContactV1,
      to: ContactV2,
      transform: (from) => {
        const name = from.fullName;
        duringTransform?.();
        return { name };
      },
    });

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Ada Lovelace' }));
    await db.flush();
    await db.runMigrations([migration]);

    getObjectCore(contact).setDecoded(['data', 'fullName'], 'Ada Lovelace-Byron');
    await db.flush();
    duringTransform = () => {
      duringTransform = undefined;
      getObjectCore(contact).setDecoded(['data', 'fullName'], 'Ada King');
    };
    await db.foldForward([migration]);
    expect(Obj.getValue(contact, ['name'])).to.eq('Ada Lovelace-Byron');

    await db.foldForward([migration]);
    expect(Obj.getValue(contact, ['name'])).to.eq('Ada King');
  });

  test('a key whose inputs the late write did not change is not refolded', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([DerivedV1, DerivedV2]);

    // Stands in for a transform that reads state outside the object, e.g. a query over other objects.
    let external = 'at migration';
    const migration = Migration.define({
      from: DerivedV1,
      to: DerivedV2,
      transform: (from) => ({ name: from.fullName, derived: external }),
    });

    const object = db.add(Obj.make(DerivedV1, { fullName: 'Ada Lovelace' }));
    await db.flush();
    await db.runMigrations([migration]);

    external = 'later';
    getObjectCore(object).setDecoded(['data', 'fullName'], 'Ada King');
    await db.flush();
    await db.foldForward([migration]);

    expect(Obj.getValue(object, ['name'])).to.eq('Ada King');
    expect(Obj.getValue(object, ['derived'])).to.eq('at migration');
  });

  test('overlapping runMigrations calls migrate an object once', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2]);

    const slowMigration = Migration.define({
      from: ContactV1,
      to: ContactV2,
      transform: (from) => ({ name: from.fullName }),
      onMigration: async () => {
        await sleep(10);
      },
    });

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Ada Lovelace' }));
    await db.flush();
    await Promise.all([db.runMigrations([slowMigration]), db.runMigrations([slowMigration])]);

    expect(Migration.getMigrationSteps(contact)).to.have.length(1);
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

describe('fold-forward: string fields fold whole-value', () => {
  test('a late write to a renamed string folds whole-value; a concurrent direct edit presents', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([NoteV1, NoteV2]);

    const note = db.add(Obj.make(NoteV1, { body: 'Hello world' }));
    await db.flush();
    await db.runMigrations([noteMigration]);

    Obj.update(note, (note) => {
      Obj.setValue(note, ['content'], 'Hi world');
    });
    await db.flush();
    updateText(note, ['body'], 'Hello brave new world');
    await db.flush();
    await db.foldForward([noteMigration]);

    const conflict = Obj.getConflict(note, 'content');
    invariant(conflict, 'expected a conflict between the direct edit and the fold');
    expect(conflict.presented).to.eq('Hi world');
    expect(conflict.alternatives.find((alternative) => alternative.fold)?.value).to.eq('Hello brave new world');
  });

  test('a late write to another key leaves an untouched renamed string intact', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([DocV1, DocV2]);

    const doc = db.add(Obj.make(DocV1, { title: 'Draft', body: 'Hello world' }));
    await db.flush();
    await db.runMigrations([docMigration]);

    updateText(doc, ['content'], 'Hello brave world');
    await db.flush();
    getObjectCore(doc).setDecoded(['data', 'title'], 'Final');
    await db.flush();
    await db.foldForward([docMigration]);

    expect(Obj.getValue(doc, ['name'])).to.eq('Final');
    expect(Obj.getValue(doc, ['content'])).to.eq('Hello brave world');
  });
});

describe('fold-forward: references', () => {
  test('a lens fold over a source with a ref property folds the late write and keeps the ref intact', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV2, AssignmentV1, AssignmentV2]);

    const owner = db.add(Obj.make(ContactV2, { name: 'Ada' }));
    const assignment = db.add(Obj.make(AssignmentV1, { title: 'Draft', owner: Ref.make(owner) }));
    await db.flush();
    await db.runMigrations([assignmentMigration]);
    expect(Obj.getValue(assignment, ['name'])).to.eq('Draft');

    getObjectCore(assignment).setDecoded(['data', 'title'], 'Final');
    await db.flush();
    await db.foldForward([assignmentMigration]);

    expect(Obj.getValue(assignment, ['name'])).to.eq('Final');
    expect(getObjectCore(assignment).getRaw([DATA_NAMESPACE, 'owner'])).to.deep.eq({ '/': Ref.make(owner).uri });
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
    const [{ key }] = Migration.getMigrationSteps(contact);
    const core = getObjectCore(contact);
    core.change((doc) => {
      setDeep(doc, [...core.mountPath, 'meta', 'annotations', key, 'preHeads'], ['0'.repeat(64)]);
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

    expect(Migration.getMigrationSteps(contact)).to.have.length(2);

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

describe('fold-forward: late writes the checkpoint must not lose', () => {
  test('an optional old field set for the first time after the migration folds forward', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ProfileV1, ProfileV2]);

    const profile = db.add(Obj.make(ProfileV1, { fullName: 'Ada' }));
    await db.flush();
    await db.runMigrations([profileMigration]);

    getObjectCore(profile).setDecoded(['data', 'nickname'], 'Countess');
    await db.flush();
    await db.foldForward([profileMigration]);

    expect(Obj.getValue(profile, ['alias'])).to.eq('Countess');
  });

  test('a late clear of an old field clears what the migration derived from it', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ProfileV1, ProfileV2]);

    const profile = db.add(Obj.make(ProfileV1, { fullName: 'Ada', nickname: 'Countess' }));
    await db.flush();
    await db.runMigrations([profileMigration]);
    expect(Obj.getValue(profile, ['alias'])).to.eq('Countess');

    const core = getObjectCore(profile);
    core.change((doc) => {
      const data = getDeep<Record<string, unknown>>(doc, [...core.mountPath, DATA_NAMESPACE]);
      invariant(data, 'expected a data body');
      delete data.nickname;
    });
    await db.flush();
    await db.foldForward([profileMigration]);

    expect(Obj.getValue(profile, ['alias'])).to.be.undefined;
  });

  test('a late write to a field the migration moved into meta folds into meta', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([KeyedV1, KeyedV2]);

    const keyed = db.add(Obj.make(KeyedV1, { name: 'Report', key: 'org.example.report' }));
    await db.flush();
    await db.runMigrations([keyedMigration]);
    expect(Obj.getMeta(keyed).key).to.eq('org.example.report');

    getObjectCore(keyed).setDecoded(['data', 'key'], 'org.example.summary');
    await db.flush();
    await db.foldForward([keyedMigration]);

    expect(Obj.getMeta(keyed).key).to.eq('org.example.summary');
  });

  test('a late write to one overlay leaves a direct edit to another overlaid property alone', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([PlanV1, PlanV2]);

    const plan = db.add(Obj.make(PlanV1, { title: 'Ship' }));
    await db.flush();
    Lens.put(plan, planLens, { priority: 'high', estimate: '1d' });
    await db.flush();
    await db.runMigrations([planMigration]);

    Obj.update(plan, (plan) => {
      Obj.setValue(plan, ['estimate'], '2d');
    });
    await db.flush();
    // An old client still viewing through the lens rewrites the overlay dictionary.
    Lens.put(plan, planLens, { priority: 'low', estimate: '1d' });
    await db.flush();
    await db.foldForward([planMigration]);

    expect(Obj.getValue(plan, ['estimate'])).to.eq('2d');
    expect(Obj.getConflict(plan, 'estimate')).toBeUndefined();
    expect(Obj.getValue(plan, ['priority'])).to.eq('low');
  });

  test('a step that fails to fold does not stop the later steps of the same object', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ScopeV1, ScopeV2, ScopeV3]);

    const failing12 = Migration.define({
      from: ScopeV1,
      to: ScopeV2,
      transform: (from) => {
        if (from.fullName === 'boom') {
          throw new Error('simulated transform failure');
        }
        return { name: from.fullName };
      },
    });
    const contact = db.add(Obj.make(ScopeV1, { fullName: 'Ada' }));
    await db.flush();
    await db.runMigrations([failing12, scopeMigration23]);

    const core = getObjectCore(contact);
    core.setDecoded(['data', 'fullName'], 'boom');
    core.setDecoded(['data', 'note'], 'late note');
    await db.flush();
    await db.foldForward([failing12, scopeMigration23]);

    expect(Obj.getValue(contact, ['label'])).to.eq('late note');
  });
});

describe('fold-forward: concurrent migrations to different versions', () => {
  test('a type register left behind the recorded steps is repaired, and the older step is not re-run', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([ContactV1, ContactV2, ContactV3]);

    const contact = db.add(Obj.make(ContactV1, { fullName: 'Ada Lovelace' }));
    await db.flush();
    await db.runMigrations([contactMigration, contactMigration23]);
    Obj.update(contact, (contact) => {
      Obj.setValue(contact, ['displayName'], 'Ada');
    });

    // Another peer's concurrent @1 -> @2 type write won the register.
    const core = getObjectCore(contact);
    core.change((doc) => {
      setDeep(doc, [...core.mountPath, 'system', 'type'], EncodedReference.fromURI(contactMigration.toType));
    });
    await db.flush();
    await db.runMigrations([contactMigration, contactMigration23]);

    expect(Obj.getTypeURI(contact)?.toString()).to.eq(contactMigration23.toType.toString());
    expect(Migration.getMigrationSteps(contact)).to.have.length(2);
    expect(Obj.getValue(contact, ['displayName'])).to.eq('Ada');
  });
});
