//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import { type IntentResolver, LayoutAction, useIntentDispatcher, useIntentResolver } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { type DxGridElement, type DxGridPosition } from '@dxos/react-ui-grid';

import { useSheetContext } from '../components';
import { type CellAddress, type CompleteCellRange, inRange } from '../defs';
import { SHEET_PLUGIN } from '../meta';

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

export const useUpdateFocusedCellOnThreadSelection = (grid: DxGridElement | null) => {
  const { model, setActiveRefs } = useSheetContext();
  const handleScrollIntoView: IntentResolver = useCallback(
    ({ action, data }) => {
      switch (action) {
        case LayoutAction.SCROLL_INTO_VIEW: {
          if (!data?.id || data?.cursor === undefined || data?.id !== fullyQualifiedId(model.sheet)) {
            return;
          }
          setActiveRefs(data.thread);
          // TODO(Zan): Everywhere we refer to the cursor in a thread context should change to `anchor`.
          const range = parseThreadAnchorAsCellRange(data.cursor);
          range && grid?.setFocus({ ...range.to, plane: 'grid' }, true);

          return { data: true };
        }
      }
    },
    [model.sheet, setActiveRefs],
  );

  useIntentResolver(SHEET_PLUGIN, handleScrollIntoView);
};

export const useSelectThreadOnCellFocus = () => {
  const { model, cursor } = useSheetContext();
  const dispatch = useIntentDispatcher();

  const threads = useMemo(
    () => model.sheet.threads?.filter((thread): thread is NonNullable<typeof thread> => !!thread) ?? [],
    [
      // TODO(thure): Surely we can find a better dependency for this…
      JSON.stringify(model.sheet.threads),
    ],
  );

  const selectClosestThread = useCallback(
    (cellAddress: CellAddress) => {
      if (!cellAddress || !threads) {
        return;
      }

      const closestThread = threads?.find((ref) => {
        if (ref.target?.anchor) {
          const range = parseThreadAnchorAsCellRange(ref.target!.anchor);
          return range ? inRange(range, cellAddress) : false;
        } else {
          return false;
        }
      });

      if (closestThread) {
        void dispatch([
          { action: 'dxos.org/plugin/thread/action/select', data: { current: fullyQualifiedId(closestThread) } },
        ]);
      }
    },
    [dispatch, threads],
  );

  const debounced = useMemo(() => {
    return debounce((cellCoords: DxGridPosition) => requestAnimationFrame(() => selectClosestThread(cellCoords)), 50);
  }, [selectClosestThread]);

  useEffect(() => {
    if (!cursor) {
      return;
    }
    debounced(cursor);
  }, [cursor, debounced]);
};
