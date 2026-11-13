//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, DXN, Filter, Obj, Query, Type } from '@dxos/echo';

declare const db: Database.Database;

// #region
class Task extends Type.makeObject<Task>(
  DXN.make('com.example.type.task', '0.1.0'),
)(Schema.Struct({ title: Schema.String, done: Schema.Boolean })) {}

const open = db.query(Query.select(Filter.type(Task, { done: false })));
open.subscribe(() => console.log(open.results.length));

// The subscriber has already run when `add` returns.
const task = db.add(Obj.make(Task, { title: 'Ship the docs', done: false }));

// A CRDT change: it merges with any peer's edit to this task.
Obj.update(task, (task) => {
  task.done = true;
});
// #endregion
