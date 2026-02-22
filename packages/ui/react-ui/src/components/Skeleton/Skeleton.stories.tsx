//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { withTheme } from '../../testing';

import { Skeleton } from './Skeleton';

export default {
  title: 'ui/react-ui-core/components/Skeleton',
  component: Skeleton,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  render: () => (
    <div className='flex flex-col gap-4 p-4 border border-separator rounded-xs'>
      <div className='flex inline-fit items-center gap-4'>
        <Skeleton classNames='size-10 shrink-0 rounded-full' />
        <div className='grid gap-2'>
          <Skeleton classNames='block-4 inline-[150px]' />
          <Skeleton classNames='block-4 inline-[100px]' />
        </div>
      </div>
    </div>
  ),
};

export const Card = {
  render: () => (
    <div className='flex flex-col gap-3 inline-96 p-4 border border-separator rounded-xs'>
      <div className='flex items-center gap-3'>
        <Skeleton variant='circle' classNames='block-12 inline-12 rounded-full' />
        <div className='flex flex-col gap-2 flex-1'>
          <Skeleton classNames='block-4 inline-24' />
          <Skeleton classNames='block-3 inline-32' />
        </div>
      </div>
      <Skeleton classNames='block-32 inline-full rounded-sm' />
      <div className='flex flex-col gap-2'>
        <Skeleton classNames='block-3 inline-full' />
        <Skeleton classNames='block-3 inline-5/6' />
        <Skeleton classNames='block-3 inline-4/6' />
      </div>
    </div>
  ),
};
