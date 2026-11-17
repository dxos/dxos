//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { type SqliteDatabase } from '@dxos/echo-sqlite';
import { type SpaceSync } from '@dxos/echo-sqlite/sync';
import { TestBuilder } from '@dxos/echo-sqlite/testing';
import { TestSchema } from '@dxos/echo/testing';

import { type NativeDatabase } from '../database.ts';
import { type NativeSync } from '../sync.ts';
import { NativeTestBuilder } from '../testing/harness.ts';

const TYPES = [TestSchema.Organization, TestSchema.Person];

type Pair = [SqliteDatabase, SpaceSync] | [NativeDatabase, NativeSync];

/** Flushes every database and waits for sync to go quiet, a few passes over, so announcements land. */
const settle = async (...pairs: Pair[]): Promise<void> => {
  for (let pass = 0; pass < 3; pass++) {
    for (const [db, sync] of pairs) {
      await db.flush();
      await sync.synced();
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe('echo-native syncs with echo-sqlite through one authority', () => {
  test('objects and edits flow both ways', async () => {
    await using sqlite = new TestBuilder();
    await using native = new NativeTestBuilder();
    const authority = sqlite.createAuthority();

    const sqlitePeer = sqlite.createPeer({ types: TYPES });
    const dbA = await sqlitePeer.createDatabase();
    const nativePeer = native.createPeer({ types: TYPES });
    const dbB = await nativePeer.openDatabase(dbA.spaceId);
    const sqlitePeerSync = sqlitePeer.sync(dbA, authority);
    const nativeSync = nativePeer.sync(dbB, authority);
    const pairs: Pair[] = [
      [dbA, sqlitePeerSync],
      [dbB, nativeSync],
    ];

    // echo-sqlite → echo-native.
    const org = dbA.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
    await settle(...pairs);
    const [orgOnNative] = await dbB.query(Filter.type(TestSchema.Organization)).run();
    expect(orgOnNative?.name).toBe('DXOS');

    // echo-native → echo-sqlite.
    dbB.add(Obj.make(TestSchema.Person, { name: 'Alice', email: 'alice@example.com' }));
    await settle(...pairs);
    const people = await dbA.query(Filter.type(TestSchema.Person)).run();
    expect(people.map((person) => person.name)).toEqual(['Alice']);

    // An edit on each side to different fields, then a text edit merged as text.
    Obj.update(orgOnNative, (orgOnNative) => {
      orgOnNative.properties = { website: 'https://dxos.org' };
    });
    await settle(...pairs);
    Obj.update(org, (org) => {
      org.name = 'DXOS.org';
    });
    await settle(...pairs);
    for (const db of [dbA, dbB] as const) {
      const [result] = await db.query(Filter.type(TestSchema.Organization)).run();
      expect({ name: result.name, website: result.properties?.website }).toEqual({
        name: 'DXOS.org',
        website: 'https://dxos.org',
      });
    }
    // The resident objects show the remote edits, not only fresh query results.
    expect(org.properties?.website).toBe('https://dxos.org');
    expect(orgOnNative.name).toBe('DXOS.org');

    // A deletion on the native side reaches echo-sqlite.
    const [alice] = await dbB.query(Filter.type(TestSchema.Person)).run();
    dbB.remove(alice);
    await settle(...pairs);
    expect(await dbA.query(Filter.type(TestSchema.Person)).run()).toHaveLength(0);
  });

  test('two echo-native peers converge concurrent text edits', async () => {
    await using native = new NativeTestBuilder();
    const authority = native.createAuthority();
    const alice = native.createPeer({ types: TYPES });
    const bob = native.createPeer({ types: TYPES });
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
});
