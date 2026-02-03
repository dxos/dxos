//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Filter, Query, Type } from '@dxos/echo';
import { Format, FormatAnnotation, PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { createEchoSchema } from '@dxos/echo/testing';
import { ObjectId } from '@dxos/keys';
import { ProjectionModel, View, createEchoChangeCallback } from '@dxos/schema';

import { type BaseKanbanItem, KanbanModel, createEchoChangeCallback as createEchoKanbanChangeCallback } from '../model';
import { Kanban } from '../types';

const StatusOptions = [
  { id: 'todo', title: 'Todo', color: 'indigo' },
  { id: 'in-progress', title: 'In Progress', color: 'purple' },
  { id: 'done', title: 'Done', color: 'green' },
];

export const Task = Schema.Struct({
  title: Schema.String,
  status: Schema.Literal('todo', 'in-progress', 'done').pipe(
    FormatAnnotation.set(Format.TypeFormat.SingleSelect),
    Schema.annotations({
      title: 'Status',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: StatusOptions,
        },
      },
    }),
    Schema.optional,
  ),
}).pipe(
  Type.object({
    typename: 'example.com/type/Task',
    version: '0.1.0',
  }),
);

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type TaskItem = BaseKanbanItem & {
  title: string;
  status?: TaskStatus;
};

export const createTaskItem = (title: string, status?: TaskStatus): TaskItem => ({
  id: ObjectId.random(),
  title,
  status,
});

export const createKanbanModel = (registry: Registry.Registry): KanbanModel<TaskItem> => {
  const schema = createEchoSchema(Task);

  const view = View.make({
    query: Query.select(Filter.type(schema)),
    jsonSchema: schema.jsonSchema,
    pivotFieldName: 'status',
  });

  const object = Kanban.make({ view });

  const projection = new ProjectionModel({
    registry,
    view,
    baseSchema: schema.jsonSchema,
    change: createEchoChangeCallback(view, schema),
  });
  projection.normalizeView();

  const model = new KanbanModel<TaskItem>({
    registry,
    object,
    projection,
    change: createEchoKanbanChangeCallback<TaskItem>(object),
  });

  return model;
};
