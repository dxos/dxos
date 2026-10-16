//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { testFunctionPlugins } from '@dxos/compute-hyperformula/testing';
import { Obj } from '@dxos/echo';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createChartTestCells, createChartTestRanges, useTestSheet, withComputeGraphDecorator } from '#testing';
import { translations } from '#translations';
import { Sheet } from '#types';

import { useComputeGraph } from '../ComputeGraph/index.ts';
import { SheetContent } from '../SheetContent/index.ts';
import { SheetRoot, useSheetContext } from '../SheetRoot/index.ts';
import { ChartCompanion } from './ChartCompanion.tsx';
import { type ChartSpec } from './types.ts';
import { useRangeValues } from './useRangeValues.ts';

const initialCharts: ChartSpec[] = [
  { id: 'sales', name: 'Sales by region', range: 'A1:C7', type: 'bar', header: true, grid: true },
  { id: 'share', name: 'Market share', range: 'E1:F5', type: 'pie', header: true },
  { id: 'curve', name: 'Curve', range: 'H1:I11', type: 'xy', header: true, grid: true },
];

/** The companion shares the sheet's selection through the `Selection` view state, as an app container would. */
const Companion = () => {
  const { model } = useSheetContext();
  const getValues = useRangeValues(model);
  const [charts, setCharts] = useState<ChartSpec[]>(initialCharts);
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

const DefaultStory = () => {
  const [space] = useSpaces();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createChartTestCells(), ranges: createChartTestRanges() });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <SheetRoot graph={graph} sheet={sheet} attendableId='test' ignoreAttention>
      <div className='grid grid-cols-[1fr_28rem] dx-fill divide-x divide-separator'>
        <div className='grid'>
          <SheetContent />
        </div>
        <Companion />
      </div>
    </SheetRoot>
  );
};

const meta = {
  title: 'plugins/plugin-sheet/components/ChartCompanion',
  render: () => <DefaultStory />,
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
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
