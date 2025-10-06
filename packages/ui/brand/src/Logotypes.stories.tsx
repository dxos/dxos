//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, type ReactNode } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/react-ui-theme';

import { DXOSHorizontalType, DXOSType, DXOSVerticalType } from './logotypes';

const Icon = () => null;

const meta = {
  title: 'ui/brand/LogoTypes',
  component: Icon,
  decorators: [withTheme],
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

const Cell: FC<{ children: ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div className={mx('flex p-4 justify-center rounded-md', dark ? 'bg-zinc-800 fill-zinc-50' : 'bg-white')}>
    {children}
  </div>
);

export const Default: Story = {
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
