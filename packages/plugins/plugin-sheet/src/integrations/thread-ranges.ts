//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { debounce } from '@dxos/async';
import { type CellAddress, inRange } from '@dxos/compute-hyperformula';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as CommentOperation from '@dxos/plugin-review/CommentOperation';
import { Attention } from '@dxos/react-ui-attention/types';
import { AnchoredTo, Thread } from '@dxos/types';

import { useSheetContext } from '#components';
import { type Sheet, SheetUtil } from '#types';

/** The first thread whose anchor on `sheet` spans `cell`. */
export const findThreadAnchorAtCell = (
  sheet: Sheet.Sheet,
  anchors: readonly AnchoredTo.AnchoredTo[],
  cell: CellAddress,
): AnchoredTo.AnchoredTo | undefined =>
  anchors.find((anchor) => {
    if (!anchor.anchor || !Obj.instanceOf(Thread.Thread, Relation.getSource(anchor))) {
      return false;
    }

    return inRange(SheetUtil.rangeFromAnchor(sheet, anchor.anchor), cell);
  });

export const useSelectThreadOnCellFocus = () => {
  const { model, cursor } = useSheetContext();
  const { invokePromise } = Hooks.useOperationInvoker();

  const db = Obj.getDatabase(model.sheet);
  const anchors = useQuery(db, Query.select(Filter.id(model.sheet.id)).targetOf(AnchoredTo.AnchoredTo));

  const selectClosestThread = useCallback(
    (cellAddress: CellAddress) => {
      if (!cellAddress) {
        return;
      }

      const closestThread = findThreadAnchorAtCell(model.sheet, anchors, cellAddress);
      if (closestThread) {
        void (async () => {
          await invokePromise(CommentOperation.Select, { current: Relation.getURI(closestThread) });
          await invokePromise(LayoutOperation.UpdateCompanion, {
            subject: Attention.linkedSegment('comments'),
          });
        })();
      }
    },
    [invokePromise, model.sheet, anchors],
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
