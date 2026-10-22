//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { testFunctionPlugins } from '@dxos/compute-hyperformula/testing';
import { Obj } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useSelection } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
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

import { useRangeValues } from '../ChartCompanion/index.ts';
import { useSheetContext } from '../SheetRoot/index.ts';
import { TimelineCompanion } from './TimelineCompanion.tsx';

const initialTimeline: Sheet.Timeline = { range: timelineTestRange, header: true, start: '1980', end: '2030' };

/** The companion reads the sheet's selection through the `Selection` view state, as an app container would. */
const Companion = ({ hidden }: Pick<Sheet.Timeline, 'hidden'>) => {
  const { model } = useSheetContext();
  const getValues = useRangeValues(model);
  const [timeline, setTimeline] = useState<Sheet.Timeline | undefined>({ ...initialTimeline, hidden });
  const selection = useSelection(Obj.getURI(model.sheet), 'range');

  return (
    <TimelineCompanion
      timeline={timeline}
      onChange={setTimeline}
      getValues={getValues}
      selection={selection && (selection.from === selection.to ? selection.from : `${selection.from}:${selection.to}`)}
    />
  );
};

type StoryArgs = { mode?: SheetCompanionFrameMode } & Pick<Sheet.Timeline, 'hidden'>;

const DefaultStory = ({ mode, hidden }: StoryArgs) => (
  <SheetCompanionFrame
    sheet={{
      cells: createTimelineTestCells(),
      ranges: createTimelineTestRanges(),
      rows: timelineTestRows,
      columnSizes: timelineTestColumnSizes,
    }}
    companion={<Companion hidden={hidden} />}
    label='Timeline'
    icon='ph--line-segments--regular'
    mode={mode}
  />
);

const meta = {
  title: 'plugins/plugin-sheet/components/TimelineCompanion',
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

export const TechAndResume: Story = {
  args: {
    hidden: ['Macro', 'Robotics', 'MIC', 'FIC', 'TIC'],
  },
};
