//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Entity, Obj, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';

const fields = Schema.Struct({ name: Schema.optional(Schema.String) });

const VersionedV1 = Type.makeObject(DXN.make('com.example.type.versioned', '0.1.0'))(fields);
const VersionedV2 = Type.makeObject(DXN.make('com.example.type.versioned', '0.2.0'))(fields);

const V1_URI = DXN.make('com.example.type.versioned', '0.1.0');

/**
 * Locks in the contract documented on `Obj.getType` / `Entity.getType`: an object whose stored
 * type reference does not resolve reports `undefined` rather than throwing, so callers can probe
 * an object of an unknown type.
 *
 * The registry indexes a type under its exact `dxn:<typename>:<version>`, so an object written
 * before a type's version bump becomes unresolvable — which is what these tests reproduce by
 * unregistering the version the object was written with. `db.add` refuses an unregistered type
 * up front, so unregistering after the write is the only way to reach this state in-process; in
 * a real profile it arrives via storage or replication from a peer running the older code.
 */
describe('object whose type is absent from the registry', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Adds an object of v0.1.0, then unregisters that version, leaving the stored ref dangling. */
  const setup = async (types: Type.AnyEntity[] = [VersionedV1]) => {
    const peer = await builder.createPeer({ types });
    const db = await peer.createDatabase();
    const object = db.add(Obj.make(VersionedV1, { name: 'Alice' }));
    await db.flush();
    expect(db.graph.registry.remove(VersionedV1.id)).toBe(true);
    return { db, object };
  };

  test('Obj.getType returns undefined when the type is not registered', async () => {
    const { object } = await setup();

    expect(Obj.getType(object)).toBeUndefined();
    expect(Entity.getType(object)).toBeUndefined();
  });

  test('Obj.getType returns undefined when only another version of the typename is registered', async () => {
    const { db, object } = await setup([VersionedV1, VersionedV2]);

    // The registry still holds this typename, but only at 0.2.0 — resolution is exact-version.
    expect(db.graph.registry.getByURI(DXN.make('com.example.type.versioned', '0.2.0'))).toBe(VersionedV2);
    expect(Obj.getType(object)).toBeUndefined();
  });

  test('the stored type URI survives, so the object stays identifiable', async () => {
    const { object } = await setup();

    expect(Obj.getTypeURI(object)).toEqual(V1_URI);
  });

  test('reads succeed and only writes fail, naming the unresolved type', async () => {
    const { object } = await setup();

    expect(object.name).toEqual('Alice');
    expect(() =>
      Obj.update(object, (object) => {
        object.name = 'Bob';
      }),
    ).toThrow(`Schema not found in schema registry: ${V1_URI}`);
  });

  test('re-registering the type resolves it again without touching the object', async () => {
    const { db, object } = await setup();
    expect(Obj.getType(object)).toBeUndefined();

    db.graph.registry.add([VersionedV1]);

    expect(Obj.getType(object)).toBe(VersionedV1);
    Obj.update(object, (object) => {
      object.name = 'Bob';
    });
    expect(object.name).toEqual('Bob');
  });
});
