//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { EntityKind, TypeAnnotationId } from '@dxos/echo/internal';
import { ObjectId } from '@dxos/keys';

// TODO(burdon): Replace with @dxos/echo/testing TestSchema.

/** @deprecated */
export const Contact = Schema.Struct({
  id: ObjectId,
  name: Schema.String.annotations({ description: 'The name of the person.' }),
  email: Schema.optional(Schema.String).annotations({ description: 'Email address.' }),
})
  .pipe(Schema.mutable)
  .annotations({
    [TypeAnnotationId]: {
      kind: EntityKind.Object,
      typename: 'example.com/type/Person',
      version: '0.1.0',
    },
    description: 'Contact information.',
  });
export interface Contact extends Schema.Schema.Type<typeof Contact> {}

/** @deprecated */
export const Project = Schema.Struct({
  id: ObjectId,
  name: Schema.String.annotations({ description: 'The name of the project.' }),
  description: Schema.optional(Schema.String).annotations({ description: 'The description of the project.' }),
})
  .pipe(Schema.mutable)
  .annotations({
    [TypeAnnotationId]: {
      kind: EntityKind.Object,
      typename: 'example.com/type/Project',
      version: '0.1.0',
    },
    description: 'Contact information.',
  });
export interface Project extends Schema.Schema.Type<typeof Project> {}

export const Task = Schema.Struct({
  id: ObjectId,
  name: Schema.String.annotations({ description: 'The name of the task.' }),
  description: Schema.optional(Schema.String).annotations({ description: 'The description of the task.' }),
  project: Type.Ref(Project),
  assignee: Type.Ref(Contact),
})
  .pipe(Schema.mutable)
  .annotations({
    [TypeAnnotationId]: {
      kind: EntityKind.Object,
      typename: 'example.com/type/Task',
      version: '0.1.0',
    },
    description: 'Contact information.',
  });
export interface Task extends Schema.Schema.Type<typeof Task> {}

/** @deprecated */
export const Organization = Schema.Struct({
  id: ObjectId,
  name: Schema.String.annotations({ description: 'The name of the organization.' }),
  projects: Schema.Array(Type.Ref(Project)),
  employees: Schema.Array(Type.Ref(Contact)),
})
  .pipe(Schema.mutable)
  .annotations({
    [TypeAnnotationId]: {
      kind: EntityKind.Object,
      typename: 'example.com/type/Organization',
      version: '0.1.0',
    },
    description: 'Contact information.',
  });
export interface Organization extends Schema.Schema.Type<typeof Organization> {}
