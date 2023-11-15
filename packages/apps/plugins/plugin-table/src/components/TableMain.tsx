//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

export const TableSection: FC<ObjectTableProps> = ({ table }) => {
  return (
    <div className={'flex h-[386px] my-2 overflow-hidden'}>
      <ObjectTable table={table} />
    </div>
  );
};

export const TableSlide: FC<ObjectTableProps> = ({ table }) => {
  return (
    <div className={'flex p-24 overflow-hidden'}>
      <ObjectTable table={table} />
    </div>
  );
};

export const TableMain: FC<ObjectTableProps> = ({ table }) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <div className={'flex grow m-4 overflow-hidden'}>
        <ObjectTable table={table} />
      </div>
    </Main.Content>
  );
};
