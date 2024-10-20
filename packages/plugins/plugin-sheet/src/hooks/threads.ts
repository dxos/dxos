//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { type MutableRefObject, useCallback, useEffect, useMemo } from 'react';

import { type IntentResolver, LayoutAction, useIntentDispatcher, useIntentResolver } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { type DxGridElement, type DxGridPosition } from '@dxos/react-ui-grid';

import { addressFromIndex, addressToIndex, type CellAddress, closest } from '../defs';
import { SHEET_PLUGIN } from '../meta';
import { type SheetModel, type Decoration, type Decorations } from '../model';

export const useUpdateFocusedCellOnThreadSelection = (
  model: SheetModel,
  grid: MutableRefObject<DxGridElement | null>,
) => {
  const handleScrollIntoView: IntentResolver = useCallback(
    ({ action, data }) => {
      switch (action) {
        case LayoutAction.SCROLL_INTO_VIEW: {
          if (!data?.id || data?.cursor === undefined || data?.id !== fullyQualifiedId(model.sheet)) {
            return;
          }

          // TODO(ZaymonFC): Everywhere we refer to the cursor in a thread context should change to `anchor`.
          const cellAddress = addressFromIndex(model.sheet, data.cursor);
          grid.current?.setFocus({ ...cellAddress, plane: 'grid' }, true);
        }
      }
    },
    [model.sheet],
  );

  useIntentResolver(SHEET_PLUGIN, handleScrollIntoView);
};

export const useSelectThreadOnCellFocus = (model: SheetModel, cursor?: CellAddress) => {
  const dispatch = useIntentDispatcher();

  const activeThreads = useMemo(
    () =>
      model.sheet.threads?.filter(
        (thread): thread is NonNullable<typeof thread> => !!thread && thread.status === 'active',
      ) ?? [],
    [
      // TODO(thure): Surely we can find a better dependency for this…
      JSON.stringify(model.sheet.threads),
    ],
  );

  const activeThreadAddresses = useMemo(
    () =>
      activeThreads
        .map((thread) => thread.anchor)
        .filter((anchor): anchor is NonNullable<typeof anchor> => anchor !== undefined)
        .map((anchor) => addressFromIndex(model.sheet, anchor)),
    [activeThreads, model.sheet],
  );

  const selectClosestThread = useCallback(
    (cellAddress: CellAddress) => {
      if (!cellAddress || !activeThreads) {
        return;
      }

      const closestThreadAnchor = closest(cellAddress, activeThreadAddresses);
      if (closestThreadAnchor) {
        const closestThread = activeThreads.find(
          (thread) => thread && thread.anchor === addressToIndex(model.sheet, closestThreadAnchor),
        );

        if (closestThread) {
          void dispatch([
            { action: 'dxos.org/plugin/thread/action/select', data: { current: fullyQualifiedId(closestThread) } },
          ]);
        }
      }
    },
    [dispatch, activeThreads, activeThreadAddresses, model.sheet],
  );

  const debounced = useMemo(() => {
    return debounce((cellCoords: DxGridPosition) => requestAnimationFrame(() => selectClosestThread(cellCoords)), 50);
  }, [selectClosestThread]);

  useEffect(() => {
    if (!cursor) {
      return;
    }
    debounced(cursor);
  }, [cursor, selectClosestThread]);
};

const createThreadDecoration = (cellIndex: string, threadId: string, sheetId: string): Decoration => {
  return {
    type: 'comment',
    classNames: ['bg-greenFill'],
    cellIndex,
  };
};

export const useThreadDecorations = (model: SheetModel, decorations: Decorations) => {
  const sheet = useMemo(() => model.sheet, [model.sheet]);
  const sheetId = useMemo(() => fullyQualifiedId(sheet), [sheet]);

  useEffect(() => {
    const unsubscribe = effect(() => {
      const activeThreadAnchors = new Set<string>();
      if (!sheet.threads) {
        return;
      }

      // Process active threads
      for (const thread of sheet.threads) {
        if (!thread || thread.anchor === undefined || thread.status === 'resolved') {
          continue;
        }

        activeThreadAnchors.add(thread.anchor);
        const index = thread.anchor;

        // Add decoration only if it doesn't already exist
        const existingDecorations = decorations.getDecorationsForCell(index);
        if (!existingDecorations || !existingDecorations.some((d) => d.type === 'comment')) {
          decorations.addDecoration(index, createThreadDecoration(index, thread.id, sheetId));
        }
      }

      // Remove decorations for resolved or deleted threads
      for (const decoration of decorations.getAllDecorations()) {
        if (decoration.type !== 'comment') {
          continue;
        }

        if (!activeThreadAnchors.has(decoration.cellIndex)) {
          decorations.removeDecoration(decoration.cellIndex, 'comment');
        }
      }
    });

    return () => unsubscribe();
  });
};
