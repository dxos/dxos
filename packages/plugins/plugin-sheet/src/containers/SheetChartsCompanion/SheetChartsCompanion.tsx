//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type Space, getSpace } from '@dxos/react-client/echo';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';

import { ChartCompanion, ComputeGraphContextProvider, useComputeGraph, useRangeValues } from '#components';
import { type Sheet, SheetCapabilities } from '#types';

import { type SheetModel, useSheetModel } from '../../model/index.ts';

export type SheetChartsCompanionProps = {
  role?: string;
  subject: Sheet.Sheet;
};

/** Charts of the sheet's ranges, kept on the sheet; shares the sheet's selection through the `Selection` view state. */
export const SheetChartsCompanion = ({ subject }: SheetChartsCompanionProps) => {
  const registry = Hooks.useCapability(SheetCapabilities.ComputeGraphRegistry);
  const space = getSpace(subject);
  if (!space) {
    return null;
  }

  return (
    <ComputeGraphContextProvider registry={registry}>
      <SheetChartsCompanionInner sheet={subject} space={space} />
    </ComputeGraphContextProvider>
  );
};

SheetChartsCompanion.displayName = 'SheetChartsCompanion';

const SheetChartsCompanionInner = ({ sheet, space }: { sheet: Sheet.Sheet; space: Space }) => {
  const graph = useComputeGraph(space);
  const model = useSheetModel(graph, sheet);
  return model ? <SheetCharts sheet={sheet} model={model} /> : null;
};

const SheetCharts = ({ sheet: sheetProp, model }: { sheet: Sheet.Sheet; model: SheetModel }) => {
  const [sheet, updateSheet] = useObject(sheetProp);
  const getValues = useRangeValues(model);
  const contextId = Obj.getURI(sheetProp);
  const selection = useSelection(contextId, 'range');
  const { range: setSelection } = useSelectionActions(contextId);

  const handleChange = useCallback(
    (charts: Sheet.Chart[]) =>
      updateSheet((sheet) => {
        // The schema type's arrays are read-only; the object takes mutable copies of a timeline's lists.
        sheet.charts = charts.map(({ timeline, ...chart }) => ({
          ...chart,
          ...(timeline && {
            timeline: {
              ...timeline,
              hidden: timeline.hidden && [...timeline.hidden],
              order: timeline.order && [...timeline.order],
              colors: timeline.colors && { ...timeline.colors },
            },
          }),
        }));
      }),
    [updateSheet],
  );

  const handleSelectRange = useCallback(
    (range: string) => {
      const [from, to = from] = range.toUpperCase().split(':');
      setSelection(from, to);
    },
    [setSelection],
  );

  return (
    <ChartCompanion
      charts={sheet.charts ?? []}
      onChange={handleChange}
      getValues={getValues}
      selection={selection && (selection.from === selection.to ? selection.from : `${selection.from}:${selection.to}`)}
      onSelectRange={handleSelectRange}
    />
  );
};
