//
// Copyright 2026 DXOS.org
//

import { type PlotData, type PlotDatum, type PlotValue } from '../types.ts';

/** Spreadsheet column letters for a zero-based index: A-Z, then AA, AB, ... (bijective base 26). */
const columnName = (index: number): string => {
  let name = '';
  for (let remaining = index + 1; remaining > 0; remaining = Math.floor((remaining - 1) / 26)) {
    name = String.fromCharCode('A'.charCodeAt(0) + ((remaining - 1) % 26)) + name;
  }
  return name;
};

/** A cell value as a finite number; strings may carry `$`, `,` and `%`. */
export const toNumber = (value: PlotValue): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value.replace(/[$,%]/g, ''));
    return Number.isFinite(number) ? number : undefined;
  }

  return undefined;
};

export type ToPlotDataOptions = {
  /** The first row holds the series names. */
  header?: boolean;
};

/** Converts a 2D block of cell values (rows of columns) into `PlotData`. */
export const toPlotData = (values: PlotValue[][], { header = false }: ToPlotDataOptions = {}): PlotData => {
  const width = values.reduce((max, row) => Math.max(max, row.length), 0);
  const [first, ...rest] = values;
  const columns = Array.from({ length: width }, (_, index) =>
    header && first?.[index] != null ? String(first[index]) : columnName(index),
  );

  return { columns, rows: header ? rest : values };
};

/**
 * Flattens `PlotData` into long form. With a single column the row index is the key;
 * otherwise the first column is the key and each remaining column a series. Non-numeric values are dropped.
 */
export const toPlotDatums = ({ columns, rows }: PlotData): PlotDatum[] => {
  if (columns.length === 1) {
    return rows.flatMap((row, index) => {
      const value = toNumber(row[0]);
      return value === undefined ? [] : [{ key: index + 1, series: columns[0], value }];
    });
  }

  return rows.flatMap((row) =>
    columns.slice(1).flatMap((series, index) => {
      const value = toNumber(row[index + 1]);
      return value === undefined ? [] : [{ key: row[0], series, value }];
    }),
  );
};
