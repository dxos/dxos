//
// Copyright 2023 DXOS.org
//

import React, { type FC, useRef } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableMain: FC<ObjectTableProps> = ({ table }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  return (
    <Main.Content
      classNames={[baseSurface, 'fixed inset-inline-0 block-start-[--topbar-size] block-end-0 overflow-auto']}
      ref={containerRef}
    >
      <ObjectTable table={table} stickyHeader role='grid' getScrollElement={() => containerRef.current} />
    </Main.Content>
  );
};

export default TableMain;
