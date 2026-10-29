//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { rangeFromA1Notation } from '@dxos/compute-hyperformula/types';
import { Obj } from '@dxos/echo';

import * as Sheet from './Sheet.ts';
import * as SheetUtil from './SheetUtil.ts';

const range = (a1: string) => {
  const { from, to = from } = rangeFromA1Notation(a1);
  return { from, to };
};

describe('rangeFromAnchor', () => {
  test('follows its cells as columns are inserted and rows move', ({ expect }) => {
    const sheet = Sheet.make({ rows: 5, columns: 5 });
    const anchor = SheetUtil.rangeToAnchor(sheet, rangeFromA1Notation('B2:C3'));

    Obj.update(sheet, (sheet) => {
      SheetUtil.insertIndices(sheet.columns, 0, 1, SheetUtil.MAX_COLS);
      sheet.rows.push(...sheet.rows.splice(0, 1));
    });

    expect(SheetUtil.rangeFromAnchor(sheet, anchor)).toEqual(range('C1:D2'));
  });

  test('no longer resolves once a row it names is deleted', ({ expect }) => {
    const sheet = Sheet.make({ rows: 5, columns: 5 });
    const anchor = SheetUtil.rangeToAnchor(sheet, rangeFromA1Notation('B2'));

    Obj.update(sheet, (sheet) => sheet.rows.splice(1, 1));

    expect(SheetUtil.rangeFromAnchor(sheet, anchor)).toBeUndefined();
  });

  test('reads positional anchors stored before index ranges', ({ expect }) => {
    const sheet = Sheet.make({ rows: 5, columns: 5 });

    expect(SheetUtil.rangeFromAnchor(sheet, 'B2:C3')).toEqual(range('B2:C3'));
    expect(SheetUtil.rangeFromAnchor(sheet, 'B2')).toEqual(range('B2'));
    expect(SheetUtil.rangeFromAnchor(sheet, '1,1,2,2')).toEqual(range('B2:C3'));
    expect(SheetUtil.rangeFromAnchor(sheet, '1730000000000')).toBeUndefined();
  });
});

describe('compareAnchors', () => {
  test('orders by the first cell, row first, with unresolved anchors last', ({ expect }) => {
    const sheet = Sheet.make({ rows: 5, columns: 5 });
    const anchors = ['A3', 'C1', 'B1:B2'].map((a1) => SheetUtil.rangeToAnchor(sheet, rangeFromA1Notation(a1)));

    expect(['1730000000000', ...anchors].sort((a, b) => SheetUtil.compareAnchors(sheet, a, b))).toEqual([
      anchors[2],
      anchors[1],
      anchors[0],
      '1730000000000',
    ]);
  });
});
