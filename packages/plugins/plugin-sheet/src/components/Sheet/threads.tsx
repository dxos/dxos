//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { useEffect, useMemo } from 'react';

import { LayoutAction, useIntentDispatcher, useIntentResolver } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Decoration } from './decorations';
import { useSheetContext } from './sheet-context';
import { SHEET_PLUGIN } from '../../meta';
import { addressFromIndex, addressToIndex, closest } from '../../model';

/**
 * A deep signal representing the currently selected thread for each sheet.
 * The keys are fully qualified sheet IDs, and the values are thread IDs.
 */
const currentThreadForSheet = create<Record<string, string>>({});

const CommentIndicator = () => {
  return (
    <div className='absolute top-0 right-0 w-0 h-0 border-t-8 border-l-8 border-t-cmCommentSurface border-l-transparent'></div>
  );
};

const CommentWrapper: React.FC<{ sheetId: string; threadId: string; children: React.ReactNode }> = ({
  sheetId,
  threadId,
  children,
}) => {
  const dispatch = useIntentDispatcher();
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = React.useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    void dispatch({ action: LayoutAction.SET_LAYOUT, data: { element: 'complementary', state: true } });
  }, []);

  const isCurrentThread = currentThreadForSheet[sheetId] === threadId;

  return (
    <div
      role='none'
      className={mx('relative h-full is-full', isCurrentThread && 'underline')}
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
            className='text-xs p-1 text-white rounded bg-neutral-500 hover:bg-neutral-600 active:bg-neutral-700 transition-opacity'
            onClick={handleClick}
          >
            <Icon icon='ph--chat--regular' />
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
    decorate: (props) => <CommentWrapper threadId={threadId} sheetId={sheetId} {...props} />,
  };
};

const useUpdateCursorOnThreadSelection = () => {
  const { setCursor, model } = useSheetContext();

  useIntentResolver(SHEET_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.SCROLL_INTO_VIEW: {
        if (data?.id && data?.cursor) {
          // TODO(Zan): Everywhere we refer to the cursor in a thread context should change to `anchor`.
          const cellAddress = addressFromIndex(model.sheet, data.cursor);
          const sheetId = fullyQualifiedId(model.sheet);

          setCursor(cellAddress);
          currentThreadForSheet[sheetId] = data.id;
          return { data: true };
        }
        break;
      }
    }
  });
};

const useSelectThreadOnCursorChange = () => {
  const { cursor, model } = useSheetContext();
  const dispatch = useIntentDispatcher();
  const threads = model.sheet.threads;
  const sheetId = fullyQualifiedId(model.sheet);

  useEffect(() => {
    if (!cursor || !threads) {
      return;
    }

    const activeThreads = threads.filter(
      (thread): thread is NonNullable<typeof thread> => !!thread && thread.status === 'active',
    );

    const activeThreadAddresses = activeThreads
      .map((thread) => thread.anchor)
      .filter((anchor) => anchor !== undefined)
      .map((anchor) => addressFromIndex(model.sheet, anchor));

    const closestThreadAnchor = closest(cursor, activeThreadAddresses);
    if (closestThreadAnchor) {
      const closestThread = activeThreads.find(
        (thread) => thread && thread.anchor === addressToIndex(model.sheet, closestThreadAnchor),
      );
      if (closestThread) {
        const isExactMatch = closestThreadAnchor.column === cursor.column && closestThreadAnchor.row === cursor.row;
        if (isExactMatch) {
          currentThreadForSheet[sheetId] = closestThread.id;
        } else {
          delete currentThreadForSheet[sheetId];
        }

        void dispatch([{ action: 'dxos.org/plugin/thread/action/select', data: { current: closestThread.id } }]);
      }
    }
  }, [cursor, threads, dispatch, model.sheet]);
};

const useThreadDecorations = () => {
  const { decorations, model } = useSheetContext();
  const sheet = model.sheet;
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
