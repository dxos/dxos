//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React, { FC, ReactNode } from 'react';

import { mx } from '@dxos/aurora-theme';

import { DXOSType, DXOSHorizontalType, DXOSVerticalType } from './logotypes';

const Icon = () => null;

export default {
  component: Icon,
};

const Cell: FC<{ children: ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div className={mx('flex p-4 justify-center rounded-lg', dark ? 'bg-zinc-800 fill-zinc-50' : 'bg-white')}>
    {children}
  </div>
);

export const Default = {
  render: () => {
    return (
      <div className='absolute flex w-full h-full items-center justify-center'>
        <div className='flex grid grid-cols-2 gap-16'>
          <Cell>
            <DXOSType className='w-[256px]' />
          </Cell>
          <Cell dark>
            <DXOSType className='w-[128px]' />
          </Cell>

          <Cell>
            <DXOSHorizontalType className='w-[256px]' />
          </Cell>
          <Cell dark>
            <DXOSHorizontalType className='w-[128px]' />
          </Cell>

          <Cell>
            <DXOSVerticalType className='w-[256px]' />
          </Cell>
          <Cell dark>
            <DXOSVerticalType className='w-[128px]' />
          </Cell>
        </div>
      </div>
    );
  },
};
