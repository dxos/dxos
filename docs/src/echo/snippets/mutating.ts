//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, DXN, Obj, Type } from '@dxos/echo';
import { Expando } from '@dxos/schema';

declare const db: Database.Database;

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({ title: Schema.String, completed: Schema.optional(Schema.Boolean) }),
) {}

// #region add
const task = db.add(Obj.make(Task, { title: 'Buy milk' }));
// #endregion

// #region subscribe
const titles: string[] = [task.title];
const unsubscribe = Obj.subscribe(task, () => {
  titles.push(task.title);
});
// #endregion

// #region update
Obj.update(task, (task) => {
  task.title = 'Buy oat milk';
  task.completed = true;
});
// #endregion

unsubscribe();

// #region expando
const note = db.add(Obj.make(Expando.Expando, { kind: 'note', text: 'Ask about the oat milk' }));
// #endregion

// #region remove
db.remove(task);
// #endregion

export { note, titles };
