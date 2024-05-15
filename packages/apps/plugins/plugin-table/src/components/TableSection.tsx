//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Table } from '@dxos/react-ui-table';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableSection: FC<Omit<ObjectTableProps, 'getScrollElement'>> = ({ table }) => (
  <Table.Root>
    <Table.Viewport classNames='max-bs-96 w-full mlb-2 overflow-auto sticky-top-0'>
      <ObjectTable
        key={table.id} // New component instance per table.
        table={table}
        role='grid'
        stickyHeader
      />
    </Table.Viewport>
  </Table.Root>
);

export default TableSection;
