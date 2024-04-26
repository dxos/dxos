//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Main } from '@dxos/react-ui';
import { Table } from '@dxos/react-ui-table';
import { baseSurface } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableMain: FC<Omit<ObjectTableProps, 'getScrollElement'>> = ({ table }) => (
  <Table.Root>
    <Table.Viewport asChild>
      <Main.Content
        classNames={[baseSurface, 'fixed inset-inline-0 block-start-[--topbar-size] block-end-0 overflow-auto']}
      >
        <ObjectTable
          table={table}
          key={table.id} // New component instance per table.
          stickyHeader
          role='grid'
        />
      </Main.Content>
    </Table.Viewport>
  </Table.Root>
);

export default TableMain;
