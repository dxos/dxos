//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { Table } from '@dxos/react-ui-table';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableArticle: FC<Omit<ObjectTableProps, 'getScrollElement'>> = ({ table }) => (
  <Table.Root>
    <Table.Viewport classNames='block-start-[--topbar-size] max-bs-full row-span-2 is-full overflow-auto sticky-top-0'>
      <ObjectTable
        key={table.id} // New component instance per table.
        table={table}
        role='grid'
        stickyHeader
      />
    </Table.Viewport>
  </Table.Root>
);

export default TableArticle;
