//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { Table } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableArticle: FC<Omit<ObjectTableProps, 'getScrollElement'>> = ({ table }) => (
  <Table.Root>
    <Table.Viewport
      classNames={mx(
        'block-start-[--topbar-size] max-bs-full row-span-2 is-full sticky-top-0',
        // TODO(burdon): Remove hack to align borders with frame.
        '-ml-[1px] -mt-[1px]',
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

export default TableArticle;
