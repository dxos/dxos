//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

export const TableSection: FC<ObjectTableProps> = ({ table }) => {
  return (
    <div className={'flex h-[400px] my-2 overflow-hidden'}>
      <ObjectTable table={table} />
    </div>
  );
};

export const TableSlide: FC<ObjectTableProps> = ({ table }) => {
  return (
    <div className='flex-1 min-bs-0 px-16 py-24'>
      <div className='bs-full overflow-auto'>
        <ObjectTable table={table} />
      </div>
    </div>
  );
};

export const TableMain: FC<ObjectTableProps> = ({ table }) => {
  return (
    <Main.Content
      classNames={[baseSurface, 'fixed inset-inline-0 block-start-[--topbar-size] block-end-0 overflow-auto']}
    >
      <ObjectTable table={table} />
    </Main.Content>
  );
};
