//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

// TODO(burdon): Replace with @dxos/echo/testing TestSchema.

/** @deprecated */
export const Contact = Schema.Struct({
  name: Schema.String.annotations({ description: 'The name of the person.' }),
  email: Schema.optional(Schema.String).annotations({ description: 'Email address.' }),
}).pipe(
  Type.object({
    typename: 'example.com/type/Person',
    version: '0.1.0',
  }),
  Schema.annotations({ description: 'Contact information.' }),
);
export interface Contact extends Schema.Schema.Type<typeof Contact> {}

/** @deprecated */
export const Project = Schema.Struct({
  name: Schema.String.annotations({ description: 'The name of the project.' }),
  description: Schema.optional(Schema.String).annotations({ description: 'The description of the project.' }),
}).pipe(
  Type.object({
    typename: 'example.com/type/Project',
    version: '0.1.0',
  }),
  Schema.annotations({ description: 'Project information.' }),
);
export interface Project extends Schema.Schema.Type<typeof Project> {}

export const Task = Schema.Struct({
  name: Schema.String.annotations({ description: 'The name of the task.' }),
  description: Schema.optional(Schema.String).annotations({ description: 'The description of the task.' }),
  project: Type.Ref(Project),
  assignee: Type.Ref(Contact),
}).pipe(
  Type.object({
    typename: 'example.com/type/Task',
    version: '0.1.0',
  }),
  Schema.annotations({ description: 'Task information.' }),
);
export interface Task extends Schema.Schema.Type<typeof Task> {}

/** @deprecated */
export const Organization = Schema.Struct({
  name: Schema.String.annotations({ description: 'The name of the organization.' }),
  projects: Schema.Array(Type.Ref(Project)),
  employees: Schema.Array(Type.Ref(Contact)),
}).pipe(
  Type.object({
    typename: 'example.com/type/Organization',
    version: '0.1.0',
  }),
  Schema.annotations({ description: 'Organization information.' }),
);
export interface Organization extends Schema.Schema.Type<typeof Organization> {}
