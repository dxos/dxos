//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PLOT_TYPES, type PlotOptions } from '../../types.ts';
import { toPlotData } from '../../util/index.ts';
import { Plot } from './Plot.tsx';

const data = toPlotData(
  [
    ['Month', 'North', 'South'],
    ['Jan', 12, 8],
    ['Feb', 18, 11],
    ['Mar', 15, 16],
    ['Apr', 22, 14],
  ],
  { header: true },
);

type StoryArgs = Pick<PlotOptions, 'type' | 'grid' | 'horizontal' | 'stacked'>;

const DefaultStory = (options: StoryArgs) => <Plot classNames='h-[24rem]' data={data} options={options} />;

const meta = {
  title: 'ui/react-ui-plot/Plot',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ classNames: 'w-[40rem]' })],
  args: { type: 'bar', grid: true },
  argTypes: { type: { control: 'inline-radio', options: PLOT_TYPES } },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = {
  args: {
    horizontal: true,
  },
};

export const Stacked: Story = {
  args: {
    horizontal: true,
    stacked: true,
  },
};

export const Pie: Story = {
  args: {
    type: 'pie',
  },
};

export const XY: Story = {
  args: {
    type: 'xy',
  },
};
