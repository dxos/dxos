//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { Database, DXN, Filter, Obj, Query, Type } from '@dxos/echo';

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))({
  title: Schema.String,
  done: Schema.Boolean,
}) {}

declare const space: Space;

// #region get
const db = space.db;
// #endregion get

// #region write
const task = db.add(Obj.make(Task, { title: 'Ship the guide', done: false }));
db.remove(task);
// #endregion write

// #region query
const open = await db.query(Query.select(Filter.type(Task, { done: false }))).run();
// #endregion query

// #region flush
await db.flush(); // pending writes are on disk
await db.flush({ indexes: true, updates: true }); // and queries see them
// #endregion flush

// #region types
const Note = Type.makeObjectFromJsonSchema({
  typename: 'com.example.type.note',
  version: '0.1.0',
  jsonSchema: { type: 'object', properties: { title: { type: 'string' } } },
});
const persisted = await db.addType(Note); // replicates to the other members
// #endregion types

// #region service
const countOpen = Effect.gen(function* () {
  yield* Database.add(Obj.make(Task, { title: 'From Effect', done: false }));
  const tasks = yield* Database.query(Filter.type(Task, { done: false })).run;
  const sync = yield* Database.getSyncState();
  return { open: tasks.length, unsynced: sync.unsyncedDocumentCount };
});

const result = await Effect.runPromise(countOpen.pipe(Effect.provide(Database.layer(db))));
// #endregion service

export { open, persisted, result };
