//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { DensityProvider, Main } from '@dxos/react-ui';
import { Table } from '@dxos/react-ui-table';
import { baseSurface, bottombarBlockPaddingEnd } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableMain: FC<Omit<ObjectTableProps, 'getScrollElement'>> = ({ table }) => (
  <Main.Content
    classNames={[
      baseSurface,
      'fixed inset-inline-0 block-start-[--topbar-size] block-end-0 overflow-hidden',
      bottombarBlockPaddingEnd,
    ]}
  >
    <DensityProvider density='fine'>
      <Table.Root>
        <Table.Viewport classNames='flex flex-col h-full overflow-auto'>
          <ObjectTable
            key={table.id} // New component instance per table.
            table={table}
            stickyHeader
            role='grid'
          />
        </Table.Viewport>
      </Table.Root>
    </DensityProvider>
  </Main.Content>
);

export default TableMain;
