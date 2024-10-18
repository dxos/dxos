//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect } from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { create, getSpace, useQuery, Filter } from '@dxos/react-client/echo';

import { Table } from './Table';
import { useStarterTable } from '../hooks';
import { type TableType } from '../types';
import { createStarterTable as addStarterSchema, addStarterView } from '../util';

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

  const _handleNewRow = useCallback(() => {
    if (!table.schema || !space) {
      return;
    }
    space.db.add(create(table.schema, {}));
  }, [table.schema, space]);

  useEffect(() => {
    if (space && !table.schema && !table.view) {
      addStarterSchema(space, table);
      addStarterView(table);
    }
  }, [space, table.schema]);

  // TODO(Zan): Do we need this?
  if (!table.schema) {
    return <p>No schema</p>;
  }

  return <Table table={table} data={filteredObjects} />;
};
