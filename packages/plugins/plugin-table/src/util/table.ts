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
import { PublicKey } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { createFieldId, createView, ViewProjection } from '@dxos/schema';

import { type TableType } from '../types';

// TODO(burdon): Pass in type.
// TODO(burdon): User should determine typename.
export const initializeTable = ({ space, table }: { space: Space; table: TableType }): MutableSchema => {
  const ContactSchema = TypedObject({
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

  const contactSchema = space.db.schemaRegistry.addSchema(ContactSchema);
  table.view = createView({
    typename: contactSchema.typename,
    jsonSchema: contactSchema.jsonSchema,
    properties: ['name', 'email', 'salary'],
  });

  const projection = new ViewProjection(contactSchema, table.view!);
  projection.setFieldProjection({
    field: {
      id: table.view.fields[2].id,
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

  return contactSchema;
};
