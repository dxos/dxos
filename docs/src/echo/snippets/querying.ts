//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Client } from '@dxos/client';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { Expando } from '@dxos/schema';

// #region types
class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({ title: Schema.String, completed: Schema.optional(Schema.Boolean) }),
) {}

const client = new Client({ types: [Task] });
await client.initialize();
// #endregion

if (!client.halo.identity.get()) {
  await client.halo.createIdentity();
}
const space = await client.spaces.create();
const { db } = space;
db.add(Obj.make(Task, { title: 'Buy milk' }));

// #region everything
const everything = await db.query(Filter.everything()).run();
// #endregion

// #region typed
const open = await db.query(Filter.type(Task, { completed: false })).run();
open.forEach((task) => console.log(task.title));
// #endregion

// #region untyped
const notes = await db.query(Filter.type(Expando.Expando, { kind: 'note' })).run();
// #endregion

// #region live
const query = db.query(Query.select(Filter.type(Task)));
const unsubscribe = query.subscribe(({ results }) => {
  console.log(`${results.length} tasks`);
});

db.add(Obj.make(Task, { title: 'Arrive at the store' }));
unsubscribe();
// #endregion

export { everything, notes };
