//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, type ReactNode } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

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
      <div className='absolute flex is-full bs-full items-center justify-center'>
        <div className='flex grid grid-cols-2 gap-16'>
          <Cell>
            <DXOSType className='is-[256px]' />
          </Cell>
          <Cell dark>
            <DXOSType className='is-[128px]' />
          </Cell>

          <Cell>
            <DXOSHorizontalType className='is-[256px]' />
          </Cell>
          <Cell dark>
            <DXOSHorizontalType className='is-[128px]' />
          </Cell>

          <Cell>
            <DXOSVerticalType className='is-[256px]' />
          </Cell>
          <Cell dark>
            <DXOSVerticalType className='is-[128px]' />
          </Cell>
        </div>
      </div>
    );
  },
};
