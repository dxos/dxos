//
// Copyright 2026 DXOS.org
//

import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { type SpaceId } from '@dxos/keys';

import { SpaceSync } from '../sync/space-sync.ts';
import { TestBuilder } from '../testing/harness.ts';
import { type OtherProcessCommand, RESULT } from './testing/database-subprocess-protocol.ts';

//
// Several processes on one file (F-8). The other process is a real one, since two connections in one
// thread cannot hold transactions at once: `node:sqlite` busy-waits synchronously, blocking the thread
// that would release the lock.
//

const TYPES = [TestSchema.Person];

const PACKAGE_DIR = join(import.meta.dirname, '../..');

/** vite-node's CLI, run by this node binary: it loads the same sources, `?raw` imports included, as the tests. */
const VITE_NODE = join(dirname(createRequire(import.meta.url).resolve('vite-node/package.json')), 'dist/cli.mjs');

/** Runs commands in another process against the space's database on `path`; resolves with its results. */
const inOtherProcess = async (path: string, spaceId: SpaceId, commands: OtherProcessCommand[]) => {
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [VITE_NODE, 'src/tests/testing/database-subprocess.ts', path, spaceId, JSON.stringify(commands)],
    { cwd: PACKAGE_DIR },
  );
  const line = stdout.split('\n').find((line) => line.startsWith(RESULT));
  if (!line) {
    throw new Error(`The other process returned no results:\n${stdout}`);
  }
  return JSON.parse(line.slice(RESULT.length));
};

const names = (people: readonly TestSchema.Person[]) => people.map((person) => person.name).sort();

describe('several processes on one file', { timeout: 60_000 }, () => {
  test("a query in one process sees another process's commit", async () => {
    await using builder = new TestBuilder();
    const peer = builder.createPeer({ types: TYPES });
    const db = await peer.createDatabase();

    const query = db.query(Filter.type(TestSchema.Person));
    const unsubscribe = query.subscribe(() => {}, { fire: true });
    await inOtherProcess(peer.path, db.spaceId, [{ op: 'add', names: ['Alice'] }]);
    await expect.poll(() => names(query.results)).toEqual(['Alice']);
    unsubscribe();
  });

  test("an object held in one process takes another process's edit, and the edits merge", async () => {
    await using builder = new TestBuilder();
    const peer = builder.createPeer({ types: TYPES });
    const db = await peer.createDatabase();

    const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    await db.flush();
    await inOtherProcess(peer.path, db.spaceId, [{ op: 'edit', id: person.id, name: 'Alice Smith' }]);
    await expect.poll(() => person.name).toBe('Alice Smith');

    Obj.update(person, (person) => {
      person.email = 'alice@example.com';
    });
    await db.flush();
    const [read] = await inOtherProcess(peer.path, db.spaceId, [{ op: 'read', id: person.id }]);
    expect(read).toMatchObject({ name: 'Alice Smith', email: 'alice@example.com' });
  });

  test('processes writing at once never take the same block sequence', async () => {
    await using builder = new TestBuilder();
    const peer = builder.createPeer({ types: TYPES });
    const db = await peer.createDatabase();

    const other = inOtherProcess(peer.path, db.spaceId, [
      { op: 'add', names: Array.from({ length: 20 }, (_, index) => `two ${index}`) },
    ]);
    for (let index = 0; index < 20; index++) {
      db.add(Obj.make(TestSchema.Person, { name: `one ${index}` }));
      await db.flush();
    }
    await other;
    await db.updateIndexes();
    expect(await db.query(Filter.type(TestSchema.Person)).run()).toHaveLength(40);
  });

  test('one connection holds the sync lease, and another takes it when it is released or lapses', async () => {
    await using builder = new TestBuilder();
    const first = builder.createPeer({ types: TYPES });
    const second = builder.createPeer({ types: TYPES, path: first.path });
    const db1 = await first.createDatabase();
    const db2 = await second.openDatabase(db1.spaceId);

    expect(await db1.holdSyncLease('one', 200)).toBe(true);
    expect(await db2.holdSyncLease('two', 200)).toBe(false);
    expect(await db1.holdSyncLease('one', 200)).toBe(true);
    await db1.releaseSyncLease('one');
    expect(await db2.holdSyncLease('two', 200)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(await db1.holdSyncLease('one', 200)).toBe(true);
  });

  test("the lease holder pushes another process's writes to the authority", async () => {
    await using builder = new TestBuilder();
    const authority = builder.createAuthority();
    const local = builder.createPeer({ types: TYPES });
    const remote = builder.createPeer({ types: TYPES });
    const db = await local.createDatabase();
    const dbRemote = await remote.openDatabase(db.spaceId);
    const sync = new SpaceSync(db, authority.connect(db.spaceId), { leaseRenew: 100 });
    const syncRemote = remote.sync(dbRemote, authority);
    await sync.synced();
    expect(sync.leading).toBe(true);

    // Written by a process that does not sync; this one pushes it.
    await inOtherProcess(local.path, db.spaceId, [{ op: 'add', names: ['from the other process'] }]);
    await expect
      .poll(
        async () => {
          await syncRemote.synced();
          return names(await dbRemote.query(Filter.type(TestSchema.Person)).run());
        },
        { timeout: 10_000 },
      )
      .toEqual(['from the other process']);
    await sync.close();
  });
});
