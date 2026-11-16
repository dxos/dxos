//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Client } from '@dxos/client';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';

// #region define
class Task extends Type.makeObject<Task>(
  DXN.make('com.example.type.task', '0.1.0'),
)(Schema.Struct({ title: Schema.String, done: Schema.Boolean })) {}
// #endregion define

// #region connect
const client = new Client({ types: [Task] });
await client.initialize();
await client.halo.createIdentity();

const space = await client.spaces.create();
await space.waitUntilReady();
const db = space.db;
// #endregion connect

// #region query
const open = db.query(Query.select(Filter.type(Task, { done: false })));
open.subscribe(() => console.log(open.results.length));

const task = db.add(Obj.make(Task, { title: 'Ship the docs', done: false }));
// #endregion query

// #region change
Obj.update(task, (task) => {
  task.done = true;
});
// #endregion change
