//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { JsonSchema, Obj, Ref, Type } from '@dxos/echo';
import { TypedObject, FormatEnum, TypeEnum, type JsonProp, type EchoSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type Client, PublicKey } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { KanbanType } from '@dxos/react-ui-kanban';
import { createView, ViewProjection, createFieldId, getSchemaProperties } from '@dxos/schema';
import { capitalize } from '@dxos/util';

// TODO(wittjosiah): UI package shouldn't depend on client.

type InitializeKanbanProps = {
  client: Client;
  space: Space;
  name?: string;
  typename?: string;
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
    title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
    description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
    state: Schema.optional(Schema.String),
  });

  return { schema, stateOptions };
};

export const initializeKanban = async ({
  client,
  space,
  name,
  typename,
  initialPivotColumn,
}: InitializeKanbanProps): Promise<{ kanban: KanbanType; schema?: EchoSchema }> => {
  if (typename) {
    const staticSchema = client.graph.schemaRegistry.schemas.find((schema) => Type.getTypename(schema) === typename);
    const schema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();

    const ast = staticSchema?.ast ?? schema?.ast;
    const jsonSchema = staticSchema ? JsonSchema.toJsonSchema(staticSchema) : schema?.jsonSchema;
    invariant(ast, `Schema not found: ${typename}`);
    invariant(jsonSchema, `Schema not found: ${typename}`);

    const fields = getSchemaProperties(ast)
      .filter((prop) => prop.type !== 'object' || prop.format === FormatEnum.Ref)
      .map((prop) => prop.name);

    const view = createView({
      name: "Kanban's card view",
      typename,
      jsonSchema,
      fields,
    });

    const kanban = Obj.make(KanbanType, { cardView: Ref.make(view), columnFieldId: undefined, name });
    if (initialPivotColumn) {
      const viewProjection = new ViewProjection(jsonSchema, view);
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

    const viewProjection = new ViewProjection(schema.jsonSchema, view);

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

    const kanban = Obj.make(KanbanType, { cardView: Ref.make(view), columnFieldId: fieldId });
    return { kanban, schema };
  }
};
