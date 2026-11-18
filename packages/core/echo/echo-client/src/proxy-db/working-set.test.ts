//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { type WorkingSetService } from '@dxos/protocols';
import { openAndClose } from '@dxos/test-utils';

import { EchoTestBuilder, type EchoTestPeer, makeTestWorkingSet } from '../testing/index.ts';
import { type DatabaseImpl } from './database.ts';

const MAX_BYTES = 10 * 1024 * 1024;

const setup = async () => {
  const builder = new EchoTestBuilder();
  await openAndClose(builder);
  const peer = await builder.createPeer({ types: [TestSchema.Task] });
  const writer = await peer.createDatabase();
  return { peer, writer };
};

/** A database of `writer`'s space, on a client of its own, over `workingSet`. */
const openWith = async (peer: EchoTestPeer, writer: DatabaseImpl, workingSet: WorkingSetService) => {
  const client = await peer.createClient();
  invariant(writer.rootUrl, 'database has no space root');
  const database = client.constructDatabase({ spaceId: writer.spaceId, spaceKey: writer.spaceKey, workingSet });
  await database.setSpaceRoot(writer.rootUrl);
  await database.open();
  return database;
};

describe('a database with a working set', () => {
  test('opens from the rows it is given, and snapshots nothing back for what it only reads', async ({ expect }) => {
    const { peer, writer } = await setup();
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'held' }));
    await writer.flush({ indexes: false });
    const workingSet = makeTestWorkingSet(writer.exportWorkingSet({ maxBytes: MAX_BYTES }));

    const database = await openWith(peer, writer, workingSet.service);
    expect(database.getObjectById<TestSchema.Task>(task.id)?.title).toBe('held');
    await database.close();
    expect(workingSet.puts.flatMap((put) => put.rows)).toEqual([]);
  });

  test('snapshots a write when it closes, from the heads it was given', async ({ expect }) => {
    const { peer, writer } = await setup();
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'held' }));
    await writer.flush({ indexes: false });
    const seeded = writer.exportWorkingSet({ maxBytes: MAX_BYTES });
    const row = seeded.find((entry) => entry.objectId === task.id);
    invariant(row, 'the task is not exported');
    const workingSet = makeTestWorkingSet(seeded);

    const database = await openWith(peer, writer, workingSet.service);
    const copy = database.getObjectById<TestSchema.Task>(task.id);
    invariant(copy, 'the task is not seeded');
    Obj.update(copy, (copy) => {
      copy.title = 'changed';
    });
    await database.close();

    const put = workingSet.puts.find((entry) => entry.rows.some(({ documentId }) => documentId === row.documentId));
    expect(put?.base[row.documentId]).toEqual(row.heads);
    expect(put?.rows.find(({ documentId }) => documentId === row.documentId)?.heads).not.toEqual(row.heads);
  });

  test("snapshots a new object's document and the space root that links it", async ({ expect }) => {
    const { peer, writer } = await setup();
    const workingSet = makeTestWorkingSet();
    const database = await openWith(peer, writer, workingSet.service);

    const task = database.add(Obj.make(TestSchema.Task, { title: 'new' }));
    await database.close();

    const sent = workingSet.puts.flatMap((put) => put.rows);
    expect(sent.some((row) => row.objectId === task.id)).toBe(true);
    expect(sent.some((row) => `automerge:${row.documentId}` === database.rootUrl)).toBe(true);
  });

  test("counts the working set's objects among its unindexed writes, also after a flush", async ({ expect }) => {
    const { peer, writer } = await setup();
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'held' }));
    await writer.flush();
    const workingSet = makeTestWorkingSet(writer.exportWorkingSet({ maxBytes: MAX_BYTES }));

    const database = await openWith(peer, writer, workingSet.service);
    expect([...database.unindexedWrites()]).toContain(task.id);
    await database.flush();
    expect([...database.unindexedWrites()]).toContain(task.id);
  });

  test('a working set that fails leaves the database as it is without one', async ({ expect }) => {
    const { peer, writer } = await setup();
    const failing: WorkingSetService = {
      get: () => Promise.reject(new Error('unavailable')),
      put: () => Promise.reject(new Error('unavailable')),
    };
    const database = await openWith(peer, writer, failing);

    const task = database.add(Obj.make(TestSchema.Task, { title: 'kept' }));
    await database.flush();
    expect((await database.query(Filter.id(task.id)).run()).map((entry) => entry.id)).toEqual([task.id]);
  });
});
