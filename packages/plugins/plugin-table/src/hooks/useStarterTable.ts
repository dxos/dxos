// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

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

type UseStarterTableProps = {
  table: TableType;
  space: Space | undefined;
};

/**
 * Hook to initialize a starter table with a schema and view.
 * This hook sets up the table schema and view when a space is available and the table doesn't have a schema.
 */
export const useStarterTable = ({ table, space }: UseStarterTableProps) => {
  useEffect(() => {
    if (space && !table.schema) {
      const schema = space.db.schema.addSchema(createStarterSchema());
      table.schema = schema;
      table.view = {
        query: { schema: {} },
        fields: [
          { id: 'name', path: 'name', label: 'Name', type: FieldValueType.String },
          { id: 'description', path: 'description', label: 'Description', type: FieldValueType.String },
          { id: 'quantity', path: 'quantity', label: 'Quantity', type: FieldValueType.Number },
        ],
      } as const;

      // Seed one blank row.
      space.db.add(create(table.schema, {}));
    }
  }, [space, table.schema]);
};
