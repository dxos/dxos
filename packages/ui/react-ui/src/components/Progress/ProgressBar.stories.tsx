//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';
import { Progress } from './Progress';

const meta = {
  title: 'ui/react-ui-core/components/Progress/Bar',
  component: Progress.Bar,
  decorators: [withTheme()],
} satisfies Meta<typeof Progress.Bar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The bare bar at a known fraction, for a host that supplies its own chrome. */
export const Determinate: Story = {
  render: (props) => (
    <div className='m-5 flex flex-col gap-5'>
      <Progress.Bar {...props} progress={0} />
      <Progress.Bar {...props} progress={0.3} />
      <Progress.Bar {...props} progress={0.7} />
      <Progress.Bar {...props} progress={1} />
    </div>
  ),
};

/** No fraction to draw: the fill sweeps instead of resting somewhere misleading. */
export const Indeterminate: Story = {
  args: {
    indeterminate: true,
  },
  render: (props) => (
    <div className='m-5'>
      <Progress.Bar {...props} />
    </div>
  ),
};

/** A run that stopped where it got to, drawn in the error colour rather than cleared. */
export const Error: Story = {
  args: {
    progress: 0.4,
    error: true,
  },
  render: (props) => (
    <div className='m-5'>
      <Progress.Bar {...props} />
    </div>
  ),
};
