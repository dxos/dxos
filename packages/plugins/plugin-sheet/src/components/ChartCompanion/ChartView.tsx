//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Plot, type PlotValue, toPlotData } from '@dxos/react-ui-plot';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';
import { type Sheet } from '#types';

import { TimelineChart } from './TimelineChart.tsx';

export type ChartViewProps = {
  chart: Sheet.ChartProperties;
  /** Computed cell values for a range in A1 notation; a new function identity re-renders the chart. */
  getValues: (range: string) => PlotValue[][] | undefined;
  /** Saves view settings changed from the chart's own toolbar (timeline); read-only without one. */
  onUpdate?: (props: Partial<Sheet.ChartProperties>) => void;
  /** Shows a chart's own toolbars (timeline); off in a slide. */
  chrome?: boolean;
};

/** A chart of a range: a plot, or a timeline with its own toolbar. */
export const ChartView = ({ chart, getValues, onUpdate, chrome }: ChartViewProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const data = useMemo(() => {
    const values = getValues(chart.range);
    return values && toPlotData(values, { header: chart.header });
  }, [getValues, chart.range, chart.header]);

  if (!data) {
    return <Typography.Text classNames='p-2 text-fg-subtle'>{t('invalid-range.message')}</Typography.Text>;
  }

  return chart.type === 'timeline' ? (
    <TimelineChart
      data={data}
      settings={chart.timeline}
      chrome={chrome}
      onChange={(settings) => onUpdate?.({ timeline: { ...chart.timeline, ...settings } })}
    />
  ) : (
    <Plot data={data} options={{ ...chart, type: chart.type }} classNames='p-2' />
  );
};

ChartView.displayName = 'ChartView';
