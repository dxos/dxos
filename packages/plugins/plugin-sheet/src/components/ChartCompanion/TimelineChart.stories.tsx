//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { testFunctionPlugins } from '@dxos/compute-hyperformula/testing';
import { withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import {
  SheetCompanionFrame,
  type SheetCompanionFrameMode,
  createTimelineTestCells,
  createTimelineTestRanges,
  technologyTimelineColors,
  technologyTimelineOrder,
  timelineTestColumnSizes,
  timelineTestRange,
  timelineTestRows,
  withComputeGraphDecorator,
} from '#testing';
import { translations } from '#translations';
import { Sheet } from '#types';

import { useSheetContext } from '../SheetRoot/index.ts';
import { SheetCharts } from './SheetCharts.tsx';

const timelineChart = (hidden?: string[]): Sheet.ChartProperties => ({
  name: 'Technology and macro',
  range: timelineTestRange,
  type: 'timeline',
  header: true,
  timeline: { start: '1940', end: '2030', order: technologyTimelineOrder, colors: technologyTimelineColors, hidden },
});

/** The sheet's charts, as the app's charts companion shows them. */
const Companion = () => {
  const { model } = useSheetContext();
  return <SheetCharts sheet={model.sheet} model={model} />;
};

type StoryArgs = { mode?: SheetCompanionFrameMode; hidden?: string[] };

const DefaultStory = ({ mode, hidden }: StoryArgs) => (
  <SheetCompanionFrame
    sheet={{
      cells: createTimelineTestCells(),
      ranges: createTimelineTestRanges(),
      rows: timelineTestRows,
      columnSizes: timelineTestColumnSizes,
      charts: [timelineChart(hidden)],
    }}
    companion={<Companion />}
    label='Charts'
    icon='ph--chart-bar--regular'
    mode={mode}
  />
);

const meta = {
  title: 'plugins/plugin-sheet/components/TimelineChart',
  render: (args) => <DefaultStory {...args} />,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ types: [Sheet.Sheet, Sheet.Chart], createSpace: true }),
    withComputeGraphDecorator({ plugins: testFunctionPlugins }),
    withPluginManager({ plugins: [ProcessManagerPlugin.make()] }),
    // Outermost, so the plugin manager's atom registry is not replaced by the decorator's own.
    withAttention(),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...formTranslations, ...uiTranslations],
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Timeline: Story = {
  args: {
    mode: 'end',
  },
};

export const Macro: Story = {
  args: {
    mode: 'end',
    hidden: ['Tech/Hardware', 'Tech/Software', 'Tech/AI'],
  },
};

export const Tech: Story = {
  args: {
    mode: 'end',
    hidden: ['Macro', 'Macro/FIC', 'Macro/TIC', 'Macro/MIC'],
  },
};
