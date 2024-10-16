//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { create, getSpace, useQuery, Filter } from '@dxos/react-client/echo';
import { Button, Icon } from '@dxos/react-ui';

import { Table } from './Table';
import { type TableType } from '../types';

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

  // TODO(Zan): Delete this after testing.
  const handleAdd = () => {
    if (!table.schema || !space) {
      return;
    }
    space.db.add(create(table.schema, {}));
  };

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
