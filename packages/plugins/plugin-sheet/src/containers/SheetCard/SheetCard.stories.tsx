//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { ComputeGraphRegistry } from '@dxos/compute-hyperformula';
import { createMockedComputeRuntimeProvider } from '@dxos/compute-hyperformula/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import * as Card from '@dxos/react-ui/Card';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { useComputeGraph } from '#components';
import { createChartTestCells, createTestCells, useTestSheet, withComputeGraphDecorator } from '#testing';
import { translations } from '#translations';
import { Sheet, SheetCapabilities } from '#types';

import { chartTypes } from '../../capabilities/chart-types.tsx';
import { SheetCard } from './SheetCard.tsx';

const sharedRegistry = new ComputeGraphRegistry({ computeRuntime: createMockedComputeRuntimeProvider() });

type StoryArgs = {
  name: string;
  cells: Record<string, Sheet.CellValue>;
  charts?: Sheet.ChartProperties[];
};

const DefaultStory = ({ name, cells, charts }: StoryArgs) => {
  const [space] = useSpaces();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { name, cells, charts });
  if (!sheet) {
    return null;
  }

  return (
    <div className='p-4 dx-card-min-width dx-card-max-width'>
      <Card.Root>
        <Card.Header>
          <Card.Title>{name}</Card.Title>
        </Card.Header>
        <SheetCard role={AppSurface.CardContent.role} subject={sheet} />
      </Card.Root>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-sheet/containers/SheetCard',
  render: (args) => <DefaultStory {...args} />,
  decorators: [
    withTheme(),
    withLayout({ layout: 'centered' }),
    withClientProvider({ types: [Sheet.Sheet, Sheet.Chart], createSpace: true }),
    withComputeGraphDecorator({ registry: sharedRegistry }),
    withPluginManager({
      plugins: [...CorePlugins.make()],
      capabilities: [
        Capability.contribute(SheetCapabilities.ComputeGraphRegistry, sharedRegistry),
        Capability.contributeAll(SheetCapabilities.ChartType, chartTypes),
      ],
    }),
  ],
  parameters: { translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Cells: Story = {
  args: { name: 'Budget', cells: createTestCells() },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByTestId('sheet.preview.grid')).resolves.toBeTruthy();
  },
};

export const Chart: Story = {
  args: {
    name: 'Sales',
    cells: createChartTestCells(),
    charts: [{ name: 'Sales by region', range: 'A1:C7', type: 'bar', header: true, grid: true }],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByTestId('sheet.preview.chart')).resolves.toBeTruthy();
  },
};
