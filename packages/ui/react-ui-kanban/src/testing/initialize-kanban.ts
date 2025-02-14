//
// Copyright 2024 DXOS.org
//

import { AST, type EchoSchema, S, TypedObject, FormatEnum, TypeEnum, type JsonProp } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/react-client';
import { type Space, create, makeRef } from '@dxos/react-client/echo';
import { createView, ViewProjection, createFieldId } from '@dxos/schema';
import { capitalize } from '@dxos/util';

import { KanbanType } from '../defs';

type InitialiseKanbanProps = {
  space: Space;
};

export const initializeKanban = async ({
  space,
}: InitialiseKanbanProps): Promise<{ kanban: KanbanType; taskSchema: EchoSchema }> => {
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
  });

  const [taskSchema] = await space.db.schemaRegistry.register([TaskSchema]);

  const view = createView({
    name: "Test kanban's card view",
    typename: taskSchema.typename,
    jsonSchema: taskSchema.jsonSchema,
    fields: ['title', 'description'],
  });

  const stateOptions = [
    { id: PublicKey.random().truncate(), title: 'Draft', color: 'indigo' },
    { id: PublicKey.random().truncate(), title: 'Active', color: 'cyan' },
    { id: PublicKey.random().truncate(), title: 'Completed', color: 'emerald' },
  ];

  const initialPivotField = 'state';

  const viewProjection = new ViewProjection(taskSchema, view);

  viewProjection.setFieldProjection({
    field: {
      id: createFieldId(),
      path: initialPivotField as JsonProp,
      size: 150,
    },
    props: {
      property: initialPivotField as JsonProp,
      type: TypeEnum.String,
      format: FormatEnum.SingleSelect,
      title: capitalize(initialPivotField),
      options: stateOptions,
    },
  });

  const fieldId = viewProjection.getFieldId(initialPivotField);
  invariant(fieldId);

  const kanban = space.db.add(
    create(KanbanType, {
      cardView: makeRef(view),
      columnFieldId: fieldId,
      // NOTE(ZaymonFC): Kanban arrangement is computed automatically.
    }),
  );

  return { kanban, taskSchema };
};
