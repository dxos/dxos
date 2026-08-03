//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { beforeEach, describe, test } from 'vitest';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

import * as Lens from './Lens';

//
// Source and target are both declared types, mirroring the real case (a `DataType.Task` and a
// `GtdTask` written out beside it). They are local here because `@dxos/echo-panproto` sits in
// `core/echo` and must not depend on `sdk/types` — the shipped example lens belongs with the types
// it binds, not with the mechanism.
//

class Task extends Type.makeObject<Task>(DXN.make('org.dxos.test.Task', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    description: Schema.optional(Schema.String),
    status: Schema.optional(Schema.Literal('todo', 'in-progress', 'done')),
    priority: Schema.optional(Schema.Literal('none', 'low', 'medium', 'high', 'urgent')),
    /** Minutes. */
    estimate: Schema.optional(Schema.Number),
    author: Schema.optional(Schema.String),
    project: Schema.optional(Schema.String),
  }),
) {}

/** The target an interface is written against: same object, different shape. */
class GtdTask extends Type.makeObject<GtdTask>(DXN.make('org.dxos.test.GtdTask', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    description: Schema.optional(Schema.String),
    /** Lossy: `false` cannot say whether the task is `todo` or `in-progress`. */
    done: Schema.optional(Schema.Boolean),
    stage: Schema.optional(Schema.Literal('todo', 'in-progress', 'done')),
    priority: Schema.optional(Schema.Number),
    estimateHours: Schema.optional(Schema.Number),
    createdBy: Schema.optional(Schema.String),
    /** No counterpart on `Task` — overlay-backed. */
    context: Schema.optional(Schema.Literal('@home', '@work')),
    waitingOn: Schema.optional(Schema.String),
  }),
) {}

const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;

const makeLens = () =>
  Lens.make('org.dxos.test.lens.gtd', Task, GtdTask, {
    // `title` and `description` match by name and type — absent from the mapping entirely.
    estimateHours: Lens.from('estimate', Lens.scale(1 / 60)),
    priority: Lens.from(
      'priority',
      Lens.lookup({ none: 1, low: 2, medium: 3, high: 4, urgent: 5 } as Record<string, number>),
    ),
    createdBy: Lens.readOnly('author'),
    done: {
      from: ['status'],
      get: ({ status }) => status === 'done',
      put: (done: boolean | undefined, { status }) => ({
        status: done === true ? ('done' as const) : status === 'done' ? ('todo' as const) : status,
      }),
    },
    stage: {
      from: ['status'],
      get: ({ status }) => status,
      put: (stage: 'todo' | 'in-progress' | 'done' | undefined) => ({ status: stage }),
    },
    // `context`, `waitingOn`: no counterpart, overlay-backed automatically.
  });

const makeTask = () =>
  Obj.make(Task, {
    title: 'Write the design doc',
    description: 'Two lenses, four stories.',
    status: 'in-progress',
    priority: 'high',
    estimate: 90,
    author: 'josiah',
    project: 'lenses',
  });

describe('Lens mapping resolution', () => {
  test('resolves explicit, automatic, overlay, and dropped', ({ expect }) => {
    const coverage = Lens.coverage(makeLens());

    expect([...coverage.explicit].sort()).to.deep.eq(['createdBy', 'done', 'estimateHours', 'priority', 'stage']);
    // Nothing was written for these: same name, compatible type.
    expect([...coverage.automatic].sort()).to.deep.eq(['description', 'title']);
    // No counterpart on the source, so they store themselves rather than erroring.
    expect([...coverage.overlaid].sort()).to.deep.eq(['context', 'waitingOn']);
    // Read by nothing; restored by `put` from the live object.
    expect([...coverage.dropped].sort()).to.deep.eq(['project']);
    expect(coverage.suspicious).to.deep.eq([]);
  });

  test('a name match with an incompatible type is suspicious, not silently overlaid', ({ expect }) => {
    class Other extends Type.makeObject<Other>(DXN.make('org.dxos.test.Other', '0.1.0'))(
      Schema.Struct({
        // Same name as `Task.status`, different vocabulary.
        status: Schema.optional(Schema.Literal('open', 'closed')),
      }),
    ) {}

    const coverage = Lens.coverage(Lens.make('org.dxos.test.lens.other', Task, Other, {}));
    expect(coverage.suspicious).to.deep.eq([{ property: 'status', candidates: ['status'] }]);
    // Critically NOT overlaid: that would record the same fact twice and let the copies drift.
    expect(coverage.overlaid).to.deep.eq([]);
    expect(coverage.automatic).to.deep.eq([]);
  });

  test('an optional source cannot feed a required target', ({ expect }) => {
    class Required extends Type.makeObject<Required>(DXN.make('org.dxos.test.Required', '0.1.0'))(
      Schema.Struct({ estimate: Schema.Number }),
    ) {}

    const coverage = Lens.coverage(Lens.make('org.dxos.test.lens.required', Task, Required, {}));
    expect(coverage.automatic).to.deep.eq([]);
    expect(coverage.suspicious).to.deep.eq([{ property: 'estimate', candidates: ['estimate'] }]);
  });

  test('a mapping naming an unknown source property fails at definition time', ({ expect }) => {
    expect(() => Lens.make('org.dxos.test.lens.bad', Task, GtdTask, { done: 'nope' as any })).to.throw(
      /unknown source property/,
    );
  });
});

describe('Lens.get', () => {
  test('projects the object through the mapping', ({ expect }) => {
    const task = makeTask();
    const view = Lens.get(task, makeLens());

    expect(view.title).to.eq('Write the design doc');
    expect(view.description).to.eq('Two lenses, four stories.');
    expect(view.done).to.eq(false);
    expect(view.stage).to.eq('in-progress');
    expect(view.priority).to.eq(4);
    expect(view.estimateHours).to.eq(1.5);
    expect(view.createdBy).to.eq('josiah');
    // Identity is never lensed.
    expect(view.id).to.eq(task.id);
    // Dropped from the view, still on the object.
    expect(Object.keys(view)).not.to.include('project');
    expect(task.project).to.eq('lenses');
  });
});

describe('Lens.put', () => {
  test('writes only the properties the mapping names', ({ expect }) => {
    const task = makeTask();
    const lens = makeLens();

    const writes = Lens.writesFor(task, lens, { done: true });
    expect(writes).to.deep.eq([{ kind: 'assign', path: ['status'], value: 'done' }]);

    Lens.put(task, lens, { done: true });
    expect(task.status).to.eq('done');
    // Everything the write did not name is untouched — this is what lets a concurrent peer's edits
    // to other properties survive.
    expect(task.title).to.eq('Write the design doc');
    expect(task.priority).to.eq('high');
    expect(task.estimate).to.eq(90);
  });

  test('inverts value conversions', ({ expect }) => {
    const task = makeTask();
    const lens = makeLens();

    Lens.put(task, lens, { estimateHours: 2 });
    expect(task.estimate).to.eq(120);

    Lens.put(task, lens, { priority: 5 });
    expect(task.priority).to.eq('urgent');
  });

  test('the lossy split restores the discarded distinction from the live object', ({ expect }) => {
    const lens = makeLens();

    // `done: false` alone cannot say todo vs in-progress; `from: ['status']` is the complement.
    const inProgress = makeTask();
    Lens.put(inProgress, lens, { done: false });
    expect(inProgress.status).to.eq('in-progress');

    const finished = Obj.make(Task, { title: 'x', status: 'done' });
    Lens.put(finished, lens, { done: false });
    expect(finished.status).to.eq('todo');
  });

  test('a read-only property rejects the write instead of dropping it', ({ expect }) => {
    const task = makeTask();
    expect(() => Lens.put(task, makeLens(), { createdBy: 'someone-else' })).to.throw(/read-only/);
    expect(task.author).to.eq('josiah');
  });

  test('a property that is neither mapped nor overlaid is rejected', ({ expect }) => {
    const task = makeTask();
    expect(() => Lens.put(task, makeLens(), { nope: 1 } as any)).to.throw(/not a property of the target/);
  });
});

describe('overlay storage', () => {
  test('a target property with no counterpart persists in the annotation dictionary', ({ expect }) => {
    const task = makeTask();
    const lens = makeLens();

    Lens.put(task, lens, { context: '@work', waitingOn: 'review' });

    // It reads back through the lens...
    const view = Lens.get(task, lens);
    expect(view.context).to.eq('@work');
    expect(view.waitingOn).to.eq('review');

    // ...and it lives in the base object's own metadata, not in a second object.
    expect(Lens.getOverlays(task, lens.id)).to.deep.eq({ context: '@work', waitingOn: 'review' });
    expect(Option.getOrThrow(Annotation.get(task, Lens.OverlayAnnotation))).to.deep.eq({
      [lens.id]: { context: '@work', waitingOn: 'review' },
    });

    // No stray property landed on the base object.
    expect(Object.keys(task)).not.to.include('context');
  });

  test('two lenses over the same object keep separate overlays', ({ expect }) => {
    const task = makeTask();
    const first = makeLens();
    const second = Lens.make('org.dxos.test.lens.gtd-two', Task, GtdTask, {});

    Lens.put(task, first, { waitingOn: 'first' });
    Lens.put(task, second, { waitingOn: 'second' });

    expect(Lens.getOverlay(task, first.id, 'waitingOn')).to.eq('first');
    expect(Lens.getOverlay(task, second.id, 'waitingOn')).to.eq('second');
  });

  test('writing undefined clears an overlay', ({ expect }) => {
    const task = makeTask();
    const lens = makeLens();

    Lens.put(task, lens, { context: '@home' });
    Lens.put(task, lens, { context: undefined });
    expect(Lens.getOverlay(task, lens.id, 'context')).to.be.undefined;
  });
});

describe('Lens.of — the live handle', () => {
  test('reads project the base object', ({ expect }) => {
    const task = makeTask();
    const gtd = Lens.of(task, makeLens());

    expect(gtd.title).to.eq('Write the design doc');
    expect(gtd.done).to.eq(false);
    expect(gtd.estimateHours).to.eq(1.5);
    expect(gtd.id).to.eq(task.id);
  });

  test('reads are live: a change to the base object shows through the lens', ({ expect }) => {
    const task = makeTask();
    const gtd = Lens.of(task, makeLens());

    Obj.update(task, (task) => {
      task.status = 'done';
    });

    expect(gtd.done).to.eq(true);
    expect(gtd.stage).to.eq('done');
  });

  test('it reports the TARGET type, which is what makes existing interfaces resolve', ({ expect }) => {
    const task = makeTask();
    const gtd = Lens.of(task, makeLens());

    expect(Obj.getTypename(gtd)).to.eq('org.dxos.test.GtdTask');
    expect(Obj.getTypename(task)).to.eq('org.dxos.test.Task');
    // ...while identity still resolves to the one underlying object.
    expect(Obj.getURI(gtd)).to.eq(Obj.getURI(task));
    expect(gtd.id).to.eq(task.id);
  });

  test('Obj.update writes through the lens, batching into one change', ({ expect }) => {
    const task = makeTask();
    const gtd = Lens.of(task, makeLens());

    let notifications = 0;
    const unsubscribe = Obj.subscribe(task, () => {
      notifications++;
    });

    Obj.update(gtd, (gtd) => {
      gtd.done = true;
      gtd.estimateHours = 3;
      gtd.context = '@work';
    });
    unsubscribe();

    expect(task.status).to.eq('done');
    expect(task.estimate).to.eq(180);
    expect(Lens.getOverlay(task, 'org.dxos.test.lens.gtd', 'context')).to.eq('@work');
    // One transaction for the whole callback, not one per assignment.
    expect(notifications).to.eq(1);
  });

  test('direct mutation outside a change transaction throws, as it does on any ECHO object', ({ expect }) => {
    const gtd = Lens.of(makeTask(), makeLens());
    // The lensed shape is readonly, so a typed caller cannot get here at all; the runtime guard is
    // what stops an untyped one from writing outside a transaction.
    expect(() => Reflect.set(gtd, 'done', true)).to.throw(/inside Obj.update/);
  });

  test('metadata reads reach the base object', ({ expect }) => {
    const task = makeTask();
    const gtd = Lens.of(task, makeLens());
    expect(Obj.getMeta(gtd).keys).to.deep.eq(Obj.getMeta(task).keys);
  });
});

describe('Lens.checkLaws', () => {
  test('the mapping round-trips', ({ expect }) => {
    const result = Lens.checkLaws(makeTask(), makeLens());
    expect(result.violations).to.deep.eq([]);
    expect(result.holds).to.be.true;
    // A read-only property has no round trip to check, and says so rather than passing silently.
    expect(result.readOnly).to.deep.eq(['createdBy']);
  });

  test('every priority round-trips through the conversion', ({ expect }) => {
    const lens = makeLens();
    for (const priority of PRIORITIES) {
      const task = Obj.make(Task, { title: 'x', priority });
      expect(Lens.checkLaws(task, lens).holds, priority).to.be.true;
    }
  });

  test('a lens that loses information fails the law', ({ expect }) => {
    class Lossy extends Type.makeObject<Lossy>(DXN.make('org.dxos.test.Lossy', '0.1.0'))(
      Schema.Struct({ initial: Schema.optional(Schema.String) }),
    ) {}

    // Reading the first character is not invertible: `put` cannot restore the rest of the title.
    const lens = Lens.make('org.dxos.test.lens.lossy', Task, Lossy, {
      initial: {
        from: ['title'],
        get: ({ title }) => title?.[0],
        put: (initial: string | undefined) => ({ title: initial ?? '' }),
      },
    });

    const result = Lens.checkLaws(makeTask(), lens);
    expect(result.holds).to.be.false;
    expect(result.violations[0].property).to.eq('initial');
    expect(result.violations[0].path).to.eq('title');
  });
});

describe('registry', () => {
  beforeEach(() => Lens.clear());

  test('resolves by source and by target', ({ expect }) => {
    const lens = Lens.register(makeLens());

    expect(Lens.resolve(lens.id)).to.eq(lens);
    // "How else can I view this object?"
    expect(Lens.lensesFor(Task)).to.deep.eq([lens]);
    // "What can this interface accept?" — the reverse lookup that lets one UI serve many sources.
    expect(Lens.sourcesFor(GtdTask)).to.deep.eq([lens]);
    expect(Lens.sourcesFor(Task)).to.deep.eq([]);
  });
});

describe('persistence', () => {
  test('a declarative mapping serializes and rehydrates', ({ expect }) => {
    Lens.registerCodec('minutes-to-hours', Lens.scale(1 / 60));
    const lens = Lens.make('org.dxos.test.lens.persisted', Task, GtdTask, {
      estimateHours: Lens.from('estimate', 'minutes-to-hours'),
      createdBy: Lens.readOnly('author'),
      stage: 'status',
    });

    const stored = Lens.toObject(lens, { name: 'GTD' });
    expect(stored.source).to.eq(Type.getURI(Task));
    expect(stored.target).to.eq(Type.getURI(GtdTask));
    // Automatic mappings are recomputed on load, so they are not stored.
    expect(stored.entries.map((entry) => entry.property).sort()).to.deep.eq(['createdBy', 'estimateHours', 'stage']);

    const rehydrated = Lens.fromObject(stored, Task, GtdTask);
    const task = makeTask();
    const view = Lens.get(task, rehydrated);
    expect(view.estimateHours).to.eq(1.5);
    expect(view.stage).to.eq('in-progress');
    // The automatic mappings came back.
    expect(view.title).to.eq('Write the design doc');
  });

  test('an inline mapping cannot be persisted, and says so', ({ expect }) => {
    expect(() => Lens.toObject(makeLens())).to.throw(/inline mapping/);
  });

  test('an unregistered codec name is caught at serialization', ({ expect }) => {
    const lens = Lens.make('org.dxos.test.lens.unregistered', Task, GtdTask, {
      estimateHours: Lens.from('estimate', 'no-such-codec'),
    });
    expect(() => Lens.toObject(lens)).to.throw(/unregistered codec/);
  });
});
