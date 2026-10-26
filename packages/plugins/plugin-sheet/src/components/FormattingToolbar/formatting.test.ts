//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { Sheet, SheetRange } from '#types';

import { writeFormatting } from './formatting.ts';

/** A sheet holding these entries as stored (range indices are opaque to `writeFormatting`). */
const sheetWith = (ranges: Sheet.Range[]) => {
  const sheet = Sheet.make();
  Obj.update(sheet, (sheet) => {
    sheet.ranges.push(...ranges);
  });
  return sheet;
};

/** Applies one write as the toolbar does, within `Obj.update`. */
const write = (sheet: Sheet.Sheet, ...args: [string, string, string[], string[]?]) =>
  Obj.update(sheet, (sheet) => writeFormatting(sheet, ...args));

/** The entries as plain values. */
const entries = (sheet: Sheet.Sheet) => sheet.ranges.map(({ range, key, value }) => ({ range, key, value }));

describe('writeFormatting', () => {
  test('a replaced entry keeps its precedence against overlapping ranges', ({ expect }) => {
    const sheet = sheetWith([
      { range: 'broad', key: SheetRange.alignKey, value: 'start' },
      { range: 'narrow', key: SheetRange.alignKey, value: 'end' },
    ]);
    write(sheet, 'broad', SheetRange.alignKey, ['center']);
    expect(entries(sheet)).toEqual([
      { range: 'broad', key: SheetRange.alignKey, value: 'center' },
      { range: 'narrow', key: SheetRange.alignKey, value: 'end' },
    ]);
  });

  test('a new entry is appended', ({ expect }) => {
    const sheet = sheetWith([{ range: 'a', key: SheetRange.alignKey, value: 'start' }]);
    write(sheet, 'b', SheetRange.highlightKey, ['#ff0000']);
    expect(entries(sheet).at(-1)).toEqual({ range: 'b', key: SheetRange.highlightKey, value: '#ff0000' });
  });

  test('values the toolbar does not manage are kept', ({ expect }) => {
    const sheet = sheetWith([
      { range: 'a', key: SheetRange.styleKey, value: 'header' },
      { range: 'a', key: SheetRange.styleKey, value: 'softwrap' },
    ]);
    write(sheet, 'a', SheetRange.styleKey, [], ['softwrap']);
    expect(entries(sheet)).toEqual([{ range: 'a', key: SheetRange.styleKey, value: 'header' }]);
  });
});
