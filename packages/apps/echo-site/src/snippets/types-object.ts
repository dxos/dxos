//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Obj, Ref, Relation, Type } from '@dxos/echo';

// #region person
export class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    email: Schema.optional(Schema.String),
  }),
) {}
// #endregion

// #region instance
const ada = Obj.make(Person, { name: 'Ada' });
const grace = Obj.make(Person, { name: 'Grace', email: 'grace@example.com' });
// #endregion

// @ts-expect-error Keeps the page's claim true: a missing required field does not compile.
Obj.make(Person, {});

// #region task
export class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    assignee: Schema.optional(Ref.Ref(Person)),
  }),
) {}

const review = Obj.make(Task, { title: 'Review', assignee: Ref.make(ada) });
// #endregion

// #region relation
export class Mentors extends Type.makeRelation<Mentors>(DXN.make('com.example.type.mentors', '0.1.0'))({
  source: Person,
  target: Person,
})(Schema.Struct({ since: Schema.String })) {}

const mentors = Relation.make(Mentors, {
  [Relation.Source]: grace,
  [Relation.Target]: ada,
  since: '2026',
});
// #endregion

export { mentors, review };
