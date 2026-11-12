//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

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
  createChartTestCells,
  createChartTestRanges,
  withComputeGraphDecorator,
} from '#testing';
import { translations } from '#translations';
import { Sheet, type SheetCapabilities } from '#types';

import { useSheetContext } from '../SheetRoot/index.ts';
import { SheetCharts } from './SheetCharts.tsx';

const initialCharts: Sheet.ChartProperties[] = [
  { name: 'Sales by region', range: 'A1:C7', type: 'bar', header: true, grid: true },
  { name: 'Market share', range: 'E1:F5', type: 'pie', header: true },
  { name: 'Curve', range: 'H1:I11', type: 'xy', header: true, grid: true },
];

/** A chart type as another plugin would contribute it: it lists the range's rows. */
const rowsChartType: SheetCapabilities.ChartTypeContribution = {
  type: 'org.example.rows',
  label: 'Rows',
  icon: 'ph--rows--regular',
  component: ({ data }) => (
    <ul data-testid='rows-chart'>
      {data.rows.map((row, index) => (
        <li key={index}>{row.join(' · ')}</li>
      ))}
    </ul>
  ),
};

/** The sheet's charts, as the app's charts companion shows them. */
const Companion = ({ chartTypes }: Pick<StoryArgs, 'chartTypes'>) => {
  const { model } = useSheetContext();
  return <SheetCharts sheet={model.sheet} model={model} chartTypes={chartTypes} />;
};

type StoryArgs = {
  mode?: SheetCompanionFrameMode;
  charts?: Sheet.ChartProperties[];
  chartTypes?: SheetCapabilities.ChartTypeContribution[];
};

const DefaultStory = ({ mode, charts = initialCharts, chartTypes }: StoryArgs) => (
  <SheetCompanionFrame
    sheet={{ cells: createChartTestCells(), ranges: createChartTestRanges(), charts }}
    companion={<Companion chartTypes={chartTypes} />}
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

/** A chart whose type another plugin contributes draws with that plugin's component. */
export const ContributedChartType: Story = {
  args: {
    charts: [{ name: 'Regions', range: 'A1:C7', type: rowsChartType.type, header: true }, ...initialCharts],
    chartTypes: [rowsChartType],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chart = await canvas.findByTestId('rows-chart');
    await expect(chart.querySelectorAll('li')).toHaveLength(6);
    await expect(canvas.getByText(/A1:C7 · Rows/)).toBeVisible();
  },
};
