//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, DXN, Obj, Ref, Type } from '@dxos/echo';

class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))({ name: Schema.String }) {}

// #region declare
class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))({
  title: Schema.String,
  assignee: Schema.optional(Ref.Ref(Person)),
  watchers: Schema.Array(Ref.Ref(Person)),
}) {}
// #endregion declare

declare const db: Database.Database;

// #region make
const ada = db.add(Obj.make(Person, { name: 'Ada' }));
const task = db.add(Obj.make(Task, { title: 'Review', assignee: Ref.make(ada), watchers: [] }));

// From a URI: bound to the database, so it can load.
const again = db.makeRef<Person>(Obj.getURI(ada));
// #endregion make

// #region resolve
const loaded = task.assignee?.peek(); // Person | undefined, never loads
const assignee = await task.assignee?.load(); // loads from disk or the network if needed
const watchers = await Ref.loadAll(task.watchers); // missing and deleted targets are left out
// #endregion resolve

// #region effect
const program = Effect.gen(function* () {
  const person = yield* Database.load(again);
  return person.name;
}).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.succeed('unknown')));
// #endregion effect

// #region compare
const same = task.assignee !== undefined && Ref.equals(task.assignee, Ref.make(ada));
const isAda = task.watchers.some(Ref.hasEntityId(ada.id));
Ref.isRef(task.assignee); // true
// #endregion compare

export { assignee, isAda, loaded, program, same, watchers };
