//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { FormatAnnotation, FormatEnum, LabelAnnotation, PropertyMetaAnnotationId } from '@dxos/echo-schema';

import { Person } from './person';

/**
 * Task schema.
 */
const TaskSchema = Schema.Struct({
  title: Schema.String.annotations({ title: 'Title' }),
  priority: Schema.optional(
    Schema.Literal('none', 'low', 'medium', 'high', 'urgent')
      .pipe(FormatAnnotation.set(FormatEnum.SingleSelect))
      .annotations({
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
  status: Schema.optional(
    Schema.Literal('todo', 'in-progress', 'done')
      .pipe(FormatAnnotation.set(FormatEnum.SingleSelect))
      .annotations({
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
  assigned: Schema.optional(Type.Ref(Person).annotations({ title: 'Assigned' })),
  estimate: Schema.optional(Schema.Number.annotations({ title: 'Estimate' })),
  description: Schema.optional(Schema.String.annotations({ title: 'Description' })),
  // TODO(burdon): Created date metadata.
  // due: Date,
  // TODO(burdon): Generic tags.
  // tags: [String],
}).pipe(LabelAnnotation.set(['title']));

export const Task = TaskSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Task',
    version: '0.2.0',
  }),
);

export interface Task extends Schema.Schema.Type<typeof Task> {}
