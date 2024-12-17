//
// Copyright 2024 DXOS.org
//

import { AST, type MutableSchema, S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type Space, create } from '@dxos/react-client/echo';
import { createView } from '@dxos/schema';

import { KanbanType } from '../defs';

type InitialiseKanbanProps = {
  space: Space;
};

export const initializeKanban = ({
  space,
}: InitialiseKanbanProps): { kanban: KanbanType; taskSchema: MutableSchema } => {
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

  const kanban = space.db.add(
    create(KanbanType, {
      cardView: createView({
        name: 'Test kanban’s card view',
        typename: taskSchema.typename,
        jsonSchema: taskSchema.jsonSchema,
        fields: ['title', 'description', 'state'],
      }),
      columnField: 'state',
      arrangement: [
        { columnValue: 'To do', ids: [] },
        { columnValue: 'Doing', ids: [] },
        { columnValue: 'Done', ids: [] },
      ],
    }),
  );

  return { kanban, taskSchema };
};
