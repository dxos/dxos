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
      <div className='flex w-fit items-center gap-4'>
        <Skeleton classNames='size-10 shrink-0 rounded-full' />
        <div className='grid gap-2'>
          <Skeleton classNames='h-4 w-[150px]' />
          <Skeleton classNames='h-4 w-[100px]' />
        </div>
      </div>
    </div>
  ),
};

export const Card = {
  render: () => (
    <div className='flex flex-col gap-3 w-96 p-4 border border-separator rounded-xs'>
      <div className='flex items-center gap-3'>
        <Skeleton variant='circle' classNames='h-12 w-12 rounded-full' />
        <div className='flex flex-col gap-2 flex-1'>
          <Skeleton classNames='h-4 w-24' />
          <Skeleton classNames='h-3 w-32' />
        </div>
      </div>
      <Skeleton classNames='h-32 w-full rounded-sm' />
      <div className='flex flex-col gap-2'>
        <Skeleton classNames='h-3 w-full' />
        <Skeleton classNames='h-3 w-5/6' />
        <Skeleton classNames='h-3 w-4/6' />
      </div>
    </div>
  ),
};
