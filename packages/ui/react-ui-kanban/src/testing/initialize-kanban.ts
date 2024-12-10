//
// Copyright 2024 DXOS.org
//

import {
  AST,
  Format,
  FormatEnum,
  type JsonPath,
  type JsonProp,
  type MutableSchema,
  S,
  TypedObject,
  TypeEnum,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { PublicKey } from '@dxos/react-client';
import { create, type Space } from '@dxos/react-client/echo';
import { createFieldId, createView, ViewProjection } from '@dxos/schema';

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
    name: S.optional(S.String).annotations({
      [AST.TitleAnnotationId]: 'Name',
    }),
    email: S.optional(Format.Email),
    salary: S.optional(Format.Currency()).annotations({
      [AST.TitleAnnotationId]: 'Salary',
    }), // TODO(burdon): Should default to prop name?
  });

  const taskSchema = space.db.schemaRegistry.addSchema(TaskSchema);
  kanban.cardView = createView({
    name: 'Test',
    typename: taskSchema.typename,
    jsonSchema: taskSchema.jsonSchema,
    fields: ['name', 'email', 'salary'],
  });

  const projection = new ViewProjection(taskSchema, kanban.cardView!);
  projection.setFieldProjection({
    field: {
      id: kanban.cardView.fields[2].id,
      path: 'salary' as JsonPath,
      size: 150,
    },
  });

  projection.setFieldProjection({
    field: {
      id: createFieldId(),
      path: 'manager' as JsonPath,
      referencePath: 'name' as JsonPath,
    },
    props: {
      property: 'manager' as JsonProp,
      type: TypeEnum.Ref,
      format: FormatEnum.Ref,
      referenceSchema: taskSchema.typename,
      title: 'Manager',
    },
  });

  if (initialItem) {
    // TODO(burdon): Last (first) item should not be in db and should be managed by the model.
    space.db.add(create(taskSchema, {}));
  }

  return taskSchema;
};
