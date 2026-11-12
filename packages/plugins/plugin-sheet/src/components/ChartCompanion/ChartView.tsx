//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Plot, type PlotValue, toPlotData } from '@dxos/react-ui-plot';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Typography from '@dxos/react-ui/Typography';

import { Sheet, type SheetCapabilities } from '#types';

import { SheetNamespace } from '../../namespace.ts';
import { TimelineChart } from './TimelineChart.tsx';

export type ChartViewProps = {
  chart: Sheet.ChartProperties;
  /** Computed cell values for a range in A1 notation; a new function identity re-renders the chart. */
  getValues: (range: string) => PlotValue[][] | undefined;
  /** Saves view settings changed from the chart's own toolbar (timeline); read-only without one. */
  onUpdate?: (props: Partial<Sheet.ChartProperties>) => void;
  /** Shows a chart's own toolbars (timeline); off in a slide. */
  chrome?: boolean;
  /** Chart types other plugins contribute. */
  chartTypes?: readonly SheetCapabilities.ChartTypeContribution[];
};

/** A chart of a range: a plot, a timeline with its own toolbar, or a contributed chart type. */
export const ChartView = ({ chart, getValues, onUpdate, chrome, chartTypes = [] }: ChartViewProps) => {
  const { t } = Hooks.useTranslation(SheetNamespace.key);
  const data = useMemo(() => {
    const values = getValues(chart.range);
    return values && toPlotData(values, { header: chart.header });
  }, [getValues, chart.range, chart.header]);

  if (!data) {
    return <Typography.Text classNames='p-2 text-fg-subtle'>{t('invalid-range.message')}</Typography.Text>;
  }

  const type = chart.type;
  if (Sheet.isBuiltinChartType(type)) {
    return type === 'timeline' ? (
      <TimelineChart
        data={data}
        settings={chart.timeline}
        chrome={chrome}
        onChange={(settings) => onUpdate?.({ timeline: { ...chart.timeline, ...settings } })}
      />
    ) : (
      <Plot data={data} options={{ ...chart, type }} classNames='p-2' />
    );
  }

  const Component = chartTypes.find((contribution) => contribution.type === type)?.component;
  if (!Component) {
    return (
      <Typography.Text classNames='p-2 text-fg-subtle'>{t('unknown-chart-type.message', { type })}</Typography.Text>
    );
  }

  return <Component chart={chart} data={data} />;
};

ChartView.displayName = 'ChartView';
