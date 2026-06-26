//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Ref, Type } from '@dxos/echo';

// TODO(burdon): Replace with @dxos/echo/testing TestSchema.

/** @deprecated */
export class Contact extends Type.makeObject<Contact>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.annotations({ description: 'The name of the person.' }),
    email: Schema.optional(Schema.String).annotations({ description: 'Email address.' }),
  }).pipe(Schema.annotations({ description: 'Contact information.' })),
) {}
/** @deprecated */
export class Project extends Type.makeObject<Project>(DXN.make('com.example.type.project', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.annotations({ description: 'The name of the project.' }),
    description: Schema.optional(Schema.String).annotations({ description: 'The description of the project.' }),
  }).pipe(Schema.annotations({ description: 'Project information.' })),
) {}
export class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.annotations({ description: 'The name of the task.' }),
    description: Schema.optional(Schema.String).annotations({ description: 'The description of the task.' }),
    project: Ref.Ref(Project),
    assignee: Ref.Ref(Contact),
  }).pipe(Schema.annotations({ description: 'Task information.' })),
) {}
/** @deprecated */
export class Organization extends Type.makeObject<Organization>(DXN.make('com.example.type.organization', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.annotations({ description: 'The name of the organization.' }),
    projects: Schema.Array(Ref.Ref(Project)),
    employees: Schema.Array(Ref.Ref(Contact)),
  }).pipe(Schema.annotations({ description: 'Organization information.' })),
) {}
