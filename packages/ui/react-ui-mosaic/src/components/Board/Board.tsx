//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import React, { type ReactElement, type Ref as ReactRef, forwardRef, useMemo, useRef, useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Layout, ScrollArea, Tag, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { getHashStyles, mx } from '@dxos/ui-theme';

import { useContainerDebug, useEventHandlerAdapter } from '../../hooks';
import { translationKey } from '../../translations';
import { Card, type CardMenuProps } from '../Card';
import { Focus } from '../Focus';
import { Mosaic, type MosaicTileProps, type MosiacPlaceholderProps, mosaicStyles, useMosaic } from '../Mosaic';
import { type StackProps } from '../Stack';

//
// Model
//
export interface BoardModel<TColumn extends Obj.Unknown = any, TItem extends Obj.Unknown = any> {
  isColumn: (obj: Obj.Unknown) => obj is TColumn;
  isItem: (obj: Obj.Unknown) => obj is TItem;
  getColumns: () => TColumn[];
  getItems: (column: TColumn) => Ref.Ref<TItem>[];
}

//
// Context
//

const BOARD_NAME = 'Board';

type BoardContextValue<TColumn extends Obj.Unknown = any, TItem extends Obj.Unknown = any> = {
  model: BoardModel<TColumn, TItem>;
};

const [BoardContextProvider, useBoardContext] = createContext<BoardContextValue>(BOARD_NAME);

//
// Root
//

const BOARD_ROOT_NAME = 'Board.Root';

type BoardRootProps<TColumn extends Obj.Unknown = any, TItem extends Obj.Unknown = any> = ThemedClassName<
  {
    id: string;
    debug?: boolean;
    Tile?: StackProps<TColumn>['Tile'];
  } & BoardContextValue<TColumn, TItem>
>;

const BoardRootInner = forwardRef<HTMLDivElement, BoardRootProps>(
  ({ classNames, id, model, debug, Tile = BoardColumn }, forwardedRef) => {
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    const items = model.getColumns();
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
                <ScrollArea.Viewport classNames='snap-x md:snap-none' ref={setViewport}>
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

const BoardRoot = BoardRootInner as <TColumn extends Obj.Unknown>(
  props: BoardRootProps<TColumn> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// Column
// TODO(burdon): Break into parts.
//

const BOARD_COLUMN_NAME = 'Board.Column';

type BoardColumnProps<TColumn extends Obj.Unknown> = Pick<
  MosaicTileProps<TColumn>,
  'classNames' | 'location' | 'data' | 'debug'
> & {
  Tile?: StackProps<Ref.Ref<Obj.Unknown>>['Tile'];
};

const BoardColumnInner = forwardRef<HTMLDivElement, BoardColumnProps<Obj.Unknown>>(
  ({ classNames, location, data, debug, Tile = BoardItem }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { model } = useBoardContext(BOARD_COLUMN_NAME);
    const [column, updateColumn] = useObject(data);
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const dragHandleRef = useRef<HTMLButtonElement>(null);
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    const eventHandler = useEventHandlerAdapter<Ref.Unknown>({
      id: data.id,
      items: model.getItems(column),
      getId: (data) => data.dxn.toString(),
      get: (data) => data.target!,
      make: (object) => Ref.make(object),
      canDrop: ({ source }) => (source.data.target ? model.isItem(source.data.target) : false),
      onChange: (mutator) => updateColumn((column) => mutator(model.getItems(column))),
    });

    // Context menu.
    const menuItems = useMemo<NonNullable<CardMenuProps<Obj.Unknown>['items']>>(
      () => [
        {
          label: t('delete menu label'),
          onClick: (obj) => {
            updateColumn((column) => {
              const idx = model.getItems(column).findIndex((item) => item.target?.id === obj?.id);
              if (idx !== -1) {
                model.getItems(column).splice(idx, 1);
              }
            });
          },
        },
      ],
      [updateColumn],
    );

    return (
      <Mosaic.Tile
        asChild
        dragHandle={dragHandleRef.current}
        location={location}
        id={data.id}
        data={data}
        debug={debug}
      >
        {/* TODO(burdon): Factor out context. */}
        <Card.Context value={{ menuItems }}>
          <Focus.Group
            asChild
            // NOTE: Width reserves 2px for outer Focus.Group border.
            classNames='grid bs-full is-[calc(100vw-2px)] md:is-card-default-width snap-center bg-deckSurface'
          >
            <div
              className={mx(
                debug ? 'grid-rows-[min-content_1fr_20rem]' : 'grid-rows-[min-content_1fr_min-content]',
                classNames,
              )}
              ref={forwardedRef}
            >
              <Card.Toolbar classNames='border-be border-separator'>
                <Card.DragHandle ref={dragHandleRef} />
                <Card.Title>{column.id}</Card.Title>
                <Card.Menu items={[]} />
              </Card.Toolbar>
              <Mosaic.Container
                asChild
                withFocus
                orientation='vertical'
                autoScroll={viewport}
                eventHandler={eventHandler}
                debug={debugHandler}
              >
                <ScrollArea.Root orientation='vertical' thin padding>
                  <ScrollArea.Viewport classNames='snap-y md:snap-none' ref={setViewport}>
                    <Mosaic.Stack items={model.getItems(column)} getId={(data) => data.dxn.toString()} Tile={Tile} />
                  </ScrollArea.Viewport>
                </ScrollArea.Root>
              </Mosaic.Container>
              <div role='none' className='border-bs border-separator'>
                <div className='grow flex p-1 justify-center text-xs'>{model.getItems(column).length}</div>
                <DebugInfo />
              </div>
            </div>
          </Focus.Group>
        </Card.Context>
      </Mosaic.Tile>
    );
  },
);

BoardColumnInner.displayName = BOARD_COLUMN_NAME;

const BoardColumn = BoardColumnInner as <TColumn extends Obj.Unknown>(
  props: BoardColumnProps<TColumn> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// Item
//

const BOARD_ITEM_NAME = 'Board.Item';

type BoardItemProps<TItem extends Obj.Unknown> = Pick<
  MosaicTileProps<Ref.Ref<TItem>>,
  'classNames' | 'location' | 'data' | 'debug'
>;

const BoardItemInner = forwardRef<HTMLDivElement, BoardItemProps<Obj.Unknown>>(
  ({ classNames, data: ref, location, debug }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const dragHandleRef = useRef<HTMLButtonElement>(null);
    const object = ref.target;
    if (!object) {
      return null;
    }

    const label = Obj.getLabel(object);
    const description = Obj.getDescription(object);

    return (
      <Mosaic.Tile
        asChild
        dragHandle={dragHandleRef.current}
        id={ref.dxn.toString()}
        data={ref}
        location={location}
        debug={debug}
      >
        <Focus.Group asChild>
          <Card.Root classNames={classNames} onClick={() => rootRef.current?.focus()} ref={composedRef}>
            <Card.Toolbar>
              <Card.DragHandle ref={dragHandleRef} />
              <Card.Title>{label}</Card.Title>
              <Card.Menu context={object} />
            </Card.Toolbar>
            <Card.Row icon='ph--note--regular' classNames='text-description'>
              {description}
            </Card.Row>
            <Card.Row icon='ph--tag--regular'>
              {label && (
                <div role='none' className='flex shrink-0 gap-1 text-xs items-center'>
                  <Tag palette={getHashStyles(label).hue}>{label}</Tag>
                </div>
              )}
            </Card.Row>
          </Card.Root>
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);

BoardItemInner.displayName = BOARD_ITEM_NAME;

const BoardItem = BoardItemInner as <TItem extends Obj.Unknown>(
  props: BoardItemProps<TItem> & { ref?: ReactRef<HTMLDivElement> },
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
  Column: BoardColumn,
  Item: BoardItem,
  Placeholder: BoardPlaceholder,
  Debug: BoardDebug,
};

export type { BoardRootProps, BoardColumnProps, BoardItemProps };
