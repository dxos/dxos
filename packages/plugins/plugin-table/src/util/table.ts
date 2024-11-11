//
// Copyright 2024 DXOS.org
//

import { FormatEnum, type JsonProp, type MutableSchema, S, TypedObject, TypeEnum } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { createView, ViewProjection } from '@dxos/schema';

import { type TableType } from '../types';

// TODO(burdon): Pass in type.
// TODO(burdon): User should determine typename.
export const initializeTable = ({ space, table }: { space: Space; table: TableType }): MutableSchema => {
  const TestSchema = TypedObject({
    typename: `example.com/type/${PublicKey.random().truncate()}`,
    version: '0.1.0',
  })({
    name: S.optional(S.String),
    description: S.optional(S.String),
    quantity: S.optional(S.Number), // TODO(burdon): Schema doesn't make sense with manager field.
  });

  const mutable = space.db.schemaRegistry.addSchema(TestSchema);
  table.view = createView({
    typename: mutable.typename,
    jsonSchema: mutable.jsonSchema,
    properties: ['name', 'description', 'quantity'],
  });

  // Add field with reference.
  const ref = true;
  if (ref) {
    const projection = new ViewProjection(mutable, table.view!);
    projection.setFieldProjection({
      field: {
        property: 'manager' as JsonProp,
        referenceProperty: 'name' as JsonProp, // TODO(burdon): Doesn't initially show up.
      },
      props: {
        property: 'manager' as JsonProp,
        type: TypeEnum.Ref,
        format: FormatEnum.Ref,
        referenceSchema: mutable.typename,
      },
    });
  }

  return mutable;
};
