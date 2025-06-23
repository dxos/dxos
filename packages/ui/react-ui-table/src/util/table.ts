//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import {
  type EchoSchema,
  Format,
  FormatEnum,
  type JsonPath,
  type JsonProp,
  Ref,
  TypedObject,
  TypeEnum,
} from '@dxos/echo-schema';
import { type Client, PublicKey } from '@dxos/react-client';
import { live, type Space } from '@dxos/react-client/echo';
import { createFieldId, createView, getSchemaProperties, ViewProjection, type ViewType } from '@dxos/schema';

import { type TableType } from '../types';

// TODO(ZaymonFC): We don't need the client anymore.
type InitialiseTableProps = {
  client: Client;
  space: Space;
  table: TableType;
  typename?: string;
  initialRow?: boolean;
};

export const initializeTable = async ({
  client,
  space,
  table,
  typename,
  initialRow = true,
}: InitialiseTableProps): Promise<Schema.Schema.AnyNoContext> => {
  if (typename) {
    const schema = await space.db.graph.getSchemaByTypename(typename, space.db);
    if (!schema) {
      throw new Error(`Schema not found: ${typename}`);
    }

    const fields = getSchemaProperties(schema.ast).map((prop) => prop.name);

    table.view = Ref.make(
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
    const [schema] = await space.db.schemaRegistry.register([createContactSchema()]);
    const fields = ContactFields;

    table.view = Ref.make(
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
      space.db.add(live(schema, {}));
    }

    return schema;
  }
};

const createContactSchema = () =>
  TypedObject({
    typename: `example.com/type/${PublicKey.random().truncate()}`,
    version: '0.1.0',
  })({
    name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
    active: Schema.optional(Schema.Boolean).annotations({ title: 'Active' }),
    email: Schema.optional(Format.Email),
    salary: Schema.optional(Format.Currency()).annotations({ title: 'Salary' }),
  });

const ContactFields = ['name', 'email', 'salary', 'active'];

const createProjection = (schema: EchoSchema, view: ViewType): ViewProjection => {
  const projection = new ViewProjection(schema.jsonSchema, view);
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
