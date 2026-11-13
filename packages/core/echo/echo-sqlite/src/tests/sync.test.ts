//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { type SqliteDatabase } from '../database.ts';
import { type SpaceSync } from '../sync/space-sync.ts';
import { TestBuilder } from '../testing/harness.ts';

const TYPES = [TestSchema.Organization, TestSchema.Person];

/**
 * Flushes every database and waits until no sync round is running, twice over, so an announcement
 * sent during the first pass is acted on in the second.
 */
const settle = async (...pairs: [SqliteDatabase, SpaceSync][]): Promise<void> => {
  for (let pass = 0; pass < 3; pass++) {
    for (const [db, sync] of pairs) {
      await db.flush();
      await sync.synced();
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe('sync through an authority', () => {
  test('an object created on one peer reaches another', async () => {
    await using builder = new TestBuilder();
    const authority = builder.createAuthority();
    const alice = builder.createPeer({ types: TYPES });
    const bob = builder.createPeer({ types: TYPES });

    const dbA = await alice.createDatabase();
    const dbB = await bob.openDatabase(dbA.spaceId);
    const syncA = alice.sync(dbA, authority);
    const syncB = bob.sync(dbB, authority);

    dbA.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
    await settle([dbA, syncA], [dbB, syncB]);

    const orgs = await dbB.query(Filter.type(TestSchema.Organization)).run();
    expect(orgs.map((org) => org.name)).toEqual(['DXOS']);
  });

  test('concurrent edits to different fields both survive', async () => {
    await using builder = new TestBuilder();
    const authority = builder.createAuthority();
    const alice = builder.createPeer({ types: TYPES });
    const bob = builder.createPeer({ types: TYPES });

    const dbA = await alice.createDatabase();
    const dbB = await bob.openDatabase(dbA.spaceId);
    const syncA = alice.sync(dbA, authority);
    const syncB = bob.sync(dbB, authority);

    const person = dbA.add(Obj.make(TestSchema.Person, { name: 'Alice', email: 'a@example.com' }));
    await settle([dbA, syncA], [dbB, syncB]);
    const [copy] = await dbB.query(Filter.type(TestSchema.Person)).run();

    await syncA.close();
    Obj.update(person, (person) => {
      person.name = 'Alice Smith';
    });
    Obj.update(copy, (copy) => {
      copy.email = 'alice@example.com';
    });
    await dbA.flush();
    await settle([dbB, syncB]);
    const resumed = alice.sync(dbA, authority);
    await settle([dbA, resumed], [dbB, syncB]);

    for (const db of [dbA, dbB]) {
      const [result] = await db.query(Filter.type(TestSchema.Person)).run();
      expect({ name: result.name, email: result.email }).toEqual({
        name: 'Alice Smith',
        email: 'alice@example.com',
      });
    }
    // The resident objects show the merge too, not only fresh query results.
    expect(person.email).toBe('alice@example.com');
    expect(copy.name).toBe('Alice Smith');
  });

  test('concurrent edits to one string merge as text', async () => {
    await using builder = new TestBuilder();
    const authority = builder.createAuthority();
    const alice = builder.createPeer({ types: TYPES });
    const bob = builder.createPeer({ types: TYPES });

    const dbA = await alice.createDatabase();
    const dbB = await bob.openDatabase(dbA.spaceId);
    const syncA = alice.sync(dbA, authority);
    const syncB = bob.sync(dbB, authority);

    const org = dbA.add(Obj.make(TestSchema.Organization, { name: 'quick fox' }));
    await settle([dbA, syncA], [dbB, syncB]);
    const [copy] = await dbB.query(Filter.type(TestSchema.Organization)).run();

    await syncA.close();
    Obj.update(org, (org) => {
      org.name = 'the quick fox';
    });
    Obj.update(copy, (copy) => {
      copy.name = 'quick brown fox';
    });
    await dbA.flush();
    await settle([dbB, syncB]);
    const resumed = alice.sync(dbA, authority);
    await settle([dbA, resumed], [dbB, syncB]);

    expect(org.name).toBe('the quick brown fox');
    expect(copy.name).toBe('the quick brown fox');
  });

  test('a deletion reaches another peer', async () => {
    await using builder = new TestBuilder();
    const authority = builder.createAuthority();
    const alice = builder.createPeer({ types: TYPES });
    const bob = builder.createPeer({ types: TYPES });

    const dbA = await alice.createDatabase();
    const dbB = await bob.openDatabase(dbA.spaceId);
    const syncA = alice.sync(dbA, authority);
    const syncB = bob.sync(dbB, authority);

    const org = dbA.add(Obj.make(TestSchema.Organization, { name: 'Gone' }));
    await settle([dbA, syncA], [dbB, syncB]);
    expect(await dbB.query(Filter.type(TestSchema.Organization)).run()).toHaveLength(1);

    dbA.remove(org);
    await settle([dbA, syncA], [dbB, syncB]);
    expect(await dbB.query(Filter.type(TestSchema.Organization)).run()).toHaveLength(0);
  });

  test('writes made offline reach the authority on reconnect, and survive a restart', async () => {
    await using builder = new TestBuilder();
    const authority = builder.createAuthority();
    const alice = builder.createPeer({ types: TYPES });
    const bob = builder.createPeer({ types: TYPES });

    const dbA = await alice.createDatabase();
    dbA.add(Obj.make(TestSchema.Organization, { name: 'Offline' }));
    await dbA.flush();
    await alice.reload();

    const reopened = await alice.openLastDatabase();
    const syncA = alice.sync(reopened, authority);
    const dbB = await bob.openDatabase(reopened.spaceId);
    const syncB = bob.sync(dbB, authority);
    await settle([reopened, syncA], [dbB, syncB]);

    const orgs = await dbB.query(Filter.type(TestSchema.Organization)).run();
    expect(orgs.map((org) => org.name)).toEqual(['Offline']);
  });
});
