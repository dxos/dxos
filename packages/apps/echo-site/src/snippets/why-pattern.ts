//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, type Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';

declare const db: Database.Database;

// #region declare
class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    done: Schema.Boolean,
    assignee: Schema.optional(Ref.Ref(Person)),
  }),
) {}
// #endregion

// #region use
const ada = db.add(Obj.make(Person, { name: 'Ada' }));
const task = db.add(Obj.make(Task, { title: 'Review', done: false, assignee: Ref.make(ada) }));

Obj.update(task, (task) => {
  task.done = true;
});

const finished = await db.query(Query.select(Filter.type(Task, { done: true }))).run();
// #endregion

export { finished };
