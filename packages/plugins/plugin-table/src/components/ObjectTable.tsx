//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect } from 'react';

import { S, TypedObject, type EchoReactiveObject } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { PublicKey } from '@dxos/react-client';
import { create, getSpace, useQuery, Filter } from '@dxos/react-client/echo';
import { Button, Icon } from '@dxos/react-ui';
import { FieldValueType } from '@dxos/schema';

import { Table } from './Table';
import { type TableType } from '../types';

const createStarterSchema = () => {
  return TypedObject({ typename: 'example.com/type/' + PublicKey.random().toHex(), version: '0.1.0' })({
    name: S.optional(S.String),
    description: S.optional(S.String),
    quantity: S.optional(S.Number),
  });
};

export type ObjectTableProps = {
  table: TableType;
};

export const ObjectTable = ({ table }: ObjectTableProps) => {
  const space = getSpace(table);
  const queriedObjects = useQuery<EchoReactiveObject<any>>(
    space,
    table.schema ? Filter.schema(table.schema) : () => false,
    undefined,
    // TODO(burdon): Toggle deleted.
    [table.schema],
  );
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const handleNewRow = useCallback(() => {
    if (!table.schema || !space) {
      return;
    }
    space.db.add(create(table.schema, {}));
  }, [table.schema, space]);

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
      };

      handleNewRow();
    }
  }, [table.schema]);

  // TODO(Zan): Do we need this?
  if (!table.schema) {
    return <p>No schema</p>;
  }

  return (
    <div className='border border-separator is-full max-is-max min-is-0 mli-auto'>
      <Table table={table} data={filteredObjects} />
      <Button classNames='w-full' onClick={() => handleAdd()}>
        <Icon icon='ph--plus--regular' size={4} />
      </Button>
    </div>
  );
};
