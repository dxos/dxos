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
import { createView, ViewProjection } from '@dxos/schema';
import { createFieldId } from '@dxos/schema/src';

import { type TableType } from '../types';

// TODO(burdon): Pass in type.
// TODO(burdon): User should determine typename.
export const initializeTable = ({ space, table }: { space: Space; table: TableType }): MutableSchema => {
  const TestSchema = TypedObject({
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

  const mutable = space.db.schemaRegistry.addSchema(TestSchema);
  table.view = createView({
    typename: mutable.typename,
    jsonSchema: mutable.jsonSchema,
    properties: ['name', 'email', 'salary'],
  });

  const projection = new ViewProjection(mutable, table.view!);
  projection.setFieldProjection({
    field: {
      id: table.view.fields[2].id,
      path: 'salary' as JsonPath,
      size: 150,
    },
  });

  // Add field with reference.
  const ref = true;
  if (ref) {
    projection.setFieldProjection({
      field: {
        id: createFieldId(),
        path: 'manager' as JsonPath,
      },
      props: {
        property: 'manager' as JsonProp,
        type: TypeEnum.Ref,
        format: FormatEnum.Ref,
        referenceSchema: mutable.typename,
        referencePath: 'name' as JsonPath,
        title: 'Manager',
      },
    });
  }

  return mutable;
};
