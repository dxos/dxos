//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { create, S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { createView } from '@dxos/schema';

import { type TableType } from '../types';

/**
 * Initializes a new view for table if one does not exist.
 * Creates a new schema and registers it with the database.
 */
export const useTableIntialisation = (table?: TableType) => {
  const space = getSpace(table);

  useEffect(() => {
    if (space && table && !table?.view) {
      const schema = TypedObject({
        typename: 'example.com/type/' + PublicKey.random().truncate(),
        version: '0.1.0',
      })({
        name: S.optional(S.String),
        description: S.optional(S.String),
        quantity: S.optional(S.Number),
      });

      // Register schema.
      const mutable = space.db.schemaRegistry.addSchema(schema);
      table.view = createView({
        typename: mutable.typename,
        jsonSchema: mutable.jsonSchema,
        properties: ['name', 'description', 'quantity'],
      });

      // Create first row.
      space.db.add(create(mutable, {}));
    }
  }, [space, table]);
};
