//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { MouseEvent, type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { type IntentResolver, LayoutAction, useIntentDispatcher, useIntentResolver } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Icon, useTranslation } from '@dxos/react-ui';

import { type Decoration } from './decorations';
import { useSheetContext } from './sheet-context';
import { addressFromIndex, addressToIndex, type CellAddress, closest } from '../../defs';
import { SHEET_PLUGIN } from '../../meta';

// TODO(burdon): Move into folder; split hooks.

const CommentIndicator = () => {
  return (
    <div
      role='none'
      className='absolute top-0 right-0 w-0 h-0 border-t-8 border-l-8 border-t-cmCommentSurface border-l-transparent'
    />
  );
};

const ThreadedCellWrapper = ({ children }: PropsWithChildren) => {
  const dispatch = useIntentDispatcher();
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation(SHEET_PLUGIN);

  const handleClick = useCallback(
    (_event: MouseEvent) => {
      void dispatch({ action: LayoutAction.SET_LAYOUT, data: { element: 'complementary', state: true } });
    },
    [dispatch],
  );

  return (
    <div
      role='none'
      className='relative h-full is-full'
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <CommentIndicator />
      {isHovered && (
        <div className='absolute inset-0 flex items-center justify-end pr-1'>
          <button
            className='ch-button text-xs min-bs-0 p-1'
            onClick={handleClick}
            aria-label={t('open comment for sheet cell')}
          >
            <Icon icon='ph--chat--regular' aria-hidden={true} />
          </button>
        </div>
      )}
      {children}
    </div>
  );
};

const createThreadDecoration = (cellIndex: string, threadId: string, sheetId: string): Decoration => {
  return {
    type: 'comment',
    cellIndex,
    decorate: (props) => <ThreadedCellWrapper {...props} />,
  };
};

// TODO(burdon): Factor out hooks.

const useUpdateCursorOnThreadSelection = () => {
  const { setCursor, model } = useSheetContext();

  const handleScrollIntoView: IntentResolver = useCallback(
    ({ action, data }) => {
      switch (action) {
        case LayoutAction.SCROLL_INTO_VIEW: {
          if (!data?.id || data?.cursor === undefined || data?.id !== fullyQualifiedId(model.sheet)) {
            return;
          }

          // TODO(Zan): Everywhere we refer to the cursor in a thread context should change to `anchor`.
          const cellAddress = addressFromIndex(model.sheet, data.cursor);
          setCursor(cellAddress);
        }
      }
    },
    [model.sheet, setCursor],
  );

  useIntentResolver(SHEET_PLUGIN, handleScrollIntoView);
};

const useSelectThreadOnCursorChange = () => {
  const { cursor, model } = useSheetContext();
  const dispatch = useIntentDispatcher();

  const activeThreads = useMemo(
    () =>
      model.sheet.threads?.filter(
        (thread): thread is NonNullable<typeof thread> => !!thread && thread.status === 'active',
      ) ?? [],
    [JSON.stringify(model.sheet.threads)],
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
    return debounce((cursor: CellAddress) => requestAnimationFrame(() => selectClosestThread(cursor)), 50);
  }, [selectClosestThread]);

  useEffect(() => {
    if (!cursor) {
      return;
    }
    debounced(cursor);
  }, [cursor, selectClosestThread]);
};

const useThreadDecorations = () => {
  const { decorations, model } = useSheetContext();
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

export const useThreads = () => {
  useUpdateCursorOnThreadSelection();
  useSelectThreadOnCursorChange();
  useThreadDecorations();
};
