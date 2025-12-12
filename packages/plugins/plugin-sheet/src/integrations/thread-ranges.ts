//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';
import { useCallback, useEffect, useMemo } from 'react';

import { LayoutAction, chain, createIntent, createResolver } from '@dxos/app-framework';
import { useIntentDispatcher, useIntentResolver } from '@dxos/app-framework/react';
import { debounce } from '@dxos/async';
import { type CellAddress, type CompleteCellRange, inRange } from '@dxos/compute';
import { Obj, Relation } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { Filter, Query, useQuery } from '@dxos/react-client/echo';
import { type DxGridElement, type GridContentProps } from '@dxos/react-ui-grid';
import { AnchoredTo, Thread } from '@dxos/types';

import { useSheetContext } from '../components';
import { meta } from '../meta';

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
  const scrollIntoViewResolver = useMemo(
    () =>
      createResolver({
        intent: LayoutAction.ScrollIntoView,
        position: 'hoist',
        filter: (
          data,
        ): data is {
          part: 'current';
          subject: string;
          options: { cursor: string; ref: GridContentProps['activeRefs'] };
        } => {
          if (!Schema.is(LayoutAction.ScrollIntoView.fields.input)(data)) {
            return false;
          }

          return data.subject === Obj.getDXN(model.sheet).toString() && !!data.options?.cursor;
        },
        resolve: ({ options: { cursor, ref } }) => {
          setActiveRefs(ref);
          // TODO(Zan): Everywhere we refer to the cursor in a thread context should change to `anchor`.
          const range = parseThreadAnchorAsCellRange(cursor!);
          range && grid?.setFocus({ ...range.to, plane: 'grid' }, true);
        },
      }),
    [model.sheet, setActiveRefs],
  );

  useIntentResolver(meta.id, scrollIntoViewResolver);
};

export const useSelectThreadOnCellFocus = () => {
  const { model, cursor } = useSheetContext();
  const { dispatchPromise: dispatch } = useIntentDispatcher();

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
        const primary = Obj.getDXN(model.sheet).toString();
        const intent = Function.pipe(
          createIntent(ThreadAction.Select, { current: Obj.getDXN(closestThread).toString() }),
          chain(DeckAction.ChangeCompanion, { primary, companion: `${primary}${ATTENDABLE_PATH_SEPARATOR}comments` }),
        );
        void dispatch(intent);
      }
    },
    [dispatch, anchors],
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
