//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import {
  FormatAnnotation,
  FormatEnum,
  GeneratorAnnotation,
  LabelAnnotation,
  PropertyMetaAnnotationId,
} from '@dxos/echo/internal';
import { ItemAnnotation } from '@dxos/schema';
// eslint-disable-next-line unused-imports/no-unused-imports
import { View as _View } from '@dxos/schema';

import * as Person from './Person';
import * as Project from './Project';

/**
 * Task schema.
 */
export const Task = Schema.Struct({
  title: Schema.String.pipe(
    Schema.annotations({ title: 'Title' }),
    GeneratorAnnotation.set({
      generator: 'lorem.words',
      args: [{ min: 3, max: 10 }],
    }),
  ),
  priority: Schema.optional(
    Schema.Literal('none', 'low', 'medium', 'high', 'urgent').pipe(
      FormatAnnotation.set(FormatEnum.SingleSelect),
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
    ),
  ),
  status: Schema.optional(
    Schema.Literal('todo', 'in-progress', 'done').pipe(
      FormatAnnotation.set(FormatEnum.SingleSelect),
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
    ),
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
  ItemAnnotation.set(true),
);

export interface Task extends Schema.Schema.Type<typeof Task> {}

export const make = (props: Obj.MakeProps<typeof Task>): Task => Obj.make(Task, props);
