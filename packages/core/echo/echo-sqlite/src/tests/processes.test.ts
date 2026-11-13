//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { SpaceSync } from '../sync/space-sync.ts';
import { TestBuilder } from '../testing/harness.ts';

const TYPES = [TestSchema.Person];

//
// Several processes on one file (F-8). Each `TestPeer` opened on the same path holds its own SQLite
// connection, which is all SQLite can tell of a process: they share nothing but the file.
//

const names = (people: readonly TestSchema.Person[]) => people.map((person) => person.name).sort();

describe('several connections to one file', () => {
  test("a query in one connection sees another connection's commit", async () => {
    await using builder = new TestBuilder();
    const first = builder.createPeer({ types: TYPES });
    const second = builder.createPeer({ types: TYPES, path: first.path });
    const db1 = await first.createDatabase();
    const db2 = await second.openDatabase(db1.spaceId);

    const query = db2.query(Filter.type(TestSchema.Person));
    const unsubscribe = query.subscribe(() => {}, { fire: true });
    db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    await db1.flush();
    await expect.poll(() => names(query.results)).toEqual(['Alice']);
    unsubscribe();
  });

  test("an object held in one connection takes another connection's edit", async () => {
    await using builder = new TestBuilder();
    const first = builder.createPeer({ types: TYPES });
    const second = builder.createPeer({ types: TYPES, path: first.path });
    const db1 = await first.createDatabase();
    const db2 = await second.openDatabase(db1.spaceId);

    const person = db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    await db1.flush();
    const [held] = await db2.query(Filter.id(person.id)).run();
    Obj.update(person, (person) => {
      person.name = 'Alice Smith';
    });
    await db1.flush();
    await expect.poll(() => held.name).toBe('Alice Smith');

    // And the other way: an edit of the refreshed copy merges with the first connection's.
    Obj.update(held, (held) => {
      held.email = 'alice@example.com';
    });
    await db2.flush();
    await expect.poll(() => person.email).toBe('alice@example.com');
    expect(person.name).toBe('Alice Smith');
  });

  // Interleaved rather than overlapped: two connections in one thread cannot overlap transactions, since
  // `node:sqlite` busy-waits synchronously and would block the thread that holds the lock.
  test('connections writing in turn never take the same block sequence', async () => {
    await using builder = new TestBuilder();
    const first = builder.createPeer({ types: TYPES });
    const second = builder.createPeer({ types: TYPES, path: first.path });
    const db1 = await first.createDatabase();
    const db2 = await second.openDatabase(db1.spaceId);

    for (let round = 0; round < 10; round++) {
      db1.add(Obj.make(TestSchema.Person, { name: `one ${round}` }));
      db2.add(Obj.make(TestSchema.Person, { name: `two ${round}` }));
      await db1.flush();
      await db2.flush();
    }
    await db1.updateIndexes();
    expect(await db1.query(Filter.type(TestSchema.Person)).run()).toHaveLength(20);
  });

  test('one connection syncs for all: it pushes the others’ writes, and another takes over when it stops', async () => {
    await using builder = new TestBuilder();
    const authority = builder.createAuthority();
    const first = builder.createPeer({ types: TYPES });
    const second = builder.createPeer({ types: TYPES, path: first.path });
    const remote = builder.createPeer({ types: TYPES });
    const db1 = await first.createDatabase();
    const db2 = await second.openDatabase(db1.spaceId);
    const dbRemote = await remote.openDatabase(db1.spaceId);

    const options = { leaseTtl: 300, leaseRenew: 50 };
    const sync1 = new SpaceSync(db1, authority.connect(db1.spaceId), options);
    await sync1.synced();
    const sync2 = new SpaceSync(db2, authority.connect(db2.spaceId), options);
    await sync2.synced();
    const syncRemote = remote.sync(dbRemote, authority);
    expect([sync1.leading, sync2.leading]).toEqual([true, false]);

    // Written by the connection that does not sync; the leader pushes it.
    db2.add(Obj.make(TestSchema.Person, { name: 'from the follower' }));
    await db2.flush();
    await expect
      .poll(
        async () => {
          await dbRemote.updateIndexes();
          return names(await dbRemote.query(Filter.type(TestSchema.Person)).run());
        },
        { timeout: 5_000 },
      )
      .toEqual(['from the follower']);

    // The leader stops; the other connection takes the lease and syncs from then on.
    sync1.close();
    await expect.poll(() => sync2.leading, { timeout: 5_000 }).toBe(true);
    dbRemote.add(Obj.make(TestSchema.Person, { name: 'from elsewhere' }));
    await dbRemote.flush();
    await syncRemote.synced();
    await expect
      .poll(async () => names(await db2.query(Filter.type(TestSchema.Person)).run()), { timeout: 5_000 })
      .toEqual(['from elsewhere', 'from the follower']);
    sync2.close();
  });
});
