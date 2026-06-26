//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { DXN, EID } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';

const TestType = Schema.Struct({
  name: Schema.optional(Schema.String),
}).pipe(Type.makeObject(DXN.make('com.example.type.addType', '0.1.0')));

const SharedType = Schema.Struct({
  label: Schema.optional(Schema.String),
}).pipe(Type.makeObject(DXN.make('com.example.type.shared', '0.1.0')));

describe('Database.addType', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('persists a Type definition', async () => {
    const { db } = await builder.createDatabase();
    await db.addType(TestType);
    const types = await db.query(Filter.type(Type.Type)).run();
    expect(types).toHaveLength(1);
    expect(Type.getTypename(types[0])).to.eq(Type.getTypename(TestType));
  });

  test('is idempotent — adding the same type twice reuses the persisted entity', async () => {
    const { db } = await builder.createDatabase();
    const first = await db.addType(TestType);
    const second = await db.addType(TestType);
    expect(second.id).to.eq(first.id);
    const types = await db.query(Filter.type(Type.Type)).run();
    expect(types).toHaveLength(1);
  });

  test('db.add rejects Type entities', async () => {
    const { db } = await builder.createDatabase();
    expect(() => db.add(TestType as any)).to.throw();
  });

  test('objects can be created from a persisted type', async () => {
    const { db } = await builder.createDatabase();
    const type = await db.addType(TestType);
    const object = db.add(Obj.make(type, { name: 'Alice' }));
    expect(Type.getTypename(Obj.getType(object)!)).to.eq(Type.getTypename(TestType));

    const objects = await db.query(Filter.type(type)).run();
    expect(objects).toHaveLength(1);
    expect(objects[0].id).to.eq(object.id);
  });

  // Objects from a persisted type are stamped with the type entity's echo:/<id> URI, not the
  // typename DXN. The type's URI (Type.getURI) is the space-less echo:/<id>, which matches the
  // object regardless of space; a space-qualified EID matches only within the owning space.
  test('Filter.type matches objects of a persisted type by URI', async () => {
    const { db } = await builder.createDatabase();
    const type = await db.addType(TestType);
    const object = db.add(Obj.make(type, { name: 'Alice' }));
    await db.flush();

    // Space-less echo URI matches regardless of space.
    const byUri = await db.query(Filter.type(Type.getURI(type))).run();
    expect(byUri.map((o) => o.id)).toEqual([object.id]);

    // Space-qualified EID matches within the owning space.
    const byQualified = await db.query(Filter.type(EID.make({ spaceId: db.spaceId, entityId: type.id }))).run();
    expect(byQualified.map((o) => o.id)).toEqual([object.id]);

    // The static typename DXN does NOT match (db-type objects carry the echo id, not the typename).
    const byTypename = await db.query(Filter.type(TestType)).run();
    expect(byTypename).toHaveLength(0);
  });
});

describe('type and query isolation across spaces', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('addType persists only to the owning space, not the shared registry', async () => {
    // A single peer = one client = one shared graph registry across both spaces.
    const peer = await builder.createPeer();
    const dbA = await peer.createDatabase();
    const dbB = await peer.createDatabase();
    expect(dbA.graph.registry).toBe(dbB.graph.registry);

    await dbA.addType(TestType);

    // Visible in the owning space.
    const typesA = await dbA.query(Filter.type(Type.Type)).run();
    expect(typesA.map((type) => Type.getTypename(type))).toContain(Type.getTypename(TestType));

    // Not visible in the sibling space (no leak).
    const typesB = await dbB.query(Filter.type(Type.Type)).run();
    expect(typesB.map((type) => Type.getTypename(type))).not.toContain(Type.getTypename(TestType));

    // Not added to the shared registry (which holds only static/runtime types).
    const registryTypenames = dbA.graph.registry
      .list()
      .filter(Type.isType)
      .map((type) => Type.getTypename(type));
    expect(registryTypenames).not.toContain(Type.getTypename(TestType));
  });

  test('Scope.space() without a spaceId scopes to the owning space', async () => {
    const peer = await builder.createPeer({ types: [SharedType] });
    const dbA = await peer.createDatabase();
    const dbB = await peer.createDatabase();

    dbA.add(Obj.make(SharedType, { label: 'in-a' }));
    await dbA.flush();

    // Default (unscoped) query resolves to the owning space only.
    expect(await dbB.query(Filter.type(SharedType)).run()).toHaveLength(0);

    // An explicit unbound Scope.space() must bind to the owning space, not fan across all spaces.
    expect(await dbB.query(Query.select(Filter.type(SharedType)).from(Scope.space())).run()).toHaveLength(0);
    expect(await dbA.query(Query.select(Filter.type(SharedType)).from(Scope.space())).run()).toHaveLength(1);
  });
});
