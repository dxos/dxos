//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PLOT_TYPES, type PlotData, type PlotOptions } from '../../types.ts';
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

const simpsonsParadox = toPlotData(
  [
    ['Hit rate', 'Small', 'Medium', 'Large'],
    ...[
      [20, 8],
      [30, 6],
      [40, 4],
    ].map(([x, y]) => [x, y, null, null]),
    ...[
      [50, 18],
      [60, 15],
      [70, 12],
    ].map(([x, y]) => [x, null, y, null]),
    ...[
      [80, 40],
      [88, 36],
      [95, 31],
    ].map(([x, y]) => [x, null, null, y]),
  ],
  { header: true },
);

const heatmap = toPlotData(
  [
    ['Day', '00', '06', '12', '18'],
    ['Mon', 2, 9, 14, 11],
    ['Tue', 3, 10, 15, 12],
    ['Sat', 1, 2, 4, 3],
  ],
  { header: true },
);

const radar = toPlotData(
  [
    ['Measure', 'North', 'South'],
    ['Speed', 8, 5],
    ['Cost', 4, 7],
    ['Reach', 6, 9],
    ['Support', 9, 6],
    ['Uptime', 7, 8],
  ],
  { header: true },
);

const countries = toPlotData(
  [
    ['Country', 'Requests'],
    ['United States of America', 120],
    ['Germany', 60],
    ['Brazil', 25],
    ['Japan', 40],
    ['Australia', 15],
  ],
  { header: true },
);

type StoryArgs = Pick<PlotOptions, 'type' | 'grid' | 'horizontal' | 'stacked' | 'regression'> & { data?: PlotData };

const DefaultStory = ({ data: storyData = data, ...options }: StoryArgs) => (
  <Plot classNames='h-[24rem]' data={storyData} options={options} />
);

const meta = {
  title: 'ui/react-ui-plot/Plot',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ classNames: 'w-[40rem]' })],
  args: { type: 'bar', grid: true },
  argTypes: { type: { control: 'inline-radio', options: PLOT_TYPES }, data: { control: false } },
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

export const Scatter: Story = {
  args: {
    type: 'scatter',
    data: simpsonsParadox,
  },
};

export const Regression: Story = {
  args: {
    type: 'scatter',
    regression: true,
    data: simpsonsParadox,
  },
};

export const Heatmap: Story = {
  args: {
    type: 'heatmap',
    data: heatmap,
  },
};

export const Radar: Story = {
  args: {
    type: 'radar',
    data: radar,
  },
};

export const Choropleth: Story = {
  args: {
    type: 'map',
    data: countries,
  },
};
