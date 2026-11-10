//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, DXN, Filter, Order, Query, Ref, Type } from '@dxos/echo';

class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))({ name: Schema.String }) {}
class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))({
  title: Schema.String,
  priority: Schema.Number,
  done: Schema.Boolean,
  assignee: Schema.optional(Ref.Ref(Person)),
}) {}
class Assigned extends Type.makeRelation<Assigned>(DXN.make('com.example.type.assigned', '0.1.0'))({
  source: Task,
  target: Person,
})({}) {}

declare const db: Database.Database;

// #region common
const open = Query.type(Task, { done: false });
const urgent = Query.select(Filter.type(Task, { priority: Filter.gte(8) }));
const byTitle = Query.select(Filter.text('release notes'));
// #endregion common

// #region combine
const openOrUrgent = Query.all(open, urgent);
const openNotUrgent = Query.without(open, urgent);
// #endregion combine

// #region traverse
const assignees = open.reference('assignee'); // follow a Ref field
const tasksFor = Query.type(Person, { name: 'Ada' }).referencedBy(Task, 'assignee'); // follow it backwards

const assignments = open.sourceOf(Assigned); // relations that start at the open tasks
const people = assignments.target(); // the people at the other end
// #endregion traverse

// #region order
const ordered = open.orderBy(Order.property<Task>('priority', 'desc'), Order.updated());
// #endregion order

// #region run
const tasks = await db.query(ordered).run();
const first = await db.query(ordered).firstOrUndefined();

const result = db.query(ordered);
const unsubscribe = result.subscribe((result) => console.log(result.results.length), { fire: true });
unsubscribe();
// #endregion run

export { byTitle, first, openNotUrgent, openOrUrgent, people, assignees, tasks, tasksFor };
