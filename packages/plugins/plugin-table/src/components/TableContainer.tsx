//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type LayoutContainerProps } from '@dxos/app-framework';
import { Table } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableContainer = ({ role, table }: LayoutContainerProps<Omit<ObjectTableProps, 'role' | 'getScrollElement'>>) => {
  return (
    <Table.Root>
      <Table.Viewport
        classNames={mx(
          role === 'article' && 'block-start-[--topbar-size] max-bs-full row-span-2 is-full sticky-top-0 -mbs-px',
          role === 'section' && 'max-bs-96 is-full sticky-top-0 !bg-[--surface-bg] -mis-px -mbs-px',
          role === 'slide' && 'bs-full overflow-auto grid place-items-center',
        )}
      >
        <ObjectTable
          key={table.id} // New component instance per table.
          table={table}
          role='grid'
          stickyHeader
        />
      </Table.Viewport>
    </Table.Root>
  );
};

export default TableContainer;
