//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { type Database, DXN, Filter, JsonSchema, Obj, Query, Scope, Type } from '@dxos/echo';
import { type TypeSource } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { PublicKey, type URI } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';

const TYPENAME = 'com.example.type.remote';
const VERSION = '0.1.0';

/** A type another plugin publishes; this database never registers it and sees only its JSON Schema. */
class Remote extends Type.makeObject<Remote>(DXN.make(TYPENAME, VERSION))(Schema.Struct({ title: Schema.String })) {}

/** The JSON Schema a bundle's catalog carries for the type, which is what EDGE's type registry returns. */
const remoteJsonSchema = JsonSchema.toJsonSchema(Remote);

/** An async registry that counts its lookups, standing in for EDGE's registry of published types. */
const makeMockRegistry = (options: { fail?: boolean } = {}) => {
  const requests: string[] = [];
  const source: TypeSource = async (uri: URI.URI) => {
    requests.push(uri);
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (options.fail) {
      throw new Error('registry unavailable');
    }
    if (!DXN.isDXN(uri) || DXN.getName(uri) !== TYPENAME) {
      return undefined;
    }
    // Rebuilt as a static type, as a host does with the JSON Schema a registry returns.
    return Type.makeObject(DXN.make(TYPENAME, VERSION))(JsonSchema.toEffectSchema(remoteJsonSchema));
  };
  return { source, requests };
};

const setup = async () => {
  const builder = new EchoTestBuilder();
  await openAndClose(builder);
  const peer = await builder.createPeer();
  const db = await peer.createDatabase(PublicKey.random());
  return { db };
};

/** The registrations of a typename; the registry asks the type sources for what it lacks. */
const queryType = async (db: Database.Database, typename: string, scopes = [Scope.registry()]) => {
  const [type] = await db
    .query(Query.select(Filter.and(Filter.type(Type.Type), Filter.key(typename))).from(...scopes))
    .run();
  return type;
};

describe('type sources', () => {
  test('a type the registry does not hold resolves from the source and is then registered', async ({ expect }) => {
    const { db } = await setup();
    const registry = makeMockRegistry();
    db.graph.registerTypeSource(registry.source);

    expect(db.graph.registry.getByURI(DXN.make(TYPENAME, VERSION))).toBeUndefined();
    const type = await queryType(db, TYPENAME);
    expect(type).toBeDefined();
    expect(type && Type.getTypename(type)).toBe(TYPENAME);
    expect(db.graph.registry.getByURI(DXN.make(TYPENAME, VERSION))).toBe(type);

    // Registered now, so the source is not asked again.
    expect(await queryType(db, TYPENAME)).toBe(type);
    expect(registry.requests).toHaveLength(1);
  });

  test('the resolved type creates objects', async ({ expect }) => {
    const { db } = await setup();
    db.graph.registerTypeSource(makeMockRegistry().source);

    const type = await queryType(db, TYPENAME);
    expect(type && Type.isObject(type)).toBe(true);
    if (type === undefined || !Type.isObject(type)) {
      return;
    }
    const object = db.add(Obj.make(type, { title: 'From a published type' }));
    expect(Obj.getTypename(object)).toBe(TYPENAME);
  });

  test('the source is not asked for a type the registry holds', async ({ expect }) => {
    const { db } = await setup();
    const registry = makeMockRegistry();
    db.graph.registerTypeSource(registry.source);

    expect(await queryType(db, Type.getTypename(Type.Type))).toBe(Type.Type);
    expect(registry.requests).toHaveLength(0);
  });

  test('a type no source knows resolves to undefined', async ({ expect }) => {
    const { db } = await setup();
    const registry = makeMockRegistry();
    db.graph.registerTypeSource(registry.source);

    expect(await queryType(db, 'com.example.type.unknown')).toBeUndefined();
    expect(registry.requests).toHaveLength(1);
  });

  test('a failing source reads as a missing type', async ({ expect }) => {
    const { db } = await setup();
    db.graph.registerTypeSource(makeMockRegistry({ fail: true }).source);

    expect(await queryType(db, TYPENAME)).toBeUndefined();
  });

  test('without a source the type is missing; unregistering removes the source', async ({ expect }) => {
    const { db } = await setup();
    const registry = makeMockRegistry();
    const unregister = db.graph.registerTypeSource(registry.source);
    unregister();

    expect(await queryType(db, TYPENAME)).toBeUndefined();
    expect(registry.requests).toHaveLength(0);
  });

  test('a stalled source does not hold a query past its timeout', async ({ expect }) => {
    const { db } = await setup();
    db.graph.registerTypeSource(() => new Promise(() => {}));

    const started = Date.now();
    const types = await db
      .query(Query.select(Filter.and(Filter.type(Type.Type), Filter.key(TYPENAME))).from(Scope.registry()))
      .run({ timeout: 200 });
    expect(types).toHaveLength(0);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  test('a query outside the registry does not ask the source', async ({ expect }) => {
    const { db } = await setup();
    const registry = makeMockRegistry();
    db.graph.registerTypeSource(registry.source);

    expect(await queryType(db, TYPENAME, [Scope.space()])).toBeUndefined();
    expect(registry.requests).toHaveLength(0);
  });

  test('a registry query by key for something other than types does not ask the source', async ({ expect }) => {
    const { db } = await setup();
    const registry = makeMockRegistry();
    db.graph.registerTypeSource(registry.source);

    await db.query(Query.select(Filter.key('com.example.operation.any')).from(Scope.registry())).run();
    expect(registry.requests).toHaveLength(0);
  });

  test('a reactive query picks up the type once the remote registry answers', async ({ expect }) => {
    const { db } = await setup();
    db.graph.registerTypeSource(makeMockRegistry().source);

    const result = db.query(
      Query.select(Filter.and(Filter.type(Type.Type), Filter.key(TYPENAME))).from(Scope.registry()),
    );
    let unsubscribe: (() => void) | undefined;
    const typename = await new Promise<string | undefined>((resolve) => {
      unsubscribe = result.subscribe(() => {
        const [type] = result.results;
        if (type !== undefined) {
          resolve(Type.getTypename(type));
        }
      });
    });
    unsubscribe?.();
    expect(typename).toBe(TYPENAME);
  });

  test('loading an object of an unregistered type resolves its schema from the source', async ({ expect }) => {
    const { db } = await setup();
    db.graph.registerTypeSource(makeMockRegistry().source);

    const schema = await db.graph
      .createRefResolver({ context: { space: db.spaceId } })
      .resolveSchema(DXN.make(TYPENAME));
    expect(schema).toBeDefined();
  });
});
