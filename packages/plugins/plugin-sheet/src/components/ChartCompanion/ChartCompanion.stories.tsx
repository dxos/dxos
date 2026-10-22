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
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import {
  SheetCompanionFrame,
  type SheetCompanionFrameMode,
  createChartTestCells,
  createChartTestRanges,
  withComputeGraphDecorator,
} from '#testing';
import { translations } from '#translations';
import { Sheet } from '#types';

import { useSheetContext } from '../SheetRoot/index.ts';
import { ChartCompanion } from './ChartCompanion.tsx';
import { useRangeValues } from './useRangeValues.ts';

const initialCharts: Sheet.Chart[] = [
  { id: 'sales', name: 'Sales by region', range: 'A1:C7', type: 'bar', header: true, grid: true },
  { id: 'share', name: 'Market share', range: 'E1:F5', type: 'pie', header: true },
  { id: 'curve', name: 'Curve', range: 'H1:I11', type: 'xy', header: true, grid: true },
];

/** The companion shares the sheet's selection through the `Selection` view state, as an app container would. */
const Companion = () => {
  const { model } = useSheetContext();
  const getValues = useRangeValues(model);
  const [charts, setCharts] = useState<Sheet.Chart[]>(initialCharts);
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

type StoryArgs = { mode?: SheetCompanionFrameMode };

const DefaultStory = ({ mode }: StoryArgs) => (
  <SheetCompanionFrame
    sheet={{ cells: createChartTestCells(), ranges: createChartTestRanges() }}
    companion={<Companion />}
    label='Charts'
    icon='ph--chart-bar--regular'
    mode={mode}
  />
);

const meta = {
  title: 'plugins/plugin-sheet/components/ChartCompanion',
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
