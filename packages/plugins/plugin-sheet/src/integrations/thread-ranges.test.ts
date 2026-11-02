//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { addressFromA1Notation } from '@dxos/compute-hyperformula';
import { Obj, Relation } from '@dxos/echo';
import { AnchoredTo, Thread } from '@dxos/types';

import { Sheet, SheetUtil } from '#types';

import { findThreadAnchorAtCell } from './thread-ranges.ts';

describe('findThreadAnchorAtCell', () => {
  test('a thread on B2 follows its cell when a row is inserted above', ({ expect }) => {
    const sheet = Sheet.make({ rows: 5, columns: 5 });
    const anchor = Relation.make(AnchoredTo.AnchoredTo, {
      [Relation.Source]: Thread.make(),
      [Relation.Target]: sheet,
      anchor: SheetUtil.anchorFromSelection(sheet, { mode: 'range', from: 'B2', to: 'B2' }),
    });

    Obj.update(sheet, (sheet) => SheetUtil.insertIndices(sheet.rows, 0, 1, SheetUtil.MAX_ROWS));

    // Scroll-to-anchor focuses the cell the anchor resolves to.
    expect(SheetUtil.rangeFromAnchor(sheet, anchor.anchor ?? '')).toEqual({
      from: addressFromA1Notation('B3'),
      to: addressFromA1Notation('B3'),
    });
    expect(findThreadAnchorAtCell(sheet, [anchor], addressFromA1Notation('B3'))).toBe(anchor);
    expect(findThreadAnchorAtCell(sheet, [anchor], addressFromA1Notation('B2'))).toBeUndefined();
  });
});
