//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, DXN, Obj, Text, Type } from '@dxos/echo';

class Task extends Type.makeObject<Task>(
  DXN.make('com.example.type.task', '0.1.0'),
)({
  title: Schema.String,
  status: Schema.Literals(['todo', 'doing', 'done']),
  notes: Schema.String,
}) {}

declare const db: Database.Database;
const task = db.add(
  Obj.make(Task, { title: 'Draft', status: 'todo', notes: '' }),
);

// #region text
Obj.update(task, (task) => {
  // replaces the whole string: a concurrent edit to the title loses
  task.title = 'Final draft';
  // inserts characters: concurrent edits interleave
  Text.splice(task, 'notes', 0, 0, 'Check the links. ');
});
// #endregion text

// #region detect
const writers = new Set(
  Obj.getChanges(task, { property: 'status' }).map((change) => change.actor),
);
if (writers.size > 1) {
  // Several devices set the status; show the history so a person can confirm
  // the result.
}
// #endregion detect

export { writers };
