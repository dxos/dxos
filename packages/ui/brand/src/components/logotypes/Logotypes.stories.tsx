//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { DXOSHorizontalType } from './DXOSHorizontalType';
import { DXOSType } from './DXOSType';
import { DXOSVerticalType } from './DXOSVerticalType';

const Icon = () => null;

const meta = {
  title: 'ui/brand/components/LogoTypes',
  component: Icon,
  decorators: [withTheme()],
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

const Cell = ({ children, dark }: PropsWithChildren<{ dark?: boolean }>) => (
  <div className={mx('flex p-4 justify-center rounded-md', dark ? 'bg-zinc-800 fill-zinc-50' : 'bg-zinc-100')}>
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
