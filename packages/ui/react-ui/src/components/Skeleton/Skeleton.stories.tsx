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
    <div className='flex flex-col gap-4 p-4 border border-separator rounded-sm'>
      <div className='flex is-fit items-center gap-4'>
        <Skeleton classNames='size-10 shrink-0 rounded-full' />
        <div className='grid gap-2'>
          <Skeleton classNames='bs-4 is-[150px]' />
          <Skeleton classNames='bs-4 is-[100px]' />
        </div>
      </div>
    </div>
  ),
};

export const Card = {
  render: () => (
    <div className='flex flex-col gap-3 is-96 p-4 border border-separator rounded-sm'>
      <div className='flex items-center gap-3'>
        <Skeleton variant='circle' classNames='bs-12 is-12 rounded-full' />
        <div className='flex flex-col gap-2 flex-1'>
          <Skeleton classNames='bs-4 is-24' />
          <Skeleton classNames='bs-3 is-32' />
        </div>
      </div>
      <Skeleton classNames='bs-32 is-full rounded' />
      <div className='flex flex-col gap-2'>
        <Skeleton classNames='bs-3 is-full' />
        <Skeleton classNames='bs-3 is-5/6' />
        <Skeleton classNames='bs-3 is-4/6' />
      </div>
    </div>
  ),
};
