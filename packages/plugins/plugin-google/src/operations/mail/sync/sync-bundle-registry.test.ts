//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterAll, assert, beforeAll, describe, test } from 'vitest';

import { Entity, Filter, JsonSchema, Obj, Ref, Tag, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN, PublicKey } from '@dxos/keys';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import * as Binding from '@dxos/plugin-connector/Binding';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { SYNC_TEST_TYPES } from '@dxos/plugin-inbox/testing/sync';

import { GMAIL_CONNECTOR_ID, GMAIL_SOURCE } from '../../../constants.ts';
import { generateGmailDataset } from '../../../testing/gmail-fixtures.ts';
import { googleSyncTestServices, runGoogleSync } from '../../../testing/sync-fixture.ts';

/**
 * A type as another plugin bundle publishes it to EDGE's registry and this bundle rebuilds it: serialized to JSON
 * Schema and back (`TypeSource.fromRecord` in `@dxos/plugin-host-cloudflare`).
 */
const publishedType = (type: Type.AnyEntity): Type.AnyEntity => {
  const jsonSchema = Schema.decodeUnknownSync(JsonSchema.JsonSchema)(
    JSON.parse(JSON.stringify(JsonSchema.toJsonSchema(type))),
  );
  const dxn = DXN.make(Type.getTypename(type), Type.getVersion(type));
  const schema = JsonSchema.toEffectSchema(jsonSchema);
  return jsonSchema.entityKind === Entity.Kind.Relation
    ? Type.makeRelation(dxn)({ source: Obj.Unknown, target: Obj.Unknown })(schema)
    : Type.makeObject(dxn)(schema);
};

// plugin-google's bundle registers only the types its operations declare (`Tag`); every other type an object in the
// space carries resolves from EDGE's registry of published types the first time an object of it loads through a ref.
// A sync fired from a target's sync button carries that binding as `priority`; it must reach the binding the way a
// scheduled sync does, by query, or the cursor's rebuilt published type rejects the sync's own cursor writes.
describe('Gmail sync on a plugin bundle’s type registry', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  /** A space seeded with a Gmail binding by a fully typed client, opened by a client typed like the bundle. */
  const setup = async () => {
    const peer = await builder.createPeer({ types: [Tag.Tag] });
    const seeder = await peer.createClient();
    seeder.graph.registry.add(SYNC_TEST_TYPES);
    const spaceKey = PublicKey.random();
    const seedDb = await peer.createDatabase(spaceKey, { client: seeder });
    const mailbox = seedDb.add(Mailbox.make({ name: 'Inbox' }));
    const accessToken = seedDb.add(AccessToken.make({ source: GMAIL_SOURCE, token: 'token' }));
    const connection = seedDb.add(
      Connection.make({ connectorId: GMAIL_CONNECTOR_ID, accessToken: Ref.make(accessToken) }),
    );
    const binding = seedDb.add(
      Cursor.makeExternal({ source: Connection.getAccessToken(connection), target: Ref.make(mailbox) }),
    );
    await seedDb.flush({ indexes: true });

    const published = new Set<string>();
    peer.client.graph.registerTypeSource(async (uri) => {
      if (!DXN.isDXN(uri)) {
        return undefined;
      }
      const type = SYNC_TEST_TYPES.find((type) => Type.getTypename(type) === DXN.getName(uri));
      if (type !== undefined) {
        published.add(Type.getTypename(type));
      }
      return type && publishedType(type);
    });
    const db = await peer.openDatabase(spaceKey, undefined, { client: peer.client });
    return { db, connection: db.makeRef<Connection.Connection>(Ref.make(connection).uri), binding, published };
  };

  test('a sync fired for one binding writes its cursor as a scheduled sync does', async ({ expect }) => {
    const { db, connection, binding, published } = await setup();
    const now = new Date();
    const base = generateGmailDataset({ count: 5, seed: 91, start: subDays(now, 6), end: subDays(now, 2) });
    const sync = (dataset: Parameters<typeof googleSyncTestServices>[1]) =>
      EffectEx.runPromise(
        Binding.syncAll({
          connection,
          priority: binding.id,
          sync: (cursor) => runGoogleSync({ binding: Ref.make(cursor), now }),
        }).pipe(Effect.provide(googleSyncTestServices(db, dataset))),
      );

    // First run: date-window backfill, capturing the mailbox's history id.
    const first = await sync({ ...base, historyId: '1000' });
    expect(first.outputs).toEqual([{ newMessages: base.messages.length }]);

    // Next run: the history delta past the stored token.
    const arrival = generateGmailDataset({ count: 1, seed: 92, start: subDays(now, 1), end: now, idPrefix: 'new' })
      .messages[0];
    const second = await sync({
      ...base,
      messages: [...base.messages, arrival],
      historyId: '1001',
      historyLog: [{ startHistoryId: '1000', historyId: '1001', messagesAdded: [arrival.id] }],
    });
    expect(second.outputs).toEqual([{ newMessages: 1 }]);
    expect(published).not.toContain(Type.getTypename(Cursor.Cursor));

    // Read by query too: a ref load would register the rebuilt type this test asserts the sync never took.
    const [cursor] = await db.query(Filter.id(binding.id)).run();
    assert(Cursor.instanceOf(cursor) && Cursor.isExternal(cursor));
    expect(cursor.lastError).toBeUndefined();
    expect(cursor.spec.token).toBe('1001');
  });
});
