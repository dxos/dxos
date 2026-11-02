//
// Copyright 2026 DXOS.org
//

import { type CellAddress, inRange } from '@dxos/compute-hyperformula';
import { type Obj } from '@dxos/echo';

import { type Sheet, SheetRange, SheetUtil } from '#types';

/** The alignment a toolbar offers, by value, with its icon. */
export const ALIGN_ICONS: Record<SheetRange.AlignValue, string> = {
  start: 'ph--text-align-left--regular',
  center: 'ph--text-align-center--regular',
  end: 'ph--text-align-right--regular',
};

/** The styles a toolbar toggles; a highlight is a color, picked rather than toggled, and headers come from tables. */
export const STYLE_ICONS: Partial<Record<SheetRange.StyleValue, string>> = {
  softwrap: 'ph--paragraph--regular',
};

/** The formatting on some cells: one alignment, the toggled styles, and a highlight color. */
export type Formatting = {
  align?: SheetRange.AlignValue;
  styles: SheetRange.StyleValue[];
  highlight?: string;
};

/** A cell range, by its `range` index, with its formatting. */
export type FormattedRange = Formatting & { range: string };

const isAlignValue = (value: string): value is SheetRange.AlignValue => value in ALIGN_ICONS;
const isStyleValue = (value: string): value is SheetRange.StyleValue => value in STYLE_ICONS;

/** Folds range entries into formatting, later entries winning. */
const fold = (entries: readonly Sheet.Range[]): Formatting => {
  const formatting: Formatting = { styles: [] };
  for (const { key, value } of entries) {
    if (key === SheetRange.alignKey && isAlignValue(value)) {
      formatting.align = value;
    } else if (key === SheetRange.styleKey && isStyleValue(value) && !formatting.styles.includes(value)) {
      formatting.styles.push(value);
    } else if (key === SheetRange.highlightKey && SheetRange.isColor(value)) {
      formatting.highlight = value;
    }
  }
  return formatting;
};

/** The formatting of each cell range that has any, by its `range` index, in first-entry order. */
export const formattingByRange = (ranges: readonly Sheet.Range[]): FormattedRange[] => {
  const byRange = new Map<string, Sheet.Range[]>();
  for (const entry of ranges) {
    byRange.set(entry.range, [...(byRange.get(entry.range) ?? []), entry]);
  }
  return [...byRange].map(([range, entries]) => ({ range, ...fold(entries) }));
};

/** The formatting that applies at a cell: every range containing it, later ranges winning. */
export const formattingAt = (sheet: Sheet.Sheet, address: CellAddress): Formatting =>
  fold(sheet.ranges.filter(({ range }) => inRange(SheetUtil.rangeFromIndex(sheet, range), address)));

/**
 * Replaces a cell range's entries for one key, keeping every other range and key in place; call within `Obj.update`.
 * The new entries take the place of the first replaced one, so the range keeps its precedence against overlapping
 * ranges. `managed` limits which of the key's values are replaced (a toggle owns some styles, not all).
 */
export const writeFormatting = (
  sheet: Obj.Mutable<Sheet.Sheet>,
  range: string,
  key: string,
  values: readonly string[],
  managed?: readonly string[],
) => {
  const replaced = (entry: Sheet.Range) =>
    entry.range === range && entry.key === key && (!managed || managed.includes(entry.value));
  const at = sheet.ranges.findIndex(replaced);
  for (let index = sheet.ranges.length - 1; index >= 0; index--) {
    if (replaced(sheet.ranges[index])) {
      sheet.ranges.splice(index, 1);
    }
  }
  const entries = values.map((value) => ({ range, key, value }));
  if (at < 0) {
    sheet.ranges.push(...entries);
  } else {
    sheet.ranges.splice(at, 0, ...entries);
  }
};
