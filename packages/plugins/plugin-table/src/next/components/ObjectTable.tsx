//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { create, getSpace } from '@dxos/react-client/echo';
import { Button, Icon } from '@dxos/react-ui';

import { Table } from './Table';
import { type TableType } from '../../types';
import { useTableObjects } from '../hooks';

export type ObjectTableProps = {
  table: TableType;
};

export const ObjectTable = ({ table }: ObjectTableProps) => {
  const space = getSpace(table);
  const objects = useTableObjects(space, table.schema);

  // TODO(Zan): Delete this after testing.
  const handleAdd = () => {
    if (!table.schema || !space) {
      return;
    }

    space.db.add(create(table.schema, { title: 'test', description: 'content', count: 0 }));
  };

  // TODO(Zan): Do we need this?
  if (!table.schema) {
    return <p>No schema</p>;
  }

  return (
    <div className='flex flex-col w-full'>
      <Table table={table} data={objects} />
      <Button onClick={() => handleAdd()}>
        <Icon icon='ph--plus--regular' size={4} />
      </Button>
    </div>
  );
};
