//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { type DxGridAxisMeta, defaultColSize, defaultRowSize } from '@dxos/lit-grid';
import { CELL_PADDING, type DxGridElement, type FitWidth, measureText, useFitWidth } from '@dxos/react-ui-grid';

import { type Sheet, SheetUtil } from '#types';

import { type SheetModel } from '../../model/index.ts';
import { colLabelCell, projectCellProps } from './util.ts';

/** Width of the frozen row-number column, as `SheetContent` declares it. */
export const ROW_HEADER_SIZE = 48;

/** The used range: one past the last row and column holding a value, at least one of each. */
export const useUsedExtent = (sheet: Sheet.Sheet): { rows: number; columns: number } => {
  const [cells] = useObject(sheet, 'cells');
  // A cell's position comes from the axis orders, so inserting a row or column before it moves it.
  const [rowOrder] = useObject(sheet, 'rows');
  const [columnOrder] = useObject(sheet, 'columns');
  return useMemo(() => {
    let rows = 1;
    let columns = 1;
    for (const [index, cell] of Object.entries(cells ?? {})) {
      if (cell?.value === undefined || cell.value === null || cell.value === '') {
        continue;
      }
      const { row, col } = SheetUtil.addressFromIndex(sheet, index);
      if (row >= 0 && col >= 0) {
        rows = Math.max(rows, row + 1);
        columns = Math.max(columns, col + 1);
      }
    }
    return { rows, columns };
  }, [sheet, cells, rowOrder, columnOrder]);
};

/** The grid's size at 1:1 for the first `rows` × `columns`, headers included. */
export const naturalSize = (
  extent: { rows: number; columns: number },
  axes: { columns?: DxGridAxisMeta; rows?: DxGridAxisMeta },
): { width: number; height: number } => {
  const sum = (count: number, meta: DxGridAxisMeta | undefined, fallback: number) =>
    Array.from({ length: count }, (_, index) => meta?.grid?.[index]?.size ?? fallback).reduce((a, b) => a + b, 0);
  return {
    width: ROW_HEADER_SIZE + sum(extent.columns, axes.columns, defaultColSize),
    height: defaultRowSize + sum(extent.rows, axes.rows, defaultRowSize),
  };
};

export type FitBoxProps = PropsWithChildren<{ width: number; height: number }>;

/**
 * Shows content of a fixed natural size scaled down to fit its box and centred in it; it is never enlarged past 1:1, so
 * a small range stays at its actual size.
 */
export const FitBox = ({ width, height, children }: FitBoxProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number }>();
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = box ? Math.min(1, box.width / width, box.height / height) : 0;
  return (
    <div ref={ref} className='dx-cover flex items-center justify-center overflow-hidden' data-fit-scale={scale}>
      {/* Sized to the scaled content, so centring places what is drawn rather than the unscaled box. */}
      <div className='relative shrink-0' style={{ width: width * scale, height: height * scale }}>
        <div
          className='absolute top-0 left-0'
          style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const FIT_WIDTH_COLUMNS = 12;
const FIT_WIDTH_ROWS = 8;

export const useSheetFitWidth = (
  grid: DxGridElement | null,
  model: SheetModel,
  extent: { rows: number; columns: number },
): { fitWidth: FitWidth; columns: DxGridAxisMeta } => {
  const [cells] = useObject(model.sheet, 'cells');
  // Formula results arrive from the engine without changing `cells`.
  const [computed, setComputed] = useState(0);
  useEffect(() => model.graph.update.on(() => setComputed((count) => count + 1)), [model]);
  const widths = useMemo(() => {
    if (!grid) {
      return undefined;
    }
    return Array.from({ length: Math.max(extent.columns, FIT_WIDTH_COLUMNS) }, (_, col) => {
      const texts = [colLabelCell(col).value];
      for (let row = 0; row < Math.min(extent.rows, FIT_WIDTH_ROWS); row++) {
        texts.push(String(projectCellProps(model, col, row).value ?? ''));
      }
      return Math.max(...texts.map((text) => measureText(grid, text))) + CELL_PADDING;
    });
  }, [grid, model, cells, computed, extent]);
  const fitWidth = useFitWidth({ reserved: ROW_HEADER_SIZE, widths });
  const columns = useMemo<DxGridAxisMeta>(
    () => ({ grid: Object.fromEntries(fitWidth.sizes.map((size, index) => [index, { size, readonly: true }])) }),
    [fitWidth.sizes],
  );
  return { fitWidth, columns };
};
