//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { EntityKind, ObjectAnnotationId, Ref } from '@dxos/echo-schema';

// TODO(burdon): Reconcile with sdk/schema/testing.
// TODO(burdon): Convert interface to type.

// TODO(dmaretskyi): Extract.
export const ObjectId = S.String.annotations({ description: 'The unique object identifier.' });

export const Contact = S.Struct({
  id: ObjectId,
  name: S.String.annotations({ description: 'The name of the person.' }),
  email: S.optional(S.String).annotations({ description: 'Email address.' }),
})
  .pipe(S.mutable)
  .annotations({
    [ObjectAnnotationId]: {
      kind: EntityKind.Object,
      typename: 'example.com/type/Contact',
      version: '0.1.0',
    },
    description: 'Contact information.',
  });
export interface Contact extends S.Schema.Type<typeof Contact> {}

export const Project = S.Struct({
  id: ObjectId,
  name: S.String.annotations({ description: 'The name of the project.' }),
  description: S.optional(S.String).annotations({ description: 'The description of the project.' }),
})
  .pipe(S.mutable)
  .annotations({
    [ObjectAnnotationId]: {
      kind: EntityKind.Object,
      typename: 'example.com/type/Project',
      version: '0.1.0',
    },
    description: 'Contact information.',
  });
export interface Project extends S.Schema.Type<typeof Project> {}

export const Task = S.Struct({
  id: ObjectId,
  name: S.String.annotations({ description: 'The name of the task.' }),
  description: S.optional(S.String).annotations({ description: 'The description of the task.' }),
  project: Ref(Project),
  assignee: Ref(Contact),
})
  .pipe(S.mutable)
  .annotations({
    [ObjectAnnotationId]: {
      kind: EntityKind.Object,
      typename: 'example.com/type/Task',
      version: '0.1.0',
    },
    description: 'Contact information.',
  });
export interface Task extends S.Schema.Type<typeof Task> {}

export const Org = S.Struct({
  id: ObjectId,
  name: S.String.annotations({ description: 'The name of the organization.' }),
  projects: S.Array(Ref(Project)),
  employees: S.Array(Ref(Contact)),
})
  .pipe(S.mutable)
  .annotations({
    [ObjectAnnotationId]: {
      kind: EntityKind.Object,
      typename: 'example.com/type/Org',
      version: '0.1.0',
    },
    description: 'Contact information.',
  });
export interface Org extends S.Schema.Type<typeof Org> {}
