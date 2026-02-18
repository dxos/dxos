//
// Copyright 2023 DXOS.org
//

import { type Atom, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  type ReactElement,
  type Ref as ReactRef,
  forwardRef,
  useRef,
  useState,
} from 'react';

import { ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { useContainerDebug } from '../../hooks';
import { Focus } from '../Focus';
import {
  type GetId,
  Mosaic,
  type MosaicEventHandler,
  type MosiacPlaceholderProps,
  mosaicStyles,
  useMosaic,
} from '../Mosaic';
import { type StackProps } from '../Stack';

import { BoardColumn, type BoardColumnProps, DefaultBoardColumn } from './Column';
import { BoardItem, type BoardItemProps } from './Item';

//
// Model
//

export interface BoardModel<TColumn = any, TItem = any> {
  getId: GetId<TColumn | TItem>;
  isColumn: (obj: unknown) => obj is TColumn;
  isItem: (obj: unknown) => obj is TItem;
  columns: Atom.Atom<readonly TColumn[] | TColumn[]>;
  items: (column: TColumn) => Atom.Atom<TItem[]>;
  getColumns: () => TColumn[];
  getItems: (column: TColumn) => TItem[];
  onColumnDelete?: (column: TColumn) => void;
  onColumnCreate?: () => Promise<TColumn>;
  onItemDelete?: (column: TColumn, item: TItem) => void;
  onItemCreate?: (column: TColumn) => Promise<TItem>;
}

//
// Context
//

const BOARD_NAME = 'Board';

type BoardContextValue<TColumn = any, TItem = any> = {
  model: BoardModel<TColumn, TItem>;
};

const [BoardContextProvider, useBoardContext] = createContext<BoardContextValue>(BOARD_NAME);

/** Hook to read the board model from context (e.g. in custom column tiles). Pass TColumn and TItem for typed model. */
function useBoard<TColumn = any, TItem = any>(displayName?: string): BoardContextValue<TColumn, TItem> {
  return useBoardContext(displayName ?? BOARD_NAME) as BoardContextValue<TColumn, TItem>;
}

//
// Root
//

const BOARD_ROOT_NAME = 'Board.Root';

type BoardRootProps<TColumn = any, TItem = any> = PropsWithChildren<BoardContextValue<TColumn, TItem>>;

const BoardRootInner = ({ model, children }: BoardRootProps) => {
  return <BoardContextProvider model={model}>{children}</BoardContextProvider>;
};

BoardRootInner.displayName = BOARD_ROOT_NAME;

const BoardRoot = BoardRootInner as <TColumn = any, TItem = any>(props: BoardRootProps<TColumn, TItem>) => ReactElement;

//
// Content
//

const BOARD_CONTENT_NAME = 'Board.Content';

type BoardContentProps<TColumn = any> = ThemedClassName<{
  id: string;
  debug?: boolean;
  eventHandler?: MosaicEventHandler<TColumn>;
  Tile?: StackProps<TColumn>['Tile'];
}>;

const BoardContentInner = forwardRef<HTMLDivElement, BoardContentProps>(
  ({ classNames, id: _id, debug, eventHandler, Tile = DefaultBoardColumn }, forwardedRef) => {
    const { model } = useBoardContext(BOARD_CONTENT_NAME);
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    const items = useAtomValue(model.columns);

    return (
      <div ref={forwardedRef} className={mx('flex bs-full is-full overflow-hidden', classNames)}>
        <Focus.Group asChild orientation='horizontal'>
          <Mosaic.Container
            asChild
            withFocus
            orientation='horizontal'
            autoScroll={viewport}
            eventHandler={eventHandler}
            debug={debugHandler}
          >
            <ScrollArea.Root orientation='horizontal' classNames='md:pbs-3' margin padding>
              <ScrollArea.Viewport classNames='snap-mandatory snap-x md:snap-none' ref={setViewport}>
                <Mosaic.Stack items={items} getId={model.getId} Tile={Tile} debug={debug} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
        <DebugInfo />
      </div>
    );
  },
);

BoardContentInner.displayName = BOARD_CONTENT_NAME;

const BoardContent = BoardContentInner as <TColumn = any>(
  props: BoardContentProps<TColumn> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// Placeholder
//

const BOARD_PLACEHOLDER_NAME = 'Board.Placeholder';

const BoardPlaceholder = (props: MosiacPlaceholderProps<number>) => {
  return (
    <Mosaic.Placeholder {...props} classNames={mosaicStyles.placeholder.root}>
      <div
        className={mx(
          'flex bs-full border border-dashed border-separator rounded-sm',
          mosaicStyles.placeholder.content,
        )}
      />
    </Mosaic.Placeholder>
  );
};

BoardPlaceholder.displayName = BOARD_PLACEHOLDER_NAME;

//
// Debug
//

const BOARD_DEBUG_NAME = 'Board.Debug';

export const BoardDebug = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames }, forwardedRef) => {
  const { containers, dragging } = useMosaic(BOARD_DEBUG_NAME);
  const counter = useRef(0);
  return (
    <Json
      data={{ containers, dragging, count: counter.current++ }}
      classNames={mx('text-xs', classNames)}
      ref={forwardedRef}
    />
  );
});

BoardDebug.displayName = BOARD_DEBUG_NAME;

//
// Board
//

export const Board = {
  Root: BoardRoot,
  Content: BoardContent,
  Column: BoardColumn,
  Item: BoardItem,
  Placeholder: BoardPlaceholder,
  Debug: BoardDebug,
};

export { useBoard };
export type { BoardRootProps, BoardContentProps, BoardColumnProps, BoardItemProps };
