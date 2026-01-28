//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Entity, Obj, Ref, Type } from '@dxos/echo';
import {
  Format,
  FormatAnnotation,
  GeneratorAnnotation,
  LabelAnnotation,
  PropertyMetaAnnotationId,
} from '@dxos/echo/internal';
// eslint-disable-next-line unused-imports/no-unused-imports
import { View as _View } from '@dxos/schema';

import * as Person from './Person';
import * as Project from './Project';

/**
 * Task schema.
 */
export interface Task extends Entity.OfKind<typeof Entity.Kind.Object> {
  readonly title: string;
  readonly priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  readonly status?: 'todo' | 'in-progress' | 'done';
  readonly assigned?: Ref.Ref<Person.Person>;
  readonly estimate?: number;
  readonly description?: string;
  readonly project?: Ref.Ref<Project.Project>;
}

export type TaskEncoded = {
  readonly id: string;
  readonly title: string;
  readonly priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  readonly status?: 'todo' | 'in-progress' | 'done';
  readonly assigned?: string;
  readonly estimate?: number;
  readonly description?: string;
  readonly project?: string;
};

const TaskSchema = Schema.Struct({
  title: Schema.String.pipe(
    Schema.annotations({ title: 'Title' }),
    GeneratorAnnotation.set({
      generator: 'lorem.words',
      args: [{ min: 3, max: 10 }],
    }),
  ),
  priority: Schema.Literal('none', 'low', 'medium', 'high', 'urgent').pipe(
    FormatAnnotation.set(Format.TypeFormat.SingleSelect),
    GeneratorAnnotation.set({
      generator: 'helpers.arrayElement',
      args: [['none', 'low', 'medium', 'high', 'urgent']],
    }),
    Schema.annotations({
      title: 'Priority',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: [
            { id: 'none', title: 'None', color: 'gray' },
            { id: 'low', title: 'Low', color: 'indigo' },
            { id: 'medium', title: 'Medium', color: 'purple' },
            { id: 'high', title: 'High', color: 'amber' },
            { id: 'urgent', title: 'Urgent', color: 'red' },
          ],
        },
      },
    }),
    Schema.optional,
  ),
  status: Schema.Literal('todo', 'in-progress', 'done').pipe(
    FormatAnnotation.set(Format.TypeFormat.SingleSelect),
    GeneratorAnnotation.set({
      generator: 'helpers.arrayElement',
      args: [['todo', 'in-progress', 'done']],
    }),
    Schema.annotations({
      title: 'Status',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: [
            { id: 'todo', title: 'Todo', color: 'indigo' },
            { id: 'in-progress', title: 'In Progress', color: 'purple' },
            { id: 'done', title: 'Done', color: 'amber' },
          ],
        },
      },
    }),
    Schema.optional,
  ),
  assigned: Schema.optional(Type.Ref(Person.Person).annotations({ title: 'Assigned' })),
  estimate: Schema.optional(Schema.Number.annotations({ title: 'Estimate' })),
  description: Schema.optional(
    Schema.String.annotations({ title: 'Description' }).pipe(
      GeneratorAnnotation.set({
        generator: 'lorem.paragraphs',
        args: [{ min: 1, max: 3 }],
      }),
    ),
  ),
  project: Schema.optional(Type.Ref(Project.Project).annotations({ title: 'Project' })),
  // TODO(burdon): Created date metadata.
  // due: Date,
  // TODO(burdon): Generic tags.
  // tags: [String],
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Task',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['title']),
);

// Type annotation hides internal types while preserving brand properties.
export const Task: Type.Obj.Of<Schema.Schema<Task, TaskEncoded>> = TaskSchema as any;

export const make = (props: Type.Properties<Task>): Task => Obj.make(Task, props);
