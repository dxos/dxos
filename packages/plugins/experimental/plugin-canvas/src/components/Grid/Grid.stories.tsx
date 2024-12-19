//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Grid, type GridProps } from './Grid';

const Render = (props: GridProps) => {
  return (
    <div className='flex w-[200px] p-2 rounded border border-primary-500'>
      <Grid {...props} />
    </div>
  );
};

const meta: Meta<GridProps> = {
  title: 'plugins/plugin-canvas/Grid',
  component: Grid,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {
  args: {},
};
