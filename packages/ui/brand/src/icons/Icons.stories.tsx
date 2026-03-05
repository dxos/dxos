//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { Composer } from './Composer';
import { DXNS } from './DXNS';
import { DXOS } from './DXOS';
import { ECHO } from './ECHO';
import { HALO } from './HALO';
import { KUBE } from './KUBE';
import { MESH } from './MESH';

const Icon = () => null;

const meta = {
  title: 'ui/brand/components/Icons',
  component: Icon,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const size = 'w-[192px] h-[192px]';
    return (
      <div className='grid grid-cols-3 gap-16'>
        <>
          <div className='col-span-full flex justify-center'>
            <Composer className={mx(size)} />
          </div>
        </>
        <>
          <ECHO className={mx(size, 'fill-sky-700')} />
          <HALO className={mx(size, 'fill-violet-700')} />
          <MESH className={mx(size, 'fill-green-700')} />
        </>
        <>
          <DXNS className={mx(size, 'fill-neutral-700')} />
          <DXOS className={mx(size, 'fill-neutral-700')} />
          <KUBE className={mx(size, 'fill-neutral-700')} />
        </>
      </div>
    );
  },
};
