//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { universeTimeline, universeTimelineColors, universeTimelineOrder } from '../../testing/index.ts';
import { type PlotData, TIMELINE_SCALES, TIMELINE_SPINES, type TimelineOptions } from '../../types.ts';
import { toPlotData, toTimelineEvents } from '../../util/index.ts';
import { Timeline } from './Timeline.tsx';

const data = toPlotData(universeTimeline, { header: true });
const categories = toTimelineEvents(data).columns;

type StoryArgs = Pick<TimelineOptions, 'spine' | 'scale' | 'start' | 'end' | 'today' | 'hidden'> & {
  data?: PlotData;
  zoom?: number;
};

const DefaultStory = ({ data: storyData = data, zoom, ...options }: StoryArgs) => (
  <Timeline
    classNames='h-[48rem]'
    data={storyData}
    zoom={zoom}
    options={{ order: universeTimelineOrder, colors: universeTimelineColors, ...options }}
  />
);

const meta = {
  title: 'ui/react-ui-plot/Timeline',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ classNames: 'w-[60rem]' })],
  // Compact, since on a linear or log scale all of human history sits in the last pixel of 13.8 billion years.
  args: { spine: 'center', scale: 'compact', today: true, zoom: 1 },
  argTypes: {
    spine: { control: 'inline-radio', options: TIMELINE_SPINES },
    scale: { control: 'inline-radio', options: TIMELINE_SCALES },
    zoom: { control: { type: 'range', min: 1, max: 10, step: 0.5 } },
    hidden: { control: 'check', options: categories },
    data: { control: false },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Linear: Story = {
  args: {
    scale: 'linear',
  },
};

export const Log: Story = {
  args: {
    scale: 'log',
  },
};

export const Humans: Story = {
  args: {
    hidden: ['Physics', 'Biology'],
  },
};

export const Recorded: Story = {
  args: {
    scale: 'linear',
    start: '-3500',
  },
};

export const Left: Story = {
  args: {
    spine: 'left',
  },
};

export const Right: Story = {
  args: {
    spine: 'right',
  },
};

export const Zoomed: Story = {
  args: {
    zoom: 3,
  },
};

export const Dates: Story = {
  args: {
    scale: 'linear',
    data: toPlotData(
      [
        ['Date', 'Category', 'Event', 'Description'],
        ['2026-01-12', 'Release', 'v1.0', 'First public release.'],
        ['2026-02-03', 'Release', 'v1.1', 'Sync fixes.'],
        ['2026-02-03', 'Incident', 'Outage (EU)', 'Two hours of degraded service in eu-west.'],
        ['2026-03-20', 'Release', 'v1.2', null],
        ['2026-04-01', 'Incident', 'Data migration', 'Planned downtime for a schema migration.'],
        ['2026-06-15', 'Release', 'v2.0', 'New timeline view.'],
      ],
      { header: true },
    ),
  },
};
