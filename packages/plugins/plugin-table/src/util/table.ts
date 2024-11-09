//
// Copyright 2024 DXOS.org
//

import { create, S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { createView } from '@dxos/schema';

import { type TableType } from '../types';

// TODO(burdon): User should determine typename.
export const initializeTable = (space: Space, table: TableType): void => {
  if (!table?.view) {
    const schema = TypedObject({
      typename: `example.com/type/${PublicKey.random().truncate()}`,
      version: '0.1.0',
    })({
      name: S.optional(S.String),
      description: S.optional(S.String),
      quantity: S.optional(S.Number),
    });

    const mutable = space.db.schemaRegistry.addSchema(schema);
    table.view = createView({
      typename: mutable.typename,
      jsonSchema: mutable.jsonSchema,
      properties: ['name', 'description', 'quantity'],
    });

    space.db.add(create(mutable, {}));
  }
};
