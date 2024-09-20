//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { useEffect } from 'react';

import { LayoutAction, useIntentDispatcher, useIntentResolver } from '@dxos/app-framework';
import { Icon } from '@dxos/react-ui';
import { nonNullable } from '@dxos/util';

import { Anchor } from './anchor';
import { type Decoration } from './decorations';
import { useSheetContext } from './sheet-context';
import { SHEET_PLUGIN } from '../../meta';
import { type CellAddress, closest } from '../../model';

const CommentWrapper: React.FC<{ threadId: string; children: React.ReactNode }> = ({ threadId, children }) => {
  const dispatch = useIntentDispatcher();
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = React.useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    void dispatch({ action: LayoutAction.SET_LAYOUT, data: { element: 'complementary', state: true } });
  }, []);

  return (
    <div
      role='none'
      className='relative h-full'
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
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

const createThreadDecoration = (cellAddress: CellAddress, threadId: string): Decoration => {
  return {
    type: 'comment',
    cellAddress,
    decorate: (props) => <CommentWrapper threadId={threadId} {...props} />,
    classNames: ['bg-green-200'],
  };
};

const useUpdateCursorOnThreadSelection = () => {
  const { setCursor } = useSheetContext();

  // Focus the cell. Based on thread selection.
  useIntentResolver(SHEET_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.SCROLL_INTO_VIEW: {
        if (data?.id && data?.cursor) {
          const cellAddress = Anchor.toCellAddress(data.cursor);

          // TODO(Zan): Scroll helper? (Ask Rich).
          setCursor(cellAddress);
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

  useEffect(() => {
    if (!cursor) {
      return;
    }

    const activeThreadAnchors = threads
      .filter((thread) => thread && thread.anchor && thread.status !== 'resolved')
      .filter(nonNullable)
      .filter((thread) => thread.anchor !== undefined)
      .map((thread) => Anchor.toCellAddress(thread.anchor!));

    const closestThreadAnchor = closest(cursor, activeThreadAnchors);

    if (closestThreadAnchor) {
      const closestThread = threads.find(
        (thread) => thread && thread.anchor === Anchor.ofCellAddress(closestThreadAnchor),
      );

      if (closestThread) {
        // TODO(Zan): Don't hardcode action string
        void dispatch([{ action: 'dxos.org/plugin/thread/action/select', data: { current: closestThread.id } }]);
      }
    }
  }, [cursor, threads, dispatch]);
};

const useDecorateThreads = () => {
  const { decorations, model } = useSheetContext();
  const sheet = model.sheet;

  useEffect(() => {
    const unsubscribe = effect(() => {
      const activeThreadAnchors = new Set<string>();

      // Process active threads
      for (const thread of sheet.threads) {
        if (!thread || !thread.anchor || thread.status === 'resolved') {
          continue;
        }

        const cellAddress = Anchor.toCellAddress(thread.anchor);
        const key = Anchor.ofCellAddress(cellAddress);
        activeThreadAnchors.add(key);

        // Add decoration only if it doesn't already exist
        const existingDecorations = decorations.getDecorationsForCell(cellAddress);
        if (!existingDecorations || !existingDecorations.some((d) => d.type === 'comment')) {
          decorations.addDecoration(cellAddress, createThreadDecoration(cellAddress, thread.id));
        }
      }

      // Remove decorations for resolved or deleted threads
      for (const decoration of decorations.getAllDecorations()) {
        if (decoration.type !== 'comment') {
          continue;
        }

        const cellAddress = decoration.cellAddress;
        const key = Anchor.ofCellAddress(cellAddress);

        if (!activeThreadAnchors.has(key)) {
          decorations.removeDecoration(cellAddress, 'comment');
        }
      }
    });
    return () => unsubscribe();
  });
};

export const useThreads = () => {
  useUpdateCursorOnThreadSelection();
  useSelectThreadOnCursorChange();
  useDecorateThreads();
};
