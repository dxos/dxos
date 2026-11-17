//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { type WorkingSetReport, type WorkingSetRow, type WorkingSetService } from '@dxos/protocols';
import { openAndClose } from '@dxos/test-utils';

import { EchoTestBuilder, type EchoTestPeer } from '../testing/index.ts';
import { type DatabaseImpl } from './database.ts';

const MAX_BYTES = 10 * 1024 * 1024;

/** A working set kept in memory, as its owner keeps it: one row per document, and every send it took. */
const makeWorkingSet = (rows: WorkingSetRow[] = []) => {
  const held = new Map(rows.map((row) => [row.documentId, row]));
  const puts: WorkingSetReport[] = [];
  const service: WorkingSetService = {
    get: async () => ({ rows: [...held.values()] }),
    put: async (report) => {
      puts.push(report);
      report.rows.forEach((row) => held.set(row.documentId, row));
    },
  };
  return { service, puts, sent: () => puts.flatMap((put) => put.rows) };
};

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

describe('WorkingSetSync', () => {
  test('opens from the rows it is given, and sends nothing back for what it only reads', async ({ expect }) => {
    const { peer, writer } = await setup();
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'held' }));
    await writer.flush({ indexes: false });
    const workingSet = makeWorkingSet(writer.exportWorkingSet({ maxBytes: MAX_BYTES }));

    const database = await openWith(peer, writer, workingSet.service);
    expect(database.getObjectById<TestSchema.Task>(task.id)?.title).toBe('held');
    await database.flush({ indexes: false });
    expect(workingSet.sent()).toEqual([]);
  });

  test('sends a write once the host stores it, from the heads it was given', async ({ expect }) => {
    const { peer, writer } = await setup();
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'held' }));
    await writer.flush({ indexes: false });
    const seeded = writer.exportWorkingSet({ maxBytes: MAX_BYTES });
    const row = seeded.find((entry) => entry.objectId === task.id);
    invariant(row, 'the task is not exported');
    const workingSet = makeWorkingSet(seeded);

    const database = await openWith(peer, writer, workingSet.service);
    const copy = database.getObjectById<TestSchema.Task>(task.id);
    invariant(copy, 'the task is not seeded');
    Obj.update(copy, (copy) => {
      copy.title = 'changed';
    });
    await database.flush({ indexes: false });

    const put = workingSet.puts.find((entry) => entry.rows.some(({ documentId }) => documentId === row.documentId));
    expect(put?.base[row.documentId]).toEqual(row.heads);
    expect(put?.rows.find(({ documentId }) => documentId === row.documentId)?.heads).not.toEqual(row.heads);
  });

  test("sends a new object's document and the space root that links it", async ({ expect }) => {
    const { peer, writer } = await setup();
    const workingSet = makeWorkingSet();
    const database = await openWith(peer, writer, workingSet.service);

    const task = database.add(Obj.make(TestSchema.Task, { title: 'new' }));
    await database.flush({ indexes: false });

    const sent = workingSet.sent();
    expect(sent.some((row) => row.objectId === task.id)).toBe(true);
    expect(sent.some((row) => `automerge:${row.documentId}` === database.rootUrl)).toBe(true);
  });

  test('sends a write made just before it closes', async ({ expect }) => {
    const { peer, writer } = await setup();
    const workingSet = makeWorkingSet();
    const database = await openWith(peer, writer, workingSet.service);

    const task = database.add(Obj.make(TestSchema.Task, { title: 'last' }));
    await database.close();

    expect(workingSet.sent().some((row) => row.objectId === task.id)).toBe(true);
  });

  test("counts the working set's objects among its unindexed writes, also after a flush", async ({ expect }) => {
    const { peer, writer } = await setup();
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'held' }));
    await writer.flush();
    const workingSet = makeWorkingSet(writer.exportWorkingSet({ maxBytes: MAX_BYTES }));

    const database = await openWith(peer, writer, workingSet.service);
    expect([...database.unindexedWrites()]).toContain(task.id);
    await database.flush();
    expect([...database.unindexedWrites()]).toContain(task.id);
  });

  test('a close waits for an absorb in flight, which then takes nothing', async ({ expect }) => {
    const { peer, writer } = await setup();
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'held' }));
    await writer.flush({ indexes: false });
    const workingSet = makeWorkingSet();
    const released = new Trigger();
    let gated = false;
    const service: WorkingSetService = {
      get: async () => {
        if (gated) {
          await released.wait();
        }
        return workingSet.service.get();
      },
      put: workingSet.service.put,
    };
    const database = await openWith(peer, writer, service);
    await workingSet.service.put({ rows: writer.exportWorkingSet({ maxBytes: MAX_BYTES }), base: {} });

    gated = true;
    const absorbing = database.absorbWorkingSet();
    const closing = database.close();
    expect(await Promise.race([closing.then(() => 'closed'), sleep(200).then(() => 'waiting')])).toBe('waiting');
    released.wake();
    await Promise.all([absorbing, closing]);
    expect([...database.unindexedWrites()]).not.toContain(task.id);
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
