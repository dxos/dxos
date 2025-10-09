//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/react-ui-theme';

import { Composer, DXNS, DXOS, ECHO, HALO, KUBE, MESH } from './icons';

const Icon = () => null;

const meta = {
  title: 'ui/brand/Icons',
  component: Icon,
  decorators: [withTheme],
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const size = 'w-[128px] h-[128px]';
    return (
      <div className='absolute flex w-full h-full items-center justify-center'>
        <div className='grid grid-cols-3 gap-16'>
          <>
            <div />
            <Composer className={mx(size)} />
            <div />
          </>
          <>
            <DXNS className={mx(size, 'fill-orange-700')} />
            <DXOS className={mx(size, 'fill-teal-700')} />
            <ECHO className={mx(size, 'fill-violet-700')} />
          </>
          <>
            <HALO className={mx(size, 'fill-purple-700')} />
            <KUBE className={mx(size, 'fill-sky-700')} />
            <MESH className={mx(size, 'fill-green-700')} />
          </>
        </div>
      </div>
    );
  },
};
