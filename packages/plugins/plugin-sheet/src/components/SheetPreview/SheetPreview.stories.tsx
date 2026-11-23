//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createChartTestCells, createTestCells, useTestSheet, withComputeGraphDecorator } from '#testing';
import { translations } from '#translations';
import { Sheet } from '#types';

import { chartTypes } from '../../capabilities/chart-types.tsx';
import { useComputeGraph } from '../ComputeGraph/index.ts';
import { SheetPreview } from './SheetPreview.tsx';

type StoryArgs = {
  cells: Record<string, Sheet.CellValue>;
  charts?: Sheet.ChartProperties[];
};

const DefaultStory = ({ cells, charts }: StoryArgs) => {
  const [space] = useSpaces();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells, charts });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <div className='dx-card-min-width dx-card-max-width border border-separator'>
      <SheetPreview sheet={sheet} graph={graph} chartTypes={chartTypes} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-sheet/components/SheetPreview',
  render: (args) => <DefaultStory {...args} />,
  decorators: [
    withTheme(),
    withLayout({ layout: 'centered' }),
    withClientProvider({ types: [Sheet.Sheet, Sheet.Chart], createSpace: true }),
    withComputeGraphDecorator(),
    withPluginManager({ plugins: [...CorePlugins.make()] }),
  ],
  parameters: { translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Grid: Story = {
  args: { cells: createTestCells() },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByTestId('sheet.preview.grid')).resolves.toBeTruthy();
  },
};

export const Chart: Story = {
  args: {
    cells: createChartTestCells(),
    charts: [{ name: 'Sales by region', range: 'A1:C7', type: 'bar', header: true, grid: true }],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByTestId('sheet.preview.chart')).resolves.toBeTruthy();
  },
};
