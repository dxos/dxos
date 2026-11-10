//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, DXN, Obj, Ref, Tag, Type } from '@dxos/echo';

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))({
  title: Schema.String,
  done: Schema.Boolean,
}) {}

class Project extends Type.makeObject<Project>(DXN.make('com.example.type.project', '0.1.0'))({
  name: Schema.String,
  tasks: Schema.Array(Ref.Ref(Task)),
}) {}

declare const db: Database.Database;

// #region make
const task = Obj.make(Task, {
  [Obj.Meta]: { keys: [{ source: 'linear.app', id: 'DX-42' }] },
  title: 'Write the Obj guide',
  done: false,
});
db.add(task);
// #endregion make

// #region update
const title = task.title; // read a field directly

Obj.update(task, (task) => {
  task.done = true;
});

const before = Obj.getSnapshot(task); // an immutable copy
Obj.update(task, (task) => {
  task.title = 'Write the Obj and Ref guides';
});
// before.title is still 'Write the Obj guide'
// #endregion update

// #region subscribe
const unsubscribe = Obj.subscribe(task, () => {
  console.log('changed', task.title);
});
unsubscribe();
// #endregion subscribe

// #region meta
const [linear] = Obj.getKeys(task, 'linear.app');

const urgent = db.add(Tag.make({ label: 'urgent' }));
Obj.update(task, (task) => {
  Obj.addTag(task, urgent);
  Obj.setLabel(task, 'Docs task');
});

// The parent holds a reference to the child.
const project = db.add(Obj.make(Project, { name: 'Docs', tasks: [Ref.make(task)] }));
Obj.setParent(task, project);
const parent = Obj.getParent(task); // project
// #endregion meta

// #region json
const copy = Obj.clone(task);
const json = Obj.toJSON(task);
// #endregion json

export { before, copy, json, linear, parent, title };
