//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';

import { Sheet } from '#types';

import { type SheetModel } from '../../model/index.ts';
import { ChartCompanion } from './ChartCompanion.tsx';
import { useRangeValues } from './useRangeValues.ts';

export type SheetChartsProps = {
  attendableId?: string;
  sheet: Sheet.Sheet;
  model: SheetModel;
};

/** The sheet's charts in the charts companion; shares the sheet's selection through the `Selection` view state. */
export const SheetCharts = ({ attendableId, sheet, model }: SheetChartsProps) => {
  const [{ charts: refs = [] } = {}] = useObject(sheet);
  const charts = useObjects(refs);
  const getValues = useRangeValues(model);
  const contextId = Obj.getURI(sheet);
  const selection = useSelection(contextId, 'range');
  const { range: setSelection } = useSelectionActions(contextId);

  const resolve = useCallback((id: string) => refs.map((ref) => ref.target).find((chart) => chart?.id === id), [refs]);
  const handleAdd = useCallback((props: Sheet.ChartProperties) => Sheet.addChart(sheet, props).id, [sheet]);
  const handleUpdate = useCallback(
    (id: string, props: Partial<Sheet.ChartProperties>) => {
      const chart = resolve(id);
      if (chart) {
        Sheet.updateChart(chart, props);
      }
    },
    [resolve],
  );
  const handleDelete = useCallback(
    (id: string) => {
      const chart = resolve(id);
      if (chart) {
        Sheet.removeChart(sheet, chart);
      }
    },
    [sheet, resolve],
  );

  const handleSelectRange = useCallback(
    (range: string) => {
      const [from, to = from] = range.toUpperCase().split(':');
      setSelection(from, to);
    },
    [setSelection],
  );

  const items = useMemo(() => charts.map(({ sheet: _sheet, ...chart }) => chart), [charts]);

  return (
    <ChartCompanion
      attendableId={attendableId}
      charts={items}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      getValues={getValues}
      selection={selection && (selection.from === selection.to ? selection.from : `${selection.from}:${selection.to}`)}
      onSelectRange={handleSelectRange}
    />
  );
};

SheetCharts.displayName = 'SheetCharts';
