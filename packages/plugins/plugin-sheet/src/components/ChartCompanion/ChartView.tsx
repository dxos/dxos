//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type PlotValue, toPlotData } from '@dxos/react-ui-plot';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Typography from '@dxos/react-ui/Typography';

import { type Sheet, type SheetCapabilities } from '#types';

import { SheetNamespace } from '../../namespace.ts';

export type ChartViewProps = {
  chart: Sheet.ChartProperties;
  /** Computed cell values for a range in A1 notation; a new function identity re-renders the chart. */
  getValues: (range: string) => PlotValue[][] | undefined;
  /** Saves settings changed from the chart's own toolbar; read-only without one. */
  onUpdate?: (props: Partial<Sheet.ChartProperties>) => void;
  /** Shows a chart's own toolbars; off in a slide. */
  chrome?: boolean;
  /** Every chart type, from `SheetCapabilities.ChartType`. */
  chartTypes: readonly SheetCapabilities.ChartTypeContribution[];
};

/** A chart of a range, drawn by its type's component. */
export const ChartView = ({ chart, getValues, onUpdate, chrome, chartTypes }: ChartViewProps) => {
  const { t } = Hooks.useTranslation(SheetNamespace.key);
  const data = useMemo(() => {
    const values = getValues(chart.range);
    return values && toPlotData(values, { header: chart.header });
  }, [getValues, chart.range, chart.header]);

  if (!data) {
    return <Typography.Text classNames='p-2 text-fg-subtle'>{t('invalid-range.message')}</Typography.Text>;
  }

  const Component = chartTypes.find((chartType) => chartType.type === chart.type)?.component;
  if (!Component) {
    return (
      <Typography.Text classNames='p-2 text-fg-subtle'>
        {t('unknown-chart-type.message', { type: chart.type })}
      </Typography.Text>
    );
  }

  return <Component chart={chart} data={data} chrome={chrome} onUpdate={onUpdate} />;
};

ChartView.displayName = 'ChartView';
