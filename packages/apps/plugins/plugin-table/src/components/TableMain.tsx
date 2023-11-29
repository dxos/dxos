//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

export const TableSection: FC<ObjectTableProps> = ({ table }) => {
  return (
    <div className='bs-96 mlb-2 overflow-auto'>
      <ObjectTable table={table} role='table' />
    </div>
  );
};

export const TableSlide: FC<ObjectTableProps> = ({ table }) => {
  return (
    <div role='none' className='flex-1 min-bs-0 pli-16 plb-24'>
      <div role='none' className='bs-full overflow-auto grid place-items-center'>
        <ObjectTable table={table} stickyHeader role='table' />
      </div>
    </div>
  );
};

export const TableMain: FC<ObjectTableProps> = ({ table }) => {
  return (
    <Main.Content
      classNames={[baseSurface, 'fixed inset-inline-0 block-start-[--topbar-size] block-end-0 overflow-auto']}
    >
      <ObjectTable table={table} stickyHeader role='grid' />
    </Main.Content>
  );
};
