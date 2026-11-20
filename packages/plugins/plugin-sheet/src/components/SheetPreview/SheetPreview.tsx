//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ComputeGraph } from '@dxos/compute-hyperformula';
import { Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';

import { type SheetCapabilities, type Sheet as SheetType } from '#types';

import { type SheetModel, useSheetModel } from '../../model/index.ts';
import { ChartView, useRangeValues } from '../ChartCompanion/index.ts';
import { Sheet } from '../Sheet/index.ts';

export type SheetPreviewProps = {
  sheet: SheetType.Sheet;
  graph: ComputeGraph;
  chartTypes: readonly SheetCapabilities.ChartTypeContribution[];
};

export const SheetPreview = ({ sheet, graph, chartTypes }: SheetPreviewProps) => {
  const [charts] = useObject(sheet, 'charts');
  const chart = useResolveRef(charts?.[0]);
  return chart ? (
    <ChartPreview sheet={sheet} graph={graph} chart={chart} chartTypes={chartTypes} />
  ) : (
    <GridPreview sheet={sheet} graph={graph} />
  );
};

SheetPreview.displayName = 'SheetPreview';

const ChartPreview = ({ sheet, graph, chart, chartTypes }: SheetPreviewProps & { chart: SheetType.Chart }) => {
  const model = useSheetModel(graph, sheet, { readonly: true });
  return model ? <ChartPreviewContent model={model} chart={chart} chartTypes={chartTypes} /> : null;
};

const ChartPreviewContent = ({
  model,
  chart: chartProp,
  chartTypes,
}: Pick<SheetPreviewProps, 'chartTypes'> & { model: SheetModel; chart: SheetType.Chart }) => {
  const [chart] = useObject(chartProp);
  const getValues = useRangeValues(model);
  if (!chart) {
    return null;
  }

  const { sheet: _sheet, ...props } = chart;
  return (
    <div className='aspect-video max-h-64 w-full' data-testid='sheet.preview.chart'>
      <ChartView chart={props} getValues={getValues} chartTypes={chartTypes} chrome={false} />
    </div>
  );
};

const GridPreview = ({ sheet, graph }: Pick<SheetPreviewProps, 'sheet' | 'graph'>) => (
  <Sheet.Root graph={graph} sheet={sheet} attendableId={`${Obj.getURI(sheet)}#card`} readonly ignoreAttention>
    <Sheet.Content fit='width' classNames='h-36' data-testid='sheet.preview.grid' />
  </Sheet.Root>
);
