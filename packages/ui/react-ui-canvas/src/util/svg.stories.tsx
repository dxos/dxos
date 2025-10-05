//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';


import { Arrow, createPath } from './svg';
import { testId } from './util';

const DefaultStory = () => (
  <svg className='border border-neutral-500 w-[30rem] h-[400px]'>
    <defs>
      <Arrow id='arrow-start' classNames='fill-none stroke-red-500' dir='start' />
      <Arrow id='arrow-end' classNames='fill-none stroke-red-500' dir='end' />
    </defs>
    <path
      {...testId('dx-storybook', true)}
      className={'stroke-red-500'}
      d={createPath([
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ])}
      markerStart={'url(#arrow-start)'}
      markerEnd={'url(#arrow-end)'}
    />
  </svg>
);

const meta = {
  title: 'ui/react-ui-canvas/svg',
  render: DefaultStory,
    parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
