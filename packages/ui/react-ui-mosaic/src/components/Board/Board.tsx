//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import React, { type ReactElement, type Ref as ReactRef, forwardRef, useMemo, useRef, useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Layout, ScrollArea, Tag, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { getHashStyles, mx } from '@dxos/ui-theme';

import { useContainerDebug, useEventHandlerAdapter } from '../../hooks';
import { Card, type CardMenuProps } from '../Card';
import { Focus } from '../Focus';
import { Mosaic, type MosaicTileProps, type MosiacPlaceholderProps, mosaicStyles, useMosaic } from '../Mosaic';

//
// Model
//
export interface BoardModel<TColumn extends Obj.Unknown = any, TItem extends Obj.Unknown = any> {
  isColumn: (obj: Obj.Unknown) => obj is TColumn;
  isItem: (obj: Obj.Unknown) => obj is TItem;
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

type RootProps<TColumn extends Obj.Unknown = any, TItem extends Obj.Unknown = any> = ThemedClassName<
  {
    id: string;
    columns: TColumn[]; // TODO(burdon): Move into model?
    debug?: boolean;
  } & BoardContextValue<TColumn, TItem>
>;

const RootInner = forwardRef<HTMLDivElement, RootProps>(({ classNames, id, model, columns, debug }, forwardedRef) => {
  const [DebugInfo, debugHandler] = useContainerDebug(debug);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const eventHandler = useEventHandlerAdapter({
    id,
    items: columns,
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
                <Mosaic.Stack items={columns} getId={(item) => item.id} Tile={Column} debug={debug} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
        <DebugInfo />
      </Layout.Main>
    </BoardContextProvider>
  );
});

RootInner.displayName = BOARD_ROOT_NAME;

const Root = RootInner as <TColumn extends Obj.Unknown>(
  props: RootProps<TColumn> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// Column
//

const BOARD_COLUMN_NAME = 'Board.Column';

type ColumnProps<TColumn extends Obj.Unknown> = Pick<
  MosaicTileProps<TColumn>,
  'classNames' | 'location' | 'data' | 'debug'
>;

const ColumnInner = forwardRef<HTMLDivElement, ColumnProps<Obj.Unknown>>(
  ({ classNames, location, data, debug }, forwardedRef) => {
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
          label: 'Delete',
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
            <Card.Context value={{ menuItems }}>
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
                    <Mosaic.Stack items={model.getItems(column)} getId={(data) => data.dxn.toString()} Tile={Item} />
                  </ScrollArea.Viewport>
                </ScrollArea.Root>
              </Mosaic.Container>
            </Card.Context>
            <div role='none' className='border-bs border-separator'>
              <div className='grow flex p-1 justify-center text-xs'>{model.getItems(column).length}</div>
              <DebugInfo />
            </div>
          </div>
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);

ColumnInner.displayName = BOARD_COLUMN_NAME;

const Column = ColumnInner as <TColumn extends Obj.Unknown>(
  props: ColumnProps<TColumn> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// Item
//

const BOARD_ITEM_NAME = 'Board.Item';

type ItemProps<TItem extends Obj.Unknown> = Pick<
  MosaicTileProps<Ref.Ref<TItem>>,
  'classNames' | 'location' | 'data' | 'debug'
>;

const ItemInner = forwardRef<HTMLDivElement, ItemProps<Obj.Unknown>>(
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

ItemInner.displayName = BOARD_ITEM_NAME;

const Item = ItemInner as <TItem extends Obj.Unknown>(
  props: ItemProps<TItem> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// Placeholder
//

const PLACEHOLDER_NAME = 'Board.Placeholder';

const Placeholder = (props: MosiacPlaceholderProps<number>) => {
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

Placeholder.displayName = PLACEHOLDER_NAME;

//
// Debug
//

const BOARD_DEBUG_NAME = 'Board.Debug';

export const Debug = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames }, forwardedRef) => {
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

Debug.displayName = BOARD_DEBUG_NAME;

//
// Board
//

export const Board = { Root, Column, Item, Placeholder, Debug };

export type { RootProps, ColumnProps, ItemProps };
