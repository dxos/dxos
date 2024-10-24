//
// Copyright 2024 DXOS.org
//

import React, { useEffect } from 'react';

import { create } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { type EchoReactiveObject, Filter, getSpace, useQuery } from '@dxos/react-client/echo';

import { type TableType, createStarterView, createStarterSchema } from '../../types';
import { Table } from '../Table';

export type ObjectTableProps = {
  table: TableType;
};

// TODO(burdon): Why is this required in addition to Table?
export const ObjectTable = ({ table }: ObjectTableProps) => {
  const space = getSpace(table);

  // TODO(burdon): Move into model.
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
      table.schema = space.db.schema.addSchema(createStarterSchema());
      table.view = createStarterView();
      space.db.add(create(table.schema));
    }
  }, [space, table.schema]);

  if (!table.schema || !table.view) {
    return null;
  }

  return <Table table={table} data={filteredObjects} />;
};
