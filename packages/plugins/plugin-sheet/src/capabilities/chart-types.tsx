//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { Plot, PLOT_TYPES, type PlotType } from '@dxos/react-ui-plot';

import { TimelineChart } from '#components';
import { SheetCapabilities } from '#types';

import { SheetNamespace } from '../namespace.ts';

const PLOT_ICONS: Record<PlotType, string> = {
  bar: 'ph--chart-bar--regular',
  pie: 'ph--chart-pie--regular',
  xy: 'ph--chart-line--regular',
  scatter: 'ph--chart-scatter--regular',
  heatmap: 'ph--squares-four--regular',
  radar: 'ph--chart-polar--regular',
  map: 'ph--globe-hemisphere-west--regular',
};

const plotChartType = (type: PlotType): SheetCapabilities.ChartTypeContribution => ({
  type,
  label: [`chart-type.${type}.label`, { ns: SheetNamespace.key }],
  icon: PLOT_ICONS[type],
  component: ({ chart, data }) => <Plot data={data} options={{ ...chart, type }} classNames='p-2' />,
});

const timelineChartType: SheetCapabilities.ChartTypeContribution = {
  type: 'timeline',
  label: ['chart-type.timeline.label', { ns: SheetNamespace.key }],
  icon: 'ph--line-segments--regular',
  component: ({ chart, data, chrome, onUpdate }) => (
    <TimelineChart
      data={data}
      settings={chart.timeline}
      chrome={chrome}
      onChange={(settings) => onUpdate?.({ timeline: { ...chart.timeline, ...settings } })}
    />
  ),
};

/** The sheet's own chart types; the first is the type a new chart starts as. */
export const chartTypes: SheetCapabilities.ChartTypeContribution[] = [
  ...PLOT_TYPES.map(plotChartType),
  timelineChartType,
];

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributeAll(SheetCapabilities.ChartType, chartTypes)),
);
