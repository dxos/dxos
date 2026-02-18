//
// Copyright 2023 DXOS.org
//

import { type Atom, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type ReactElement, type Ref as ReactRef, forwardRef, useRef, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { Layout, ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { useContainerDebug, useEventHandlerAdapter } from '../../hooks';
import { Focus } from '../Focus';
import { Mosaic, type MosaicPlaceholderProps, mosaicStyles, useMosaic } from '../Mosaic';
import { type MosaicStackProps } from '../Stack';

import { BoardColumn, type BoardColumnProps, DefaultBoardColumn } from './Column';
import { BoardItem, type BoardItemProps } from './Item';

//
// Model
//

export interface BoardModel<TColumn extends Obj.Unknown = Obj.Unknown, TItem extends Obj.Unknown = Obj.Unknown> {
  isColumn: (obj: Obj.Unknown) => obj is TColumn;
  isItem: (obj: Obj.Unknown) => obj is TItem;
  columns: Atom.Atom<TColumn[]>;
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

type BoardContextValue<TColumn extends Obj.Unknown = Obj.Unknown, TItem extends Obj.Unknown = Obj.Unknown> = {
  model: BoardModel<TColumn, TItem>;
};

/**
 * @internal
 */
export const [BoardContextProvider, useBoardContext] = createContext<BoardContextValue>(BOARD_NAME);

//
// Root
//

const BOARD_ROOT_NAME = 'Board.Root';

type BoardRootProps<
  TColumn extends Obj.Unknown = Obj.Unknown,
  TItem extends Obj.Unknown = Obj.Unknown,
> = ThemedClassName<
  {
    id: string;
    debug?: boolean;
    Tile?: MosaicStackProps<TColumn>['Tile'];
  } & BoardContextValue<TColumn, TItem>
>;

const BoardRootInner = forwardRef<HTMLDivElement, BoardRootProps>(
  ({ classNames, id, model, debug, Tile = DefaultBoardColumn }, forwardedRef) => {
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    const items = useAtomValue(model.columns);
    const eventHandler = useEventHandlerAdapter({
      id,
      items,
      getId: (data) => data.id,
      get: (data) => data,
      make: (object) => object,
      canDrop: ({ source }) => model.isColumn(source.data),
    });

    return (
      <BoardContextProvider model={model}>
        <Layout.Main ref={forwardedRef} classNames={mx('border-red-500', classNames)}>
          <Focus.Group asChild orientation='horizontal'>
            <Mosaic.Container
              asChild
              withFocus
              orientation='horizontal'
              autoScroll={viewport}
              eventHandler={eventHandler}
              debug={debugHandler}
            >
              <ScrollArea.Root orientation='horizontal' classNames='md:pbs-3' padding>
                <ScrollArea.Viewport classNames='snap-mandatory snap-x md:snap-none' ref={setViewport}>
                  <Mosaic.Stack items={items} getId={(item) => item.id} Tile={Tile} debug={debug} />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          </Focus.Group>
          <DebugInfo />
        </Layout.Main>
      </BoardContextProvider>
    );
  },
);

BoardRootInner.displayName = BOARD_ROOT_NAME;

const BoardRoot = BoardRootInner as <TColumn extends Obj.Unknown, TItem extends Obj.Unknown = Obj.Unknown>(
  props: BoardRootProps<TColumn, TItem> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// Placeholder
//

const BOARD_PLACEHOLDER_NAME = 'Board.Placeholder';

const BoardPlaceholder = (props: MosaicPlaceholderProps<number>) => {
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
  Column: BoardColumn,
  Item: BoardItem,
  Placeholder: BoardPlaceholder,
  Debug: BoardDebug,
};

export type { BoardRootProps, BoardColumnProps, BoardItemProps };
