//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type Database, Entity, Filter, Lens, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN, PublicKey } from '@dxos/keys';

import { getObjectCore } from '../echo-handler/index.ts';
import { EchoTestBuilder } from '../testing/index.ts';

const TaskV1 = Type.makeObject(DXN.make('com.example.type.addLensTask', '0.1.0'))(
  Schema.Struct({ title: Schema.String }),
);
const TaskV2 = Type.makeObject(DXN.make('com.example.type.addLensTask', '0.2.0'))(
  Schema.Struct({ name: Schema.String, done: Schema.Boolean }),
);

const lens = Lens.make(TaskV1, TaskV2, { name: 'title' }, { defaults: { done: false } });

describe('Database.addLens', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('stores a lens as a lens-kind entity, once per name and digest', async () => {
    const { db } = await builder.createDatabase();
    const stored = await db.addLens(lens);
    expect(Lens.isStored(stored)).toBe(true);
    expect(stored[Entity.KindId]).toBe(Entity.Kind.Lens);
    expect(stored.digest).toBe(lens.digest);
    expect((await db.addLens(lens)).id).toBe(stored.id);
    expect(await db.query(Filter.type(Lens.Stored)).run()).toHaveLength(1);
    // Stored under its own kind, as persisted types are.
    expect(getObjectCore(stored).getKind()).toBe(Entity.Kind.Lens);
  });

  test('db.add rejects lenses', async () => {
    const { db } = await builder.createDatabase();
    const database: Database.Database = db;
    // @ts-expect-error — rejected at compile time; this checks the runtime guard.
    expect(() => database.add(lens)).toThrow(/addLens/);
  });

  test('a stored lens reloads as a lens and rehydrates to the same digest', async () => {
    const spaceKey = PublicKey.random();
    const peer = await builder.createPeer({ types: [TaskV1, TaskV2] });
    const db = await peer.createDatabase(spaceKey);
    await db.addLens(lens);
    await db.flush();
    const rootUrl = db.rootUrl;
    invariant(rootUrl);
    await peer.reload();

    const reopened = await peer.openDatabase(spaceKey, rootUrl);
    const [stored] = await reopened.query(Filter.type(Lens.Stored)).run();
    expect(Lens.isStored(stored)).toBe(true);
    expect(stored[Entity.KindId]).toBe(Entity.Kind.Lens);
    expect(Lens.fromStored(stored, TaskV1, TaskV2).digest).toBe(lens.digest);
  });
});
