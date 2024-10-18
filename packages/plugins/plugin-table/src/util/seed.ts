// Copyright 2024 DXOS.org
//

import { create, S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { FieldValueType } from '@dxos/schema';

import { type TableType } from '../types';

const createStarterSchema = () => {
  return TypedObject({ typename: 'example.com/type/' + PublicKey.random().toHex(), version: '0.1.0' })({
    name: S.optional(S.String),
    description: S.optional(S.String),
    quantity: S.optional(S.Number),
  });
};

export const addStarterSchema = (space: Space, table: TableType) => {
  const schema = space.db.schema.addSchema(createStarterSchema());
  table.schema = schema;

  // Seed one blank row.
  space.db.add(create(table.schema, {}));
};

export const addStarterView = (table: TableType) => {
  table.view = {
    query: { schema: {} },
    fields: [
      { id: 'name', path: 'name', label: 'Name', type: FieldValueType.String },
      { id: 'description', path: 'description', label: 'Description', type: FieldValueType.String },
      { id: 'quantity', path: 'quantity', label: 'Quantity', type: FieldValueType.Number },
    ],
  } as const;
};
