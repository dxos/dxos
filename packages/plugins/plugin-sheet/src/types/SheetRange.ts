//
// Copyright 2024 DXOS.org
//

import { addressFromA1Notation, addressToA1Notation, rangeFromA1Notation } from '@dxos/compute-hyperformula/types';
import { type ClassNameValue } from '@dxos/ui-types';

import type * as Sheet from '../types/Sheet.ts';

export const alignKey = 'alignment';
export type AlignKey = typeof alignKey;
export type AlignValue = 'start' | 'center' | 'end';

export const commentKey = 'comment';
export type CommentKey = typeof commentKey;
export type CommentValue = string;

/** A cell range's highlight: the value is a CSS color, painted behind the cells. */
export const highlightKey = 'highlight';
export type HighlightKey = typeof highlightKey;

// Only plain colors reach a cell's inline style: hex, a name, or a color function of numbers.
const COLOR_PATTERN =
  /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|[a-z]+|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([\d\s.,%/+-]*\))$/i;

/** True for a color a highlight may hold. */
export const isColor = (value: unknown): value is string => typeof value === 'string' && COLOR_PATTERN.test(value);

/** The background of a cell under these ranges: the last highlight that applies, if any. */
export const cellBackgroundForRanges = (ranges: readonly Sheet.Sheet['ranges'][number][]): string | undefined =>
  ranges.findLast(({ key, value }) => key === highlightKey && isColor(value))?.value;

export const styleKey = 'style';
export type StyleKey = typeof styleKey;
export type StyleValue = 'header' | 'highlight' | 'softwrap';

// TODO(burdon): Reconcile with plugin-table.
export const cellClassNameForRange = ({ key, value }: Sheet.Sheet['ranges'][number]): ClassNameValue => {
  switch (key) {
    case alignKey:
      switch (value) {
        case 'start':
          return 'text-start';
        case 'center':
          return 'text-center';
        case 'end':
          return 'text-end';
        default:
          return undefined;
      }

    case commentKey:
      return 'bg-grid-comment';

    case styleKey:
      switch (value) {
        case 'header':
          return 'bg-grid-header! text-grid-header-fg! font-medium';
        case 'highlight':
          return 'bg-grid-highlight!';
        case 'softwrap':
          return 'whitespace-normal!';
        default:
          return undefined;
      }

    default:
      return undefined;
  }
};

/** Plain numbers, formulas, and numeric literals such as `8%` or `$10000`, which the grid renders end-aligned. */
const isNumericValue = (value: unknown): boolean =>
  typeof value === 'number' ||
  (typeof value === 'string' && (value.startsWith('=') || /^[$\u20AC£]?-?[\d,]*\.?\d+%?$/.test(value)));

/**
 * Ranges that give a table's header row (an A1 range such as `A1:F1`) the heading style and end-align the headers of
 * its numeric columns - those whose every cell below the header is numeric - so they sit over their values.
 */
export const headerRanges = (cells: Record<string, Sheet.CellValue>, header: string): Sheet.Range[] => {
  const { from, to = from } = rangeFromA1Notation(header);
  const values = Object.entries(cells).map(([address, { value }]) => ({ ...addressFromA1Notation(address), value }));
  const numeric = Array.from({ length: to.col - from.col + 1 }, (_, index) => {
    const column = values.filter(({ col, row }) => col === from.col + index && row > from.row);
    return column.length > 0 && column.every(({ value }) => isNumericValue(value));
  });

  // Contiguous numeric columns share one alignment range.
  const runs: Array<{ start: number; end: number }> = [];
  numeric.forEach((isNumeric, index) => {
    const last = runs.at(-1);
    if (!isNumeric) {
      return;
    }
    if (last && last.end === index - 1) {
      last.end = index;
    } else {
      runs.push({ start: index, end: index });
    }
  });

  const cell = (index: number) => addressToA1Notation({ col: from.col + index, row: from.row });
  return [
    { range: header, key: styleKey, value: 'header' },
    ...runs.map(({ start, end }) => ({
      range: start === end ? cell(start) : `${cell(start)}:${cell(end)}`,
      key: alignKey,
      value: 'end',
    })),
  ];
};
