//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import * as Schema from 'effect/Schema';
import React, { Fragment, forwardRef, useMemo, useRef } from 'react';

import { Obj, Ref, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { ScrollArea, type SlottableClassName, Tag, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { getHashStyles, mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { Card, type CardMenuProps } from '../components/Card';
import { Focus } from '../components/Focus';
import {
  Mosaic,
  type MosaicTileProps,
  type MosiacPlaceholderProps,
  useContainerDebug,
  useMosaic,
  useMosaicContainer,
} from '../components/Mosaic/Mosaic';
import { styles } from '../components/Mosaic/styles';
import { useEventHandlerAdapter, useVisibleItems } from '../hooks';

//
// Test Data
//

export const TestItem = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Item',
    version: '0.1.0',
  }),
);

export interface TestItem extends Schema.Schema.Type<typeof TestItem> {}

export const TestColumn = Schema.Struct({
  id: ObjectId,
  items: Schema.mutable(Schema.Array(Type.Ref(TestItem))),
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Column',
    version: '0.1.0',
  }),
);

export interface TestColumn extends Schema.Schema.Type<typeof TestColumn> {}

//
// Board
//

type BoardProps = { id: string } & ColumnListProps;

export const Board = forwardRef<HTMLDivElement, BoardProps>(({ id, columns, debug }, forwardedRef) => {
  const [DebugInfo, debugHandler] = useContainerDebug(debug);
  const eventHandler = useEventHandlerAdapter({
    id,
    canDrop: ({ source }) => {
      return Obj.instanceOf(TestColumn, source.object);
    },
    items: columns,
    get: (item) => item,
    make: (object) => object,
  });

  return (
    <div
      className={mx('p-2 bs-full is-full grid overflow-hidden', debug && 'grid-cols-[1fr_25rem] gap-2')}
      ref={forwardedRef}
    >
      <Focus.Group asChild axis='horizontal'>
        <Mosaic.Container
          asChild
          autoscroll
          axis='horizontal'
          withFocus
          debug={debugHandler}
          eventHandler={eventHandler}
        >
          <ColumnList columns={columns} debug={debug} />
        </Mosaic.Container>
      </Focus.Group>
      <DebugInfo />
    </div>
  );
});

//
// ColumnList
//

type ColumnListProps = SlottableClassName<{ columns: TestColumn[]; debug?: boolean }>;

const ColumnList = forwardRef<HTMLDivElement, ColumnListProps>(
  ({ className, classNames, columns, debug, ...props }, forwardedRef) => {
    const { dragging } = useMosaicContainer(ColumnList.displayName!);
    const visibleColumns = useVisibleItems(columns, dragging?.source.data);

    return (
      <div
        role='list'
        {...props}
        className={mx('flex bs-full plb-2 overflow-x-auto', className, classNames)}
        ref={forwardedRef}
      >
        <Placeholder axis='horizontal' location={0.5} />
        {visibleColumns.map((column, i) => (
          <Fragment key={column.id}>
            <Column column={column} debug={debug} location={i + 1} object={column} />
            <Placeholder axis='horizontal' location={i + 1.5} />
          </Fragment>
        ))}
      </div>
    );
  },
);

ColumnList.displayName = 'ColumnList';

//
// Column
//

type ColumnProps = Pick<MosaicTileProps<TestColumn>, 'classNames' | 'object' | 'location'> & {
  column: TestColumn;
  debug?: boolean;
};

export const Column = forwardRef<HTMLDivElement, ColumnProps>(
  ({ classNames, column: { id, items }, debug, object, location }, forwardedRef) => {
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const dragHandleRef = useRef<HTMLButtonElement>(null);
    const eventHandler = useEventHandlerAdapter({
      id,
      canDrop: ({ source }) => {
        return Obj.instanceOf(TestItem, source.object);
      },
      items,
      get: (item) => item.target,
      make: (object) => Ref.make(object),
    });

    const menuItems = useMemo<CardMenuProps<TestItem>['items']>(
      () => [
        {
          label: 'Delete',
          onSelect: (object) => {
            const idx = items.findIndex((item) => item.target?.id === object?.id);
            if (idx !== -1) {
              items.splice(idx, 1);
            }
          },
        },
      ],
      [],
    );

    return (
      <Mosaic.Tile asChild dragHandle={dragHandleRef.current} object={object} location={location}>
        <div
          className={mx(
            'grid bs-full min-is-[20rem] max-is-[25rem] overflow-hidden',
            'bg-deckSurface', // TODO(burdon): ???
            debug && 'grid-rows-2 gap-2',
          )}
        >
          <Focus.Group ref={forwardedRef} classNames={mx('flex flex-col overflow-hidden', classNames)}>
            <Card.Toolbar>
              <Card.DragHandle ref={dragHandleRef} />
              <Card.Heading>{id}</Card.Heading>
              <Card.Menu items={[]} />
            </Card.Toolbar>
            <Mosaic.Container
              asChild
              axis='vertical'
              autoscroll
              withFocus
              debug={debugHandler}
              eventHandler={eventHandler}
            >
              <ItemList items={items.map((item: any) => item.target).filter(isTruthy)} menuItems={menuItems} />
            </Mosaic.Container>
            <div className='grow flex p-1 justify-center text-xs'>{items.length}</div>
          </Focus.Group>
          <DebugInfo />
        </div>
      </Mosaic.Tile>
    );
  },
);

Column.displayName = 'Column';

//
// ItemList
//

type ItemListProps = { items: TestItem[] } & Pick<TileProps, 'menuItems'>;

const ItemList = forwardRef<HTMLDivElement, ItemListProps>(({ items, menuItems, ...props }, forwardedRef) => {
  const { dragging } = useMosaicContainer(ItemList.displayName!);
  const visibleItems = useVisibleItems(items, dragging?.source.data);

  // TODO(burdon): WARNING: Auto scrolling has been attached to an element that appears not to be scrollable.
  return (
    <ScrollArea.Root {...props}>
      <ScrollArea.Viewport classNames='pli-3' ref={forwardedRef}>
        <Placeholder axis='vertical' location={0.5} />
        {visibleItems.map((item, i) => (
          <Fragment key={item.id}>
            <Tile location={i + 1} object={item} menuItems={menuItems} />
            <Placeholder axis='vertical' location={i + 1.5} />
          </Fragment>
        ))}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
});

ItemList.displayName = 'Container';

//
// Tile
//

type TileProps = Pick<MosaicTileProps<TestItem>, 'classNames' | 'object' | 'location'> & {
  menuItems?: CardMenuProps<TestItem>['items'];
};

const Tile = forwardRef<HTMLDivElement, TileProps>(({ classNames, object, location, menuItems }, forwardedRef) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
  const dragHandleRef = useRef<HTMLButtonElement>(null);

  return (
    <Mosaic.Tile asChild dragHandle={dragHandleRef.current} object={object} location={location}>
      <Focus.Group asChild>
        <Card.Root classNames={classNames} onClick={() => rootRef.current?.focus()} ref={composedRef}>
          <Card.Toolbar>
            <Card.DragHandle ref={dragHandleRef} />
            <Card.Heading>{object.name}</Card.Heading>
            <Card.Menu context={object} items={menuItems} />
          </Card.Toolbar>
          <Card.Section icon='ph--user--regular' classNames='text-description'>
            {object.description}
          </Card.Section>
          <Card.Section icon='ph--tag--regular'>
            {object.label && (
              <div role='none' className='flex shrink-0 gap-1 text-xs'>
                <Tag palette={getHashStyles(object.label).hue}>{object.label}</Tag>
              </div>
            )}
          </Card.Section>
        </Card.Root>
      </Focus.Group>
    </Mosaic.Tile>
  );
});

Tile.displayName = 'Tile';

//
// Placeholder
//

const Placeholder = (props: MosiacPlaceholderProps<number>) => {
  return (
    <Mosaic.Placeholder {...props} classNames={styles.placeholder.root}>
      <div
        className={mx(
          'flex bs-full bg-baseSurface border border-dashed border-separator rounded-sm',
          styles.placeholder.content,
        )}
      />
    </Mosaic.Placeholder>
  );
};

Placeholder.displayName = 'Placeholder';

//
// Debug
//

export const DebugRoot = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames }, forwardedRef) => {
  const info = useMosaic(DebugRoot.displayName!);
  return <Json data={info} classNames={mx('text-xs', classNames)} ref={forwardedRef} />;
});

DebugRoot.displayName = 'DebugRoot';
