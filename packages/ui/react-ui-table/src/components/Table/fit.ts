//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Format, TypeEnum } from '@dxos/echo/Format';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import {
  CELL_PADDING,
  type DxGridAxisMeta,
  type DxGridElement,
  type FitWidth,
  measureText,
  useFitWidth,
} from '@dxos/react-ui-grid';
import { formatForDisplay } from '@dxos/schema';

import { type TableModel } from '../../model/index.ts';

const FIT_ROWS = 8;

const HEADER_BUTTONS = 24;

const TAG_PADDING = 16;

const measureFieldWidths = (grid: Element, model: TableModel): number[] => {
  const rows = model.getRows().slice(0, FIT_ROWS);
  return model.projection.getFields().map((field) => {
    const { props } = model.projection.getFieldProjection(field.id);
    let width = measureText(grid, props.title ?? field.path) + HEADER_BUTTONS;
    for (const row of rows) {
      const value = SchemaEx.getValue(row, field.path);
      if (value == null) {
        continue;
      }
      if (props.format === Format.TypeFormat.SingleSelect || props.format === Format.TypeFormat.MultiSelect) {
        const ids = Array.isArray(value) ? value : [value];
        const titles = ids.map((id) => props.options?.find((option) => option.id === id)?.title ?? '');
        width = Math.max(width, ...titles.map((title) => measureText(grid, title) + TAG_PADDING));
      } else if (props.type === TypeEnum.Array) {
        width = Math.max(width, measureText(grid, Array.isArray(value) ? value.join(', ') : ''));
      } else if (props.format !== Format.TypeFormat.Boolean && props.format !== Format.TypeFormat.Ref) {
        width = Math.max(width, measureText(grid, formatForDisplay({ type: props.type, format: props.format, value })));
      }
    }
    return width + CELL_PADDING;
  });
};

export type UseTableFitWidthProps = {
  grid: DxGridElement | null;
  model: TableModel | undefined;
  rows: readonly unknown[];
  columnMeta: DxGridAxisMeta;
  actionColumn: boolean;
};

export const useTableFitWidth = ({
  grid,
  model,
  rows,
  columnMeta,
  actionColumn,
}: UseTableFitWidthProps): { fit: FitWidth; columnMeta: DxGridAxisMeta; columns: number } => {
  const selection = model?.selectionColumns ?? 0;
  const pin = model?.pinColumns ?? 0;
  const widths = useMemo(() => (grid && model ? measureFieldWidths(grid, model) : undefined), [grid, model, rows]);
  const fit = useFitWidth({
    reserved:
      Object.values(columnMeta.frozenColsStart ?? {})
        .slice(0, selection)
        .reduce((sum, { size }) => sum + (size ?? 0), 0) +
      (actionColumn ? (columnMeta.frozenColsEnd?.[0]?.size ?? 0) : 0),
    widths,
  });
  const fields = Math.min(fit.sizes.length, model?.projection.getFields().length ?? 0);
  const fittedMeta = useMemo<DxGridAxisMeta>(() => {
    const size = (field: number) => ({ size: fit.sizes[field], resizeable: false });
    return {
      ...columnMeta,
      frozenColsStart: Object.fromEntries(
        Object.entries(columnMeta.frozenColsStart ?? {}).map(([index, meta]) => [
          index,
          Number(index) < selection ? meta : size(Number(index) - selection),
        ]),
      ),
      grid: Object.fromEntries(
        Array.from({ length: Math.max(0, fields - pin) }, (_, index) => [index, size(pin + index)]),
      ),
    };
  }, [columnMeta, fields, fit.sizes, selection, pin]);
  return { fit, columnMeta: fittedMeta, columns: Math.max(0, fields - pin) };
};
