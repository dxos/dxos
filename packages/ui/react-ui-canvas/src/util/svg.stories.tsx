//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta } from '@storybook/react';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Arrow, createPath } from './svg';
import { testId } from './util';

const Render = () => (
  <svg className='border border-neutral-500 w-[400px] h-[400px]'>
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

const meta: Meta = {
  title: 'ui/react-ui-canvas/svg',
  render: Render,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Default = {};
