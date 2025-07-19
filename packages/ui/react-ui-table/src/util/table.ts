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
  TypedObject,
  TypeEnum,
} from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { live, type Space } from '@dxos/react-client/echo';
import { createFieldId, createProjection, getSchemaProperties, ProjectionManager, type Projection } from '@dxos/schema';

type InitialiseTableProps = {
  space: Space;
  typename?: string;
  initialRow?: boolean;
};

// TODO(wittjosiah): Factor out to @dxos/schema.
export const initializeProjection = async ({
  space,
  typename,
  initialRow = true,
}: InitialiseTableProps): Promise<{ schema: EchoSchema; projection: Projection }> => {
  if (typename) {
    const schema = await space.db.schemaRegistry.query({ typename }).first();
    const fields = getSchemaProperties(schema.ast).map((prop) => prop.name);

    return {
      schema,
      projection: createProjection({
        typename: schema.typename,
        jsonSchema: schema.jsonSchema,
        fields,
      }),
    };
  } else {
    const [schema] = await space.db.schemaRegistry.register([createContactSchema()]);
    const fields = ContactFields;
    const projection = createProjection({
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
      fields,
    });

    createProjectionManager(schema, projection);

    if (initialRow) {
      // TODO(burdon): Last (first) row should not be in db and should be managed by the model.
      space.db.add(live(schema, {}));
    }

    return { schema, projection };
  }
};

// TODO(wittjosiah): Remove.

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

const createProjectionManager = (schema: EchoSchema, projection: Projection): ProjectionManager => {
  const manager = new ProjectionManager(schema.jsonSchema, projection);
  manager.setFieldProjection({
    field: {
      id: projection.fields.find((f) => f.path === 'salary')!.id,
      path: 'salary' as JsonPath,
    },
  });
  manager.setFieldProjection({
    field: {
      id: projection.fields.find((f) => f.path === 'active')!.id,
      path: 'active' as JsonPath,
    },
  });
  manager.setFieldProjection({
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

  return manager;
};
