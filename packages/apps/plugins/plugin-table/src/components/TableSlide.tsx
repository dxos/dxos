//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Table } from '@dxos/react-ui-table';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableSlide: FC<Omit<ObjectTableProps, 'getScrollElement'>> = ({ table }) => {
  return (
    <div role='none' className='flex-1 min-bs-0 pli-16 plb-24'>
      <Table.Root>
        <Table.Viewport classNames='bs-full overflow-auto grid place-items-center'>
          <ObjectTable
            key={table.id} // New component instance per table.
            table={table}
            stickyHeader
            role='table'
          />
        </Table.Viewport>
      </Table.Root>
    </div>
  );
};

export default TableSlide;
