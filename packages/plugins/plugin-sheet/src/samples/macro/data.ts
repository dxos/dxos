//
// Copyright 2026 DXOS.org
//

import { type PlotValue } from '@dxos/react-ui-plot';

import { type Sheet } from '#types';

/** A leading apostrophe keeps digits as text, so a bare year reads as a date label rather than a number. */
const asText = (value: PlotValue) => (typeof value === 'string' && /^\d+$/.test(value) ? `'${value}` : value);

/** Sheet cells (from A1) for rows of values, one row per sheet row; empty values are left out. */
export const toCells = (rows: readonly (readonly PlotValue[])[]): Record<string, Sheet.CellValue> =>
  Object.fromEntries(
    rows.flatMap((row, index) =>
      row.flatMap((value, col) =>
        value == null
          ? []
          : [[`${String.fromCharCode('A'.charCodeAt(0) + col)}${index + 1}`, { value: asText(value) }]],
      ),
    ),
  );

/** The three industrial complexes, as the deck's first slide lays them out. */
export const COMPLEXES = [
  ['Financial (FIC)', 'Liquidity and debt', 'Treasury, Fed, dealer banks, BlackRock, PE, hedge funds'],
  ['Military (MIC)', 'Threat and procurement', 'Congress, Pentagon, five prime contractors, think tanks'],
  ['Technology (TIC)', 'Data and compute', 'Hyperscalers, Nvidia, AI labs, VCs, intelligence agencies'],
] as const;
