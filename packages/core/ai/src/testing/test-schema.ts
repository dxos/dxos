//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EntityKind, ObjectId, Ref, TypeAnnotationId } from '@dxos/echo-schema';

// TODO(burdon): Remove (use @dxos/schema DataType).

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
      typename: 'example.com/type/Contact',
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
  project: Ref(Project),
  assignee: Ref(Contact),
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
  projects: Schema.Array(Ref(Project)),
  employees: Schema.Array(Ref(Contact)),
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
