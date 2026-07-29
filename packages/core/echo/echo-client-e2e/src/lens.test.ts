//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { Lens } from '@dxos/echo-panproto';
import { PublicKey } from '@dxos/keys';
import { Task } from '@dxos/types';

//
// The object lens against a real database: an automerge-backed `Task` viewed through a
// second declared type. There is one object in the database throughout — the lens is a view of it.
//
// The two-peer test is the point of the whole design: one peer drives the object through its
// canonical type while the other drives the same object through the lens, and both survive. That only
// holds because a lens write names exactly the properties it changes.
//

/** The target an interface would be written against. Declared, not derived. */
class GtdTask extends Type.makeObject<GtdTask>(DXN.make('org.dxos.test.GtdTask', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    description: Schema.optional(Schema.String),
    /** Lossy: `false` cannot say whether the task is `todo` or `in-progress`. */
    done: Schema.optional(Schema.Boolean),
    stage: Schema.optional(Schema.Literal('todo', 'in-progress', 'done')),
    urgency: Schema.optional(Schema.Number),
    /** Neither of these exists on `Task` — both are overlay-backed. */
    context: Schema.optional(Schema.Literal('@home', '@work')),
    waitingOn: Schema.optional(Schema.String),
  }),
) {}

const LENS_ID = 'org.dxos.test.lens.task-as-gtd';

const taskAsGtd = () =>
  Lens.make(LENS_ID, Task.Task, GtdTask, {
    // `title` and `description` match by name and type, so they are absent from the mapping.
    urgency: Lens.from(
      'priority',
      Lens.lookup({ none: 1, low: 2, medium: 3, high: 4, urgent: 5 } as Record<string, number>),
    ),
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
  });

const makeTask = () =>
  Task.make({
    title: 'Land the object lens',
    description: 'One object, two interfaces.',
    status: 'in-progress',
    priority: 'high',
  });

describe('object lens over a database-backed object', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('reads and writes through the lens, and the data stays in the base object', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [Task.Task] });
    await using db = await peer.createDatabase(spaceKey);

    const lens = taskAsGtd();
    const task = db.add(makeTask());
    const gtd = Lens.of(task, lens);

    // The view is live and reports the target's type, so an interface written for `GtdTask` resolves.
    expect(Obj.getTypename(gtd)).to.eq('org.dxos.test.GtdTask');
    expect(Obj.getURI(gtd)).to.eq(Obj.getURI(task));
    expect(gtd.done).to.eq(false);
    expect(gtd.stage).to.eq('in-progress');
    expect(gtd.urgency).to.eq(4);

    Obj.update(gtd, (gtd) => {
      gtd.done = true;
      gtd.urgency = 5;
      gtd.context = '@work';
    });

    // Everything landed on the ONE underlying object, under its own schema...
    expect(task.status).to.eq('done');
    expect(task.priority).to.eq('urgent');
    // ...and the target-only property landed in that object's annotations, not as a stray field.
    expect(Lens.getOverlay(task, LENS_ID, 'context')).to.eq('@work');
    expect(Object.keys(task)).not.to.include('context');

    await db.flush();
  });

  test('the overlay survives a reload, because it is part of the object', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Task.Task] });
    const lens = taskAsGtd();

    await using db = await peer.createDatabase();
    const task = db.add(makeTask());
    const taskId = task.id;
    Lens.put(task, lens, { context: '@home', waitingOn: 'review' });
    await db.flush();
    const heads = await db.getDocumentHeads();

    await peer.reload();
    await using reopened = await peer.openLastDatabase();
    await reopened.waitUntilHeadsReplicated(heads);
    await reopened.updateIndexes();

    const [reloaded] = await reopened.query(Query.select(Filter.type(Task.Task))).run();
    expect(reloaded).to.exist;
    expect(reloaded.id).to.eq(taskId);

    const view = Lens.get(reloaded, lens);
    expect(view.context).to.eq('@home');
    expect(view.waitingOn).to.eq('review');
    // The base properties are intact too — the overlay is stored beside them, not instead of them.
    expect(view.title).to.eq('Land the object lens');
    expect(view.stage).to.eq('in-progress');
  });

  test('a lensed write touches only the properties it names', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [Task.Task] });
    await using db = await peer.createDatabase(spaceKey);

    const lens = taskAsGtd();
    const task = db.add(makeTask());

    // `done` maps to `status` alone; nothing else appears in the write set.
    expect(Lens.writesFor(task, lens, { done: true })).to.deep.eq([
      { kind: 'assign', path: ['status'], value: 'done' },
    ]);
  });

  test('two peers, one object: the canonical type and the lens edit it concurrently', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    const lens = taskAsGtd();

    await using peer1 = await builder.createPeer({ types: [Task.Task] });
    await using peer2 = await builder.createPeer({ types: [Task.Task] });
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    const task1 = db1.add(makeTask());
    await db1.flush();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();

    const [task2] = await db2.query(Query.select(Filter.type(Task.Task))).run();
    expect(task2).to.exist;
    expect(task2.id).to.eq(task1.id);

    // Peer 2 drives the object through the lens; peer 1 stays on the canonical type.
    const gtd2 = Lens.of(task2, lens);
    expect(gtd2.stage).to.eq('in-progress');

    // Concurrent, non-conflicting edits: peer 1 renames through `Task`, peer 2 completes through the
    // lens. A snapshot-style write from either side would have clobbered the other's property.
    Obj.update(task1, (task1) => {
      task1.title = 'Renamed by the canonical UI';
    });
    Obj.update(gtd2, (gtd2) => {
      gtd2.done = true;
      gtd2.context = '@work';
    });

    await db1.flush();
    await db2.flush();
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());

    // Both edits survive on both peers.
    await expect.poll(() => task1.status).toBe('done');
    await expect.poll(() => task2.title).toBe('Renamed by the canonical UI');
    expect(task1.title).to.eq('Renamed by the canonical UI');
    expect(task2.status).to.eq('done');

    // The lens's own change propagates in both directions, including the overlay.
    await expect.poll(() => Lens.getOverlay(task1, LENS_ID, 'context')).toBe('@work');
    expect(Lens.get(task1, lens).done).to.eq(true);

    // And a canonical-side change shows through the lens on the other peer.
    Obj.update(task1, (task1) => {
      task1.status = 'todo';
    });
    await db1.flush();
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await expect.poll(() => Lens.of(task2, lens).stage).toBe('todo');
    expect(Lens.of(task2, lens).done).to.eq(false);
  });
});
