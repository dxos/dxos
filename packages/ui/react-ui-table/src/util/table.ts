//
// Copyright 2024 DXOS.org
//

import {
  AST,
  type EchoSchema,
  Format,
  FormatEnum,
  type JsonPath,
  type JsonProp,
  S,
  TypedObject,
  TypeEnum,
} from '@dxos/echo-schema';
import { type Client, PublicKey } from '@dxos/react-client';
import { create, getSchemaByTypename, makeRef, type Space } from '@dxos/react-client/echo';
import { createFieldId, createView, getSchemaProperties, ViewProjection, type ViewType } from '@dxos/schema';

import { type TableType } from '../types';

type InitialiseTableProps = {
  client: Client;
  space: Space;
  table: TableType;
  typename?: string;
  initialRow?: boolean;
};

// TODO(ZaymonFC): Clean up the branching in this file.
export const initializeTable = async ({
  client,
  space,
  table,
  typename,
  initialRow = true,
}: InitialiseTableProps): Promise<S.Schema.AnyNoContext> => {
  if (typename) {
    const schema = await getSchemaByTypename(client, space, typename);
    if (!schema) {
      throw new Error(`Schema not found: ${typename}`);
    }

    // We need to get the schema properties here.
    // For now, only simple types and refs, not compound types are going to be supported.
    const fields = getSchemaProperties(schema.ast)
      .filter((prop) => prop.format !== FormatEnum.Ref)
      .map((prop) => prop.name);

    table.view = makeRef(
      createView({
        // TODO(ZaymonFC): Don't hardcode name?
        name: 'View',
        typename: schema.typename,
        jsonSchema: schema.jsonSchema,
        fields,
      }),
    );

    return schema;
  } else {
    const [schema] = await space.db.schemaRegistry.register([ContactSchema]);
    const fields = ContactFields;

    table.view = makeRef(
      createView({
        name: 'View',
        typename: schema.typename,
        jsonSchema: schema.jsonSchema,
        fields,
      }),
    );

    createProjection(schema, table.view.target!);

    if (initialRow) {
      // TODO(burdon): Last (first) row should not be in db and should be managed by the model.
      space.db.add(create(schema, {}));
    }

    return schema;
  }
};

const ContactSchema = TypedObject({
  typename: `example.com/type/${PublicKey.random().truncate()}`,
  version: '0.1.0',
})({
  name: S.optional(S.String).annotations({ [AST.TitleAnnotationId]: 'Name' }),
  active: S.optional(S.Boolean),
  email: S.optional(Format.Email),
  salary: S.optional(Format.Currency()).annotations({ [AST.TitleAnnotationId]: 'Salary' }),
});

const ContactFields = ['name', 'email', 'salary', 'active'];

const createProjection = (schema: EchoSchema, view: ViewType): ViewProjection => {
  const projection = new ViewProjection(schema, view);
  projection.setFieldProjection({
    field: {
      id: view.fields.find((f) => f.path === 'salary')!.id,
      path: 'salary' as JsonPath,
      size: 150,
    },
  });
  projection.setFieldProjection({
    field: {
      id: view.fields.find((f) => f.path === 'active')!.id,
      path: 'active' as JsonPath,
      size: 100,
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
      referenceSchema: schema.typename,
      title: 'Manager',
    },
  });

  return projection;
};
