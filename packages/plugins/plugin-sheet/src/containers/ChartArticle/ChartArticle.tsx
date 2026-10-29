//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { type Space, getSpace } from '@dxos/react-client/echo';
import * as Panel from '@dxos/react-ui/Panel';

import { ChartView, ComputeGraphContextProvider, useComputeGraph, useRangeValues } from '#components';
import { Sheet, SheetCapabilities } from '#types';

import { type SheetModel, useSheetModel } from '../../model/index.ts';

export type ChartArticleProps = AppSurface.ObjectArticleProps<Sheet.Chart>;

/**
 * A chart on its own, as an article or embedded in a document as a section or slide. It evaluates its sheet's range
 * in the sheet's compute graph.
 */
export const ChartArticle = ({ role, subject }: ChartArticleProps) => {
  const registry = Hooks.useCapability(SheetCapabilities.ComputeGraphRegistry);
  const space = getSpace(subject);
  if (!space) {
    return null;
  }

  return (
    <ComputeGraphContextProvider registry={registry}>
      <ChartArticleInner role={role} chart={subject} space={space} />
    </ComputeGraphContextProvider>
  );
};

ChartArticle.displayName = 'ChartArticle';

const ChartArticleInner = ({ role, chart, space }: { role?: string; chart: Sheet.Chart; space: Space }) => {
  const [sheetRef] = useObject(chart, 'sheet');
  const sheet = useResolveRef(sheetRef);
  const graph = useComputeGraph(space);
  const model = useSheetModel(graph, sheet);
  return model ? <ChartContent role={role} chart={chart} model={model} /> : null;
};

const ChartContent = ({ role, chart: chartProp, model }: { role?: string; chart: Sheet.Chart; model: SheetModel }) => {
  const [chart] = useObject(chartProp);
  const getValues = useRangeValues(model);
  const handleUpdate = useCallback(
    (props: Partial<Sheet.ChartProperties>) => Sheet.updateChart(chartProp, props),
    [chartProp],
  );
  if (!chart) {
    return null;
  }

  const { sheet: _sheet, ...props } = chart;
  return (
    <Panel.Root classNames={role === AppSurface.Section.role && 'aspect-video w-full max-h-full min-h-0'}>
      <Panel.Body>
        <ChartView
          chart={props}
          getValues={getValues}
          onUpdate={handleUpdate}
          chrome={role !== AppSurface.Slide.role}
        />
      </Panel.Body>
    </Panel.Root>
  );
};
