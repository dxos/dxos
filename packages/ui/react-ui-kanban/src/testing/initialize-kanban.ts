//
// Copyright 2024 DXOS.org
//

import { AST, S, TypedObject, FormatEnum, TypeEnum, type JsonProp, type EchoSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/react-client';
import { type Space, create, makeRef } from '@dxos/react-client/echo';
import { createView, ViewProjection, createFieldId, getSchemaProperties } from '@dxos/schema';
import { capitalize } from '@dxos/util';

import { KanbanType } from '../defs';

type InitializeKanbanProps = {
  space: Space;
  initialSchema?: string;
  initialPivotColumn?: string;
};

const createDefaultTaskSchema = () => {
  const stateOptions = [
    { id: PublicKey.random().truncate(), title: 'Draft', color: 'indigo' },
    { id: PublicKey.random().truncate(), title: 'Active', color: 'cyan' },
    { id: PublicKey.random().truncate(), title: 'Completed', color: 'emerald' },
  ];

  const schema = TypedObject({
    typename: `example.com/type/${PublicKey.random().truncate()}`,
    version: '0.1.0',
  })({
    title: S.optional(S.String).annotations({
      [AST.TitleAnnotationId]: 'Title',
    }),
    description: S.optional(S.String).annotations({
      [AST.TitleAnnotationId]: 'Description',
    }),
    state: S.optional(S.String),
  });

  return { schema, stateOptions };
};

export const initializeKanban = async ({
  space,
  initialSchema,
  initialPivotColumn,
}: InitializeKanbanProps): Promise<{ kanban: KanbanType; schema: EchoSchema }> => {
  if (initialSchema) {
    const schema = await space.db.schemaRegistry.query({ typename: initialSchema }).firstOrUndefined();
    invariant(schema, `Schema not found: ${initialSchema}`);

    const fields = getSchemaProperties(schema.ast)
      .filter((prop) => prop.type !== 'object' || prop.format === FormatEnum.Ref)
      .map((prop) => prop.name);

    const view = createView({
      name: "Kanban's card view",
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
      fields,
    });

    const kanban = create(KanbanType, { cardView: makeRef(view), columnFieldId: undefined });
    if (initialPivotColumn) {
      const viewProjection = new ViewProjection(schema, view);
      const fieldId = viewProjection.getFieldId(initialPivotColumn);
      if (fieldId) {
        kanban.columnFieldId = fieldId;
      }
    }
    return { kanban, schema };
  } else {
    const { schema: taskSchema, stateOptions } = createDefaultTaskSchema();
    const [schema] = await space.db.schemaRegistry.register([taskSchema]);

    const view = createView({
      name: "Kanban's card view",
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
      fields: ['title', 'description'],
    });

    const viewProjection = new ViewProjection(schema, view);

    // Set description field to Markdown format.
    const descriptionFieldId = viewProjection.getFieldId('description');
    if (descriptionFieldId) {
      const fieldProjection = viewProjection.getFieldProjection(descriptionFieldId);
      if (fieldProjection) {
        viewProjection.setFieldProjection({
          ...fieldProjection,
          props: { ...fieldProjection.props, format: FormatEnum.Markdown },
        });
      }
    }

    const initialPivotField = 'state';
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

    const kanban = create(KanbanType, { cardView: makeRef(view), columnFieldId: fieldId });
    return { kanban, schema };
  }
};
