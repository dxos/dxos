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
import { PublicKey } from '@dxos/react-client';
import { create, makeRef, type Space } from '@dxos/react-client/echo';
import { createFieldId, createView, ViewProjection } from '@dxos/schema';

import { type TableType } from '../types';

type InitialiseTableProps = {
  space: Space;
  table: TableType;
  initialRow?: boolean;
};

// TODO(burdon): Pass in type.
// TODO(burdon): User should determine typename.
export const initializeTable = async ({
  space,
  table,
  initialRow = true,
}: InitialiseTableProps): Promise<EchoSchema> => {
  log('initializeTable', { table });

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
};
