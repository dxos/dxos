//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Ref, Type } from '@dxos/echo';

// TODO(burdon): Replace with @dxos/echo/testing TestSchema.

/** @deprecated */
export const Contact = Schema.Struct({
  name: Schema.String.annotations({ description: 'The name of the person.' }),
  email: Schema.optional(Schema.String).annotations({ description: 'Email address.' }),
}).pipe(
  Type.object({
    typename: 'com.example.type.person',
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
    typename: 'com.example.type.project',
    version: '0.1.0',
  }),
  Schema.annotations({ description: 'Project information.' }),
);
export interface Project extends Schema.Schema.Type<typeof Project> {}

export const Task = Schema.Struct({
  name: Schema.String.annotations({ description: 'The name of the task.' }),
  description: Schema.optional(Schema.String).annotations({ description: 'The description of the task.' }),
  project: Ref.Ref(Project),
  assignee: Ref.Ref(Contact),
}).pipe(
  Type.object({
    typename: 'com.example.type.task',
    version: '0.1.0',
  }),
  Schema.annotations({ description: 'Task information.' }),
);
export interface Task extends Schema.Schema.Type<typeof Task> {}

/** @deprecated */
export const Organization = Schema.Struct({
  name: Schema.String.annotations({ description: 'The name of the organization.' }),
  projects: Schema.Array(Ref.Ref(Project)),
  employees: Schema.Array(Ref.Ref(Contact)),
}).pipe(
  Type.object({
    typename: 'com.example.type.organization',
    version: '0.1.0',
  }),
  Schema.annotations({ description: 'Organization information.' }),
);
export interface Organization extends Schema.Schema.Type<typeof Organization> {}
