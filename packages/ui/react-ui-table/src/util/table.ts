//
// Copyright 2024 DXOS.org
//

import {
  AST,
  Format,
  FormatEnum,
  type JsonPath,
  type JsonProp,
  type EchoSchema,
  S,
  TypedObject,
  TypeEnum,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { Client, PublicKey } from '@dxos/react-client';
import { create, makeRef, type Space } from '@dxos/react-client/echo';
import { createFieldId, createView, getSchemaProperties, ViewProjection } from '@dxos/schema';

import { type TableType } from '../types';

type InitialiseTableProps = {
  client: Client;
  space: Space;
  table: TableType;
  initialRow?: boolean;
  initialSchema?: string;
};

// TODO(ZaymonFC): Clean up the branching in this file.

// TODO(burdon): Pass in type.
// TODO(burdon): User should determine typename.
export const initializeTable = async ({
  client,
  space,
  table,
  initialRow = true,
  initialSchema,
}: InitialiseTableProps): Promise<EchoSchema> => {
  console.log('initializeTable', { table, client, initialSchema });

  if (initialSchema) {
    console.log('[Table] > Querying for schema:', initialSchema);
    let schema = await space.db.schemaRegistry.query({ typename: initialSchema }).firstOrUndefined();
    if (!schema) {
      schema = await client.spaces.default.db.schemaRegistry.query({ typename: initialSchema }).firstOrUndefined();
    }

    if (!schema) {
      throw new Error(`Schema not found: ${initialSchema}`);
    }

    // We need to get the schema properties here. For now, only simple types, not compound types
    // are going to be supported.

    const fields = getSchemaProperties(schema.ast)
      .filter((prop) => prop.type !== 'object')
      .map((prop) => prop.name);

    table.view = makeRef(
      createView({
        // TODO(ZaymonFC): Don't hardcode name?
        name: 'Test',
        typename: schema.typename,
        jsonSchema: schema.jsonSchema,
        fields,
      }),
    );

    return schema;
  } else {
    const ContactSchema = TypedObject({
      typename: `example.com/type/${PublicKey.random().truncate()}`,
      version: '0.1.0',
    })({
      name: S.optional(S.String).annotations({
        [AST.TitleAnnotationId]: 'Name',
      }),
      active: S.optional(S.Boolean),
      email: S.optional(Format.Email),
      salary: S.optional(Format.Currency()).annotations({
        [AST.TitleAnnotationId]: 'Salary',
      }), // TODO(burdon): Should default to prop name?
    });

    const [contactSchema] = await space.db.schemaRegistry.register([ContactSchema]);

    table.view = makeRef(
      createView({
        // TODO(ZaymonFC): Don't hardcode name?
        name: 'Test',
        typename: contactSchema.typename,
        jsonSchema: contactSchema.jsonSchema,
        fields: ['name', 'active', 'email', 'salary'],
      }),
    );

    const projection = new ViewProjection(contactSchema, table.view.target!);
    projection.setFieldProjection({
      field: {
        id: table.view.target!.fields.find((f) => f.path === 'salary')!.id,
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
        referenceSchema: contactSchema.typename,
        title: 'Manager',
      },
    });
    if (initialRow) {
      // TODO(burdon): Last (first) row should not be in db and should be managed by the model.
      space.db.add(create(contactSchema, {}));
    }

    return contactSchema;
  }
};
