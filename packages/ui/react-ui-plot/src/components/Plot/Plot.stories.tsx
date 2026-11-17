//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { PLOT_TYPES, type PlotData, type PlotOptions, type PlotType } from '../../types.ts';
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

//
// Docs
//

const SALES = toPlotData(
  [
    ['Month', 'Sales'],
    ['Jan', 12],
    ['Feb', 18],
    ['Mar', 15],
    ['Apr', 22],
    ['May', 26],
    ['Jun', 24],
  ],
  { header: true },
);

const SALES_TYPES: Record<string, PlotType> = { Bar: 'bar', Radar: 'radar', Pie: 'pie' };

const SalesStory = () => {
  const [type, setType] = useState<PlotType>('bar');
  return (
    <div className='fixed inset-0 grid grid-rows-[min-content_1fr] dx-base-surface'>
      <Toolbar.Root>
        {Object.entries(SALES_TYPES).map(([label, value]) => (
          <Button.Root key={value} variant={value === type ? 'primary' : 'ghost'} onClick={() => setType(value)}>
            {label}
          </Button.Root>
        ))}
      </Toolbar.Root>
      <Plot data={SALES} options={{ type, grid: true }} />
    </div>
  );
};

/** The docs' chart: one series, so no legend, as a bar, radar or pie chart. */
export const Docs: Story = {
  render: () => <SalesStory />,
};
