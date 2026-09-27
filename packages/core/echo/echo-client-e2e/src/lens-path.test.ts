//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { DXN, Filter, Lens, Obj, Query, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { PublicKey } from '@dxos/keys';

//
// `Lens.resolveView` over a real database: a `Task@2` object viewed as a `GtdTask` through a path that
// is never directly registered — only an invertible migration lens (`Task@1 -> Task@2`) and a
// hand-written view lens (`Task@1 -> GtdTask`) are. `Lens.findPath` walks the migration BACKWARDS
// (Task@2 -> Task@1) and then forwards through the view lens, exactly the shortest-path resolution
// DESIGN.md §10.7 q4 describes; there is one object in the database throughout.
//

class TaskV1 extends Type.makeObject<TaskV1>(DXN.make('org.dxos.test.lens-path.Task', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    description: Schema.optional(Schema.String),
    archived: Schema.optional(Schema.Boolean),
  }),
) {}

class TaskV2 extends Type.makeObject<TaskV2>(DXN.make('org.dxos.test.lens-path.Task', '0.2.0'))(
  Schema.Struct({
    title: Schema.String,
    note: Schema.optional(Schema.String),
    archived: Schema.optional(Schema.Boolean),
  }),
) {}

class GtdTask extends Type.makeObject<GtdTask>(DXN.make('org.dxos.test.lens-path.GtdTask', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    summary: Schema.optional(Schema.String),
  }),
) {}

const registerGraph = () => {
  const migration = Lens.register(
    Lens.make('org.dxos.test.lens-path.migration-v1-v2', TaskV1, TaskV2, { note: 'description' }),
  );
  const view = Lens.register(
    Lens.make('org.dxos.test.lens-path.v1-to-gtd', TaskV1, GtdTask, { summary: 'description' }),
  );
  return { migration, view };
};

describe('Lens.resolveView over a database-backed object', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    Lens.clear();
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
    Lens.clear();
  });

  test('a 2-hop resolved view reads and writes minimally on the base object', async ({ expect }) => {
    registerGraph();

    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [TaskV2] });
    await using db = await peer.createDatabase(spaceKey);

    const task = db.add(Obj.make(TaskV2, { title: 'Ship the lens graph', note: 'first draft', archived: false }));

    const resolved = Lens.resolveView(TaskV2, GtdTask);
    expect(resolved).to.exist;
    if (!resolved) {
      return;
    }

    const gtd = Lens.of(task, resolved);
    expect(Obj.getURI(gtd)).to.eq(Obj.getURI(task));
    expect(gtd.title).to.eq('Ship the lens graph');
    expect(gtd.summary).to.eq('first draft');

    Obj.update(gtd, (gtd) => {
      gtd.summary = 'ready for review';
    });

    // The write landed on `note` (the ONE property `summary` traces back to through both hops) and
    // touched nothing else — `title`/`archived` are exactly as they were.
    expect(task.note).to.eq('ready for review');
    expect(task.title).to.eq('Ship the lens graph');
    expect(task.archived).to.eq(false);

    await db.flush();
  });

  test('a lensed write is a single minimal change, visible on reload', async ({ expect }) => {
    registerGraph();

    await using peer = await builder.createPeer({ types: [TaskV2] });
    await using db = await peer.createDatabase();

    const task = db.add(Obj.make(TaskV2, { title: 'Reload me', note: 'before', archived: false }));
    const taskId = task.id;

    const resolved = Lens.resolveView(TaskV2, GtdTask);
    expect(resolved).to.exist;
    if (!resolved) {
      return;
    }

    Lens.put(task, resolved, { summary: 'after' });
    await db.flush();
    const heads = await db.getDocumentHeads();

    await peer.reload();
    await using reopened = await peer.openLastDatabase();
    await reopened.waitUntilHeadsReplicated(heads);
    await reopened.updateIndexes();

    const [reloaded] = await reopened.query(Query.select(Filter.type(TaskV2))).run();
    expect(reloaded).to.exist;
    expect(reloaded.id).to.eq(taskId);
    expect(reloaded.note).to.eq('after');
    expect(reloaded.title).to.eq('Reload me');

    const view = Lens.get(reloaded, resolved);
    expect(view.summary).to.eq('after');
    expect(view.title).to.eq('Reload me');
  });
});
