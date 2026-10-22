//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { testFunctionPlugins } from '@dxos/compute-hyperformula/testing';
import { Obj } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { technologyTimelineColors, technologyTimelineOrder } from '@dxos/react-ui-plot/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import {
  SheetCompanionFrame,
  type SheetCompanionFrameMode,
  createTimelineTestCells,
  createTimelineTestRanges,
  timelineTestColumnSizes,
  timelineTestRange,
  timelineTestRows,
  withComputeGraphDecorator,
} from '#testing';
import { translations } from '#translations';
import { Sheet } from '#types';

import { useSheetContext } from '../SheetRoot/index.ts';
import { ChartCompanion } from './ChartCompanion.tsx';
import { useRangeValues } from './useRangeValues.ts';

const timelineChart = (hidden?: string[]): Sheet.Chart => ({
  id: 'technology',
  name: 'Technology and macro',
  range: timelineTestRange,
  type: 'timeline',
  header: true,
  timeline: { start: '1920', end: '2030', order: technologyTimelineOrder, colors: technologyTimelineColors, hidden },
});

/** The charts companion over the timeline test data, sharing the sheet's selection as an app container would. */
const Companion = ({ hidden }: { hidden?: string[] }) => {
  const { model } = useSheetContext();
  const getValues = useRangeValues(model);
  const [charts, setCharts] = useState<Sheet.Chart[]>(() => [timelineChart(hidden)]);
  const contextId = Obj.getURI(model.sheet);
  const selection = useSelection(contextId, 'range');
  const { range: setSelection } = useSelectionActions(contextId);
  const handleSelectRange = useCallback(
    (range: string) => {
      const [from, to = from] = range.toUpperCase().split(':');
      setSelection(from, to);
    },
    [setSelection],
  );

  return (
    <ChartCompanion
      charts={charts}
      onChange={setCharts}
      getValues={getValues}
      selection={selection && (selection.from === selection.to ? selection.from : `${selection.from}:${selection.to}`)}
      onSelectRange={handleSelectRange}
    />
  );
};

type StoryArgs = { mode?: SheetCompanionFrameMode; hidden?: string[] };

const DefaultStory = ({ mode, hidden }: StoryArgs) => (
  <SheetCompanionFrame
    sheet={{
      cells: createTimelineTestCells(),
      ranges: createTimelineTestRanges(),
      rows: timelineTestRows,
      columnSizes: timelineTestColumnSizes,
    }}
    companion={<Companion hidden={hidden} />}
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
    withClientProvider({ types: [Sheet.Sheet], createSpace: true }),
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

export const Resume: Story = {
  args: {
    mode: 'end',
    hidden: ['Macro', 'Macro/MIC', 'Macro/FIC', 'Macro/TIC'],
  },
};

export const Macro: Story = {
  args: {
    mode: 'end',
    hidden: ['Tech/Hardware', 'Tech/Software', 'Tech/AI', 'Personal'],
  },
};

export const Tech: Story = {
  args: {
    mode: 'end',
    hidden: ['Macro', 'Macro/FIC', 'Macro/TIC', 'Macro/MIC', 'Personal'],
  },
};
