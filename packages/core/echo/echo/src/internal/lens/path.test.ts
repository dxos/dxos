//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { beforeEach, describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Lens from '../../Lens.ts';
import * as Obj from '../../Obj.ts';
import * as Type from '../../Type.ts';

//
// A small version graph: two versions of `Task`, linked by an invertible migration lens, plus a
// separately declared `GtdTask` view. `Task@2 -> GtdTask@1` is reachable only by inverting the
// migration back to `Task@1` and then taking the hand-written view lens — the shortest path DESIGN.md
// §10.7 q4 describes.
//

class TaskV1 extends Type.makeObject<TaskV1>(DXN.make('org.dxos.test.lens.path.Task', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    description: Schema.optional(Schema.String),
    archived: Schema.optional(Schema.Boolean),
  }),
) {}

class TaskV2 extends Type.makeObject<TaskV2>(DXN.make('org.dxos.test.lens.path.Task', '0.2.0'))(
  Schema.Struct({
    title: Schema.String,
    note: Schema.optional(Schema.String),
    archived: Schema.optional(Schema.Boolean),
  }),
) {}

class GtdTask extends Type.makeObject<GtdTask>(DXN.make('org.dxos.test.lens.path.GtdTask', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    summary: Schema.optional(Schema.String),
  }),
) {}

/** Migration `Task@1 -> Task@2`: a bare rename plus an automatic pass-through, both invertible. */
const migrationV1toV2 = () =>
  Lens.make('org.dxos.test.lens.path.migration-v1-v2', TaskV1, TaskV2, { note: 'description' });

/** A hand-written view lens `Task@1 -> GtdTask`, never itself inverted in these tests. */
const v1ToGtd = () => Lens.make('org.dxos.test.lens.path.v1-to-gtd', TaskV1, GtdTask, { summary: 'description' });

const makeTaskV2 = () => Obj.make(TaskV2, { title: 'Ship it', note: 'release notes', archived: false });

describe('Lens.invert', () => {
  test('a rename-and-automatic lens inverts, and the round trip holds', ({ expect }) => {
    const forward = migrationV1toV2();
    const reversed = Lens.invert(forward);
    expect(reversed).to.exist;
    if (!reversed) {
      return;
    }

    const task = makeTaskV2();
    const view = Lens.get(task, reversed);
    expect(view.title).to.eq('Ship it');
    expect(view.description).to.eq('release notes');

    const result = Lens.checkLaws(task, reversed);
    expect(result.violations).to.deep.eq([]);
    expect(result.holds).to.be.true;
  });

  test('a lens with a Derived entry is not invertible', ({ expect }) => {
    class Lossy extends Type.makeObject<Lossy>(DXN.make('org.dxos.test.lens.path.Lossy', '0.1.0'))(
      Schema.Struct({ initial: Schema.optional(Schema.String) }),
    ) {}

    const lossy = Lens.make('org.dxos.test.lens.path.lossy', TaskV1, Lossy, {
      initial: {
        from: ['title'],
        get: ({ title }) => title?.[0],
        put: (initial: string | undefined) => ({ title: initial ?? '' }),
      },
    });

    expect(Lens.invert(lossy)).to.be.undefined;
  });

  test('a read-only property is not invertible', ({ expect }) => {
    class Readonly extends Type.makeObject<Readonly>(DXN.make('org.dxos.test.lens.path.Readonly', '0.1.0'))(
      Schema.Struct({ label: Schema.optional(Schema.String) }),
    ) {}

    const lens = Lens.make('org.dxos.test.lens.path.readonly', TaskV1, Readonly, {
      label: Lens.readOnly('title'),
    });

    expect(Lens.invert(lens)).to.be.undefined;
  });
});

describe('Lens.findPath / Lens.resolveView', () => {
  beforeEach(() => Lens.clear());

  test('a 2-hop path via an inverted migration lens', ({ expect }) => {
    const migration = Lens.register(migrationV1toV2());
    const view = Lens.register(v1ToGtd());

    const path = Lens.findPath(TaskV2, GtdTask);
    expect(path).to.exist;
    expect(path?.length).to.eq(2);
    expect(path?.[0].id).to.eq(`${migration.id}#inverted`);
    expect(path?.[1]).to.eq(view);

    const resolved = Lens.resolveView(TaskV2, GtdTask);
    expect(resolved).to.exist;
    if (!resolved) {
      return;
    }
    const task = makeTaskV2();
    expect(Lens.get(task, resolved).summary).to.eq('release notes');
  });

  test('a direct lens, once registered, is simply the shorter path', ({ expect }) => {
    Lens.register(migrationV1toV2());
    Lens.register(v1ToGtd());
    const direct = Lens.register(
      Lens.make('org.dxos.test.lens.path.v2-to-gtd-direct', TaskV2, GtdTask, { summary: 'note' }),
    );

    const path = Lens.findPath(TaskV2, GtdTask);
    expect(path).to.deep.eq([direct]);
  });

  test('deterministic tie-break between two equal-length paths', ({ expect }) => {
    class NodeX extends Type.makeObject<NodeX>(DXN.make('org.dxos.test.lens.path.X', '0.1.0'))(
      Schema.Struct({ title: Schema.String }),
    ) {}
    class NodeY1 extends Type.makeObject<NodeY1>(DXN.make('org.dxos.test.lens.path.Y1', '0.1.0'))(
      Schema.Struct({ title: Schema.String }),
    ) {}
    class NodeY2 extends Type.makeObject<NodeY2>(DXN.make('org.dxos.test.lens.path.Y2', '0.1.0'))(
      Schema.Struct({ title: Schema.String }),
    ) {}
    class NodeZ extends Type.makeObject<NodeZ>(DXN.make('org.dxos.test.lens.path.Z', '0.1.0'))(
      Schema.Struct({ title: Schema.String }),
    ) {}

    // Lexicographically, the "aa-…" pair sorts before the "zz-…" pair — that path must win.
    const viaY1First = Lens.register(Lens.make('org.dxos.test.lens.path.zz-x-y1', NodeX, NodeY1, {}));
    const viaY1Second = Lens.register(Lens.make('org.dxos.test.lens.path.zz-y1-z', NodeY1, NodeZ, {}));
    const viaY2First = Lens.register(Lens.make('org.dxos.test.lens.path.aa-x-y2', NodeX, NodeY2, {}));
    const viaY2Second = Lens.register(Lens.make('org.dxos.test.lens.path.aa-y2-z', NodeY2, NodeZ, {}));

    const path = Lens.findPath(NodeX, NodeZ);
    expect(path).to.deep.eq([viaY2First, viaY2Second]);
    expect(path).not.to.deep.eq([viaY1First, viaY1Second]);
  });

  test('unreachable types resolve to undefined', ({ expect }) => {
    class Island extends Type.makeObject<Island>(DXN.make('org.dxos.test.lens.path.Island', '0.1.0'))(
      Schema.Struct({ title: Schema.String }),
    ) {}

    Lens.register(migrationV1toV2());
    Lens.register(v1ToGtd());

    expect(Lens.findPath(Island, GtdTask)).to.be.undefined;
    expect(Lens.resolveView(Island, GtdTask)).to.be.undefined;
  });

  test('a non-invertible lens is not traversed backwards', ({ expect }) => {
    class Lossy extends Type.makeObject<Lossy>(DXN.make('org.dxos.test.lens.path.Lossy2', '0.1.0'))(
      Schema.Struct({ initial: Schema.optional(Schema.String) }),
    ) {}

    Lens.register(
      Lens.make('org.dxos.test.lens.path.lossy2', TaskV1, Lossy, {
        initial: {
          from: ['title'],
          get: ({ title }) => title?.[0],
          put: (initial: string | undefined) => ({ title: initial ?? '' }),
        },
      }),
    );

    // Forward is reachable; backward is not, because the lossy lens has no inverse edge.
    expect(Lens.findPath(TaskV1, Lossy)).to.deep.eq([Lens.resolve('org.dxos.test.lens.path.lossy2')]);
    expect(Lens.findPath(Lossy, TaskV1)).to.be.undefined;
  });
});

describe('Lens.compose', () => {
  beforeEach(() => Lens.clear());

  test('composes a chain into one lens with a minimal write set', ({ expect }) => {
    const migration = migrationV1toV2();
    const inverted = Lens.invert(migration);
    expect(inverted).to.exist;
    if (!inverted) {
      return;
    }
    const composed = Lens.compose(inverted, v1ToGtd());

    const task = makeTaskV2();
    const view = Lens.get(task, composed);
    expect(view.title).to.eq('Ship it');
    expect(view.summary).to.eq('release notes');

    // Writing `summary` alone must land on exactly `note` — never touch `title` or `archived`.
    const writes = Lens.writesFor(task, composed, { summary: 'updated' });
    expect(writes).to.deep.eq([{ kind: 'assign', path: ['note'], value: 'updated' }]);
  });

  test('composed coverage reports a property dropped mid-chain', ({ expect }) => {
    const migration = migrationV1toV2();
    const inverted = Lens.invert(migration);
    expect(inverted).to.exist;
    if (!inverted) {
      return;
    }
    const composed = Lens.compose(inverted, v1ToGtd());

    // `archived` survives the first hop (Task@2 -> Task@1, same name both sides) but `GtdTask` has no
    // counterpart for it at all — dropped at the SECOND hop, attributed back to the Task@2 property.
    expect(Lens.coverage(composed).dropped).to.deep.eq(['archived']);
  });

  test('checkLaws holds for the composed lens', ({ expect }) => {
    const migration = migrationV1toV2();
    const inverted = Lens.invert(migration);
    expect(inverted).to.exist;
    if (!inverted) {
      return;
    }
    const composed = Lens.compose(inverted, v1ToGtd());

    const result = Lens.checkLaws(makeTaskV2(), composed);
    expect(result.violations).to.deep.eq([]);
    expect(result.holds).to.be.true;
  });

  test('refuses to compose a coded lens', ({ expect }) => {
    // A coded lens's target need not be a declared ECHO type — a plain schema is enough to show the
    // opaque-transform case `compose` refuses.
    const codedTarget = Schema.Struct({ title: Schema.String });
    const coded = Lens.coded('org.dxos.test.lens.path.coded', TaskV1, codedTarget, {
      get: (task) => ({ title: task.title }),
      put: (next) =>
        next.title !== undefined ? [{ kind: 'assign' as const, path: ['title'], value: next.title }] : [],
    });

    expect(() => Lens.compose(coded, v1ToGtd())).to.throw(/declarative lenses/);
  });
});
