//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { debounce } from '@dxos/async';
import { type CellAddress, type CompleteCellRange, inRange } from '@dxos/compute-hyperformula';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { CommentOperation } from '@dxos/plugin-comments/types';
import { useQuery } from '@dxos/react-client/echo';
import { linkedSegment } from '@dxos/react-ui-attention';
import { AnchoredTo, Thread } from '@dxos/types';

import { useSheetContext } from '#components';

// Cell-range anchor: the generic range-selection anchor `"<from>:<to>"`, each endpoint `"col,row"`.
export const completeCellRangeToThreadCursor = (range: CompleteCellRange): string => {
  return `${range.from.col},${range.from.row}:${range.to.col},${range.to.row}`;
};

export const parseThreadAnchorAsCellRange = (cursor: string): CompleteCellRange | null => {
  // Accept the `"from:to"` form (endpoints separated by ':') and the legacy flat `"a,b,c,d"` form.
  const coords = cursor.includes(':')
    ? cursor.split(':').flatMap((endpoint) => endpoint.split(','))
    : cursor.split(',');
  if (coords.length !== 4) {
    return null;
  }
  const [fromCol, fromRow, toCol, toRow] = coords.map((value) => parseInt(value, 10));
  if ([fromCol, fromRow, toCol, toRow].some(Number.isNaN)) {
    return null;
  }
  return {
    from: { col: fromCol, row: fromRow },
    to: { col: toCol, row: toRow },
  };
};

export const useSelectThreadOnCellFocus = () => {
  const { model, cursor } = useSheetContext();
  const { invokePromise } = useOperationInvoker();

  const db = Obj.getDatabase(model.sheet);
  const anchors = useQuery(db, Query.select(Filter.id(model.sheet.id)).targetOf(AnchoredTo.AnchoredTo));

  const selectClosestThread = useCallback(
    (cellAddress: CellAddress) => {
      if (!cellAddress) {
        return;
      }

      const closestThread = anchors.find((anchor) => {
        const source = Relation.getSource(anchor);
        if (anchor.anchor && Obj.instanceOf(Thread.Thread, source)) {
          const range = parseThreadAnchorAsCellRange(anchor.anchor);
          return range ? inRange(range, cellAddress) : false;
        } else {
          return false;
        }
      });

      if (closestThread) {
        void (async () => {
          await invokePromise(CommentOperation.Select, { current: Relation.getURI(closestThread) });
          await invokePromise(LayoutOperation.UpdateCompanion, {
            subject: linkedSegment('comments'),
          });
        })();
      }
    },
    [invokePromise, anchors],
  );

  const debounced = useMemo(() => {
    return debounce((cellCoords: CellAddress) => requestAnimationFrame(() => selectClosestThread(cellCoords)), 50);
  }, [selectClosestThread]);

  useEffect(() => {
    if (!cursor) {
      return;
    }

    debounced(cursor);
  }, [cursor, debounced]);
};
