//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, assert, beforeEach, describe, test } from 'vitest';

import { DXN, Filter, JsonSchema, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Expando } from '@dxos/schema';

import * as AccessToken from './AccessToken.ts';
import * as Cursor from './Cursor.ts';

/**
 * `Cursor` as a plugin bundle on EDGE resolves it when it does not register the type itself: published to EDGE's type
 * registry as JSON Schema by the plugin that contributes it, and rebuilt (`TypeSource.fromRecord` in
 * `@dxos/plugin-host-cloudflare`).
 */
const PublishedCursor = Type.makeObject(DXN.make(Type.getTypename(Cursor.Cursor), Type.getVersion(Cursor.Cursor)))(
  JsonSchema.toEffectSchema(
    Schema.decodeUnknownSync(JsonSchema.JsonSchema)(JSON.parse(JSON.stringify(JsonSchema.toJsonSchema(Cursor.Cursor)))),
  ),
);

describe.each([
  { name: 'its own type', type: Cursor.Cursor },
  { name: 'its published type', type: PublishedCursor },
])('every cursor write through $name', ({ type }) => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** A cursor created by a fully typed client, read back by a client that registers only `type`. */
  const setup = async () => {
    const peer = await builder.createPeer({ types: [type] });
    const seeder = await peer.createClient();
    seeder.graph.registry.add([Cursor.Cursor, AccessToken.AccessToken, Expando.Expando]);
    const seedDb = await peer.createDatabase(undefined, { client: seeder });
    const token = seedDb.add(AccessToken.make({ source: 'example.com', token: 'a' }));
    const otherToken = seedDb.add(AccessToken.make({ source: 'example.com', token: 'b' }));
    const target = seedDb.add(Expando.make({ name: 'Target' }));
    const { id } = seedDb.add(Cursor.makeExternal({ source: Ref.make(token), target: Ref.make(target) }));
    await seedDb.flush({ indexes: true });

    const db = await peer.openLastDatabase({ client: peer.client });
    const [cursor] = await db.query(Filter.id(id)).run();
    assert(Cursor.instanceOf(cursor) && Cursor.isExternal(cursor));
    return { cursor, otherToken };
  };

  test('progress: advance, error, range and backfill', async ({ expect }) => {
    const { cursor } = await setup();

    Cursor.recordError(cursor, 'boom');
    expect(cursor.lastError).toBe('boom');

    Cursor.advance(cursor, '10');
    expect(cursor.max).toBe('10');
    expect(cursor.lastError).toBeUndefined();
    expect(cursor.lastTick).toBeDefined();

    Cursor.recordError(cursor, 'again');
    Cursor.extendRange(cursor, { maxKey: 20, minKey: 5 });
    expect(cursor.max).toBe('20');
    expect(cursor.min).toBe('5');
    expect(cursor.lastError).toBeUndefined();

    Cursor.completeBackfill(cursor, 2);
    expect(cursor.min).toBe('2');
  });

  test('external state: token, tag heads, delta ids, snapshots and source', async ({ expect }) => {
    const { cursor, otherToken } = await setup();

    Cursor.writeSyncState(cursor, { token: 't1', tagHeads: ['h1'], deltaIds: ['m1'] });
    expect(Cursor.readToken(cursor)).toBe('t1');
    expect(Cursor.readTagHeads(cursor)).toEqual(['h1']);
    expect(Cursor.readDeltaIds(cursor)).toEqual(['m1']);

    Cursor.writeSyncState(cursor, { token: 't2' });
    expect(Cursor.readToken(cursor)).toBe('t2');
    expect(Cursor.readDeltaIds(cursor)).toEqual([]);

    Cursor.writeSnapshot(cursor, 'remote-1', { title: 'One' });
    expect(Cursor.readSnapshot(cursor, 'remote-1')).toEqual({ title: 'One' });

    Cursor.clearToken(cursor);
    expect(Cursor.readToken(cursor)).toBeUndefined();
    expect(Cursor.readTagHeads(cursor)).toEqual(['h1']);

    Cursor.rebindSource(cursor, Ref.make(otherToken));
    expect(cursor.spec.source.uri.endsWith(`/${otherToken.id}`)).toBe(true);
  });
});
