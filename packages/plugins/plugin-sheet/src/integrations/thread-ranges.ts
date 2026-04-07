//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { linkedSegment } from '@dxos/react-ui-attention';
import { debounce } from '@dxos/async';
import { type CellAddress, type CompleteCellRange, inRange } from '@dxos/compute';
import { Obj, Relation } from '@dxos/echo';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { ThreadOperation } from '@dxos/plugin-thread/operations';
import { Filter, Query, useQuery } from '@dxos/react-client/echo';
import { AnchoredTo, Thread } from '@dxos/types';

import { useSheetContext } from '../components';

export const completeCellRangeToThreadCursor = (range: CompleteCellRange): string => {
  return `${range.from.col},${range.from.row},${range.to.col},${range.to.row}`;
};

export const parseThreadAnchorAsCellRange = (cursor: string): CompleteCellRange | null => {
  const coords = cursor.split(',');
  if (coords.length !== 4) {
    return null;
  } else {
    const [fromCol, fromRow, toCol, toRow] = coords;
    return {
      from: { col: parseInt(fromCol), row: parseInt(fromRow) },
      to: { col: parseInt(toCol), row: parseInt(toRow) },
    };
  }
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
          await invokePromise(ThreadOperation.Select, { current: Relation.getDXN(closestThread).toString() });
          await invokePromise(DeckOperation.ChangeCompanion, {
            companion: linkedSegment('comments'),
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
