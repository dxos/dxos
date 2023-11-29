//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

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
    <div role='none' className='min-bs-0 flex-1 p-24'>
      <div role='none' className='bs-full overflow-auto grid place-items-center'>
        <ObjectTable table={table} stickyHeader role='table' />
      </div>
    </div>
  );
};

export const TableMain: FC<ObjectTableProps> = ({ table }) => {
  return (
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
      <ObjectTable table={table} stickyHeader role='grid' />
    </Main.Content>
  );
};
