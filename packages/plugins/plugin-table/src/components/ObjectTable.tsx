//
// Copyright 2024 DXOS.org
//

import React, { useEffect } from 'react';

import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { type EchoReactiveObject, Filter, getSpace, useQuery } from '@dxos/react-client/echo';

import { Table } from './Table';
import { type TableType } from '../types';
import { addStarterSchema, addStarterView } from '../util';

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

  useEffect(() => {
    if (space && !table.schema && !table.view) {
      addStarterSchema(space, table);
      addStarterView(table);
    }
  }, [space, table.schema]);

  if (!table.schema || !table.view) {
    return null;
  }

  return <Table table={table} data={filteredObjects} />;
};
