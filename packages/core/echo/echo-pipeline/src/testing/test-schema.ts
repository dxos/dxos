//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

//
// Example schema
//

// TODO(dmaretskyi): Need common set of test types.
export const Person = Schema.Struct({
  name: Schema.String,
  email: Schema.optional(Schema.String),
  age: Schema.optional(Schema.Number),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Person',
    version: '0.1.0',
  }),
);
export interface Person extends Schema.Schema.Type<typeof Person> {}

export const Organization = Schema.Struct({
  name: Schema.String,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Organization',
    version: '0.1.0',
  }),
);
export interface Organization extends Schema.Schema.Type<typeof Organization> {}

export const WorksFor = Schema.Struct({
  since: Schema.String,
}).pipe(
  Type.Relation({
    typename: 'dxos.org/type/WorksFor',
    version: '0.1.0',
    source: Person,
    target: Organization,
  }),
);
export interface WorksFor extends Schema.Schema.Type<typeof WorksFor> {}

export const Task = Schema.Struct({
  title: Schema.String,
  createdAt: Schema.String,
  assignee: Type.Ref(Person),
}).pipe(Type.Obj({ typename: 'dxos.org/type/Task', version: '0.1.0' }));
export interface Task extends Schema.Schema.Type<typeof Task> {}
