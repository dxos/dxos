//
// Copyright 2023 DXOS.org
//

import React, { type FC, useRef } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

export const TableSection: FC<ObjectTableProps> = ({ table }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  return (
    <div className='bs-96 mlb-2 overflow-auto' ref={containerRef}>
      <ObjectTable table={table} role='table' getScrollElement={() => containerRef.current} />
    </div>
  );
};

export const TableSlide: FC<ObjectTableProps> = ({ table }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  return (
    <div role='none' className='flex-1 min-bs-0 pli-16 plb-24'>
      <div role='none' className='bs-full overflow-auto grid place-items-center' ref={containerRef}>
        <ObjectTable table={table} stickyHeader role='table' getScrollElement={() => containerRef.current} />
      </div>
    </div>
  );
};

export const TableMain: FC<ObjectTableProps> = ({ table }) => {
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
