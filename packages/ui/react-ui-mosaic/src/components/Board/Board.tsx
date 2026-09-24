//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, {
  type PropsWithChildren,
  type ReactElement,
  type Ref as ReactRef,
  forwardRef,
  useRef,
  useState,
} from 'react';

import { ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { type DndContainerHandler, useDndRootContext } from '@dxos/react-ui-dnd';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { useContainerDebug } from '../../hooks/index.ts';
import { Focus } from '../Focus/index.ts';
import { Mosaic, type MosaicPlaceholderProps, type MosaicStackProps, mosaicStyles } from '../Mosaic/index.ts';
import { BoardContextProvider, type BoardContextValue, useBoardContext } from './BoardContext.ts';
import { BoardColumn, type BoardColumnProps, DefaultBoardColumn } from './Column.tsx';
import { BoardItem, type BoardItemProps } from './Item.tsx';

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
  debug?: boolean;
  eventHandler?: DndContainerHandler<TColumn>;
  Tile?: MosaicStackProps<TColumn>['Tile'];
}>;

const BoardContentInner = composable<HTMLDivElement, BoardContentProps>(
  ({ debug, eventHandler, Tile = DefaultBoardColumn, ...props }, forwardedRef) => {
    const { model } = useBoardContext(BOARD_CONTENT_NAME);
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    const items = useAtomValue(model.columns);

    return (
      <div {...composableProps(props, { classNames: 'dx-expand' })} ref={forwardedRef}>
        <Focus.Group asChild orientation='horizontal'>
          <Mosaic.Container
            asChild
            withFocus
            orientation='horizontal'
            autoScroll={viewport}
            eventHandler={eventHandler}
            debug={debugHandler}
            placeholderDebug={debug}
          >
            <ScrollArea.Root orientation='horizontal' centered padding>
              <ScrollArea.Viewport classNames='snap-mandatory snap-x md:snap-none' ref={setViewport}>
                <Mosaic.Stack items={items} getId={model.getColumnId} Tile={Tile} debug={debug} />
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

const BoardPlaceholder = (props: MosaicPlaceholderProps<number>) => {
  return (
    <Mosaic.Placeholder {...props} classNames={mosaicStyles.placeholder.root}>
      <div
        className={mx('flex h-full border border-dashed border-separator rounded-xs', mosaicStyles.placeholder.content)}
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
  const { containers, dragging } = useDndRootContext(BOARD_DEBUG_NAME);
  const counter = useRef(0);
  return (
    <JsonHighlighter
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

export type { BoardColumnProps, BoardContentProps, BoardItemProps, BoardRootProps };
