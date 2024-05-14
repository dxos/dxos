//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { DensityProvider, Main } from '@dxos/react-ui';
import { Table } from '@dxos/react-ui-table';
import { baseSurface } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableMain: FC<Omit<ObjectTableProps, 'getScrollElement'>> = ({ table }) => (
  <Main.Content
    classNames={[baseSurface, 'fixed inset-inline-0 block-start-[--topbar-size] block-end-0 overflow-hidden']}
  >
    <DensityProvider density='fine'>
      <Table.Root>
        <Table.Viewport asChild>
          {/* TODO(burdon): Move into ObjectTable. */}
          {/* TODO(burdon): Floating "add row" jumps by 1 pixel on scroll. */}
          {/* TODO(burdon): Blue focus highlight is clipped by 1px on the left. */}
          {/* TODO(burdon): Focused row and focus ring passes over the sticky header. */}
          <div className='flex flex-col h-full overflow-auto'>
            <ObjectTable
              key={table.id} // New component instance per table.
              table={table}
              stickyHeader
              role='grid'
            />
          </div>
        </Table.Viewport>
      </Table.Root>
    </DensityProvider>
  </Main.Content>
);

export default TableMain;
