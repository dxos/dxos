//
// Copyright 2024 DXOS.org
//

import { AST, type MutableSchema, S, TypedObject, type JsonPath } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { PublicKey } from '@dxos/react-client';
import { create, type Space } from '@dxos/react-client/echo';
import { createFieldId, createView } from '@dxos/schema';

import { type KanbanType } from '../defs';

type InitialiseKanbanProps = {
  space: Space;
  kanban: KanbanType;
  initialItem?: boolean;
};

// TODO(burdon): Pass in type.
// TODO(burdon): User should determine typename.
export const initializeKanban = ({ space, kanban, initialItem = true }: InitialiseKanbanProps): MutableSchema => {
  log.info('initializeKanban', { kanban });

  const TaskSchema = TypedObject({
    typename: `example.com/type/${PublicKey.random().truncate()}`,
    version: '0.1.0',
  })({
    title: S.optional(S.String).annotations({
      [AST.TitleAnnotationId]: 'Title',
    }),
    description: S.optional(S.String).annotations({
      [AST.TitleAnnotationId]: 'Description',
    }),
    state: S.optional(S.String).annotations({
      [AST.TitleAnnotationId]: 'State',
    }), // TODO(burdon): Should default to prop name?
  });

  const taskSchema = space.db.schemaRegistry.addSchema(TaskSchema);

  kanban.cardView = createView({
    name: 'Test kanban’s card view',
    typename: taskSchema.typename,
    jsonSchema: taskSchema.jsonSchema,
    fields: ['title', 'description'],
  });

  kanban.columnPivotField = {
    id: createFieldId(),
    path: 'state' as JsonPath,
  };

  if (initialItem) {
    // TODO(burdon): Last (first) item should not be in db and should be managed by the model.
    space.db.add(create(taskSchema, {}));
  }

  return taskSchema;
};
