//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import * as Schema from 'effect/Schema';
import React, { forwardRef, useMemo, useRef } from 'react';

import { Obj, Ref, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { useObject } from '@dxos/react-client/echo';
import { Tag, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { getHashStyles, mx } from '@dxos/ui-theme';

import {
  Card,
  type CardMenuProps,
  Focus,
  Mosaic,
  type MosaicTileProps,
  type MosiacPlaceholderProps,
  mosaicStyles,
  useContainerDebug,
  useMosaic,
} from '../components';
import { useEventHandlerAdapter } from '../hooks';

//
// Test Data
//

export const TestItem = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'example.com/type/Item',
    version: '0.1.0',
  }),
);

export interface TestItem extends Schema.Schema.Type<typeof TestItem> {}

export const TestColumn = Schema.Struct({
  id: ObjectId,
  items: Schema.mutable(Schema.Array(Type.Ref(TestItem))),
}).pipe(
  Type.object({
    typename: 'example.com/type/Column',
    version: '0.1.0',
  }),
);

export interface TestColumn extends Schema.Schema.Type<typeof TestColumn> {}

//
// Board
//

type BoardProps = { id: string; columns: TestColumn[]; debug?: boolean };

export const Board = forwardRef<HTMLDivElement, BoardProps>(({ id, columns, debug }, forwardedRef) => {
  const [DebugInfo, debugHandler] = useContainerDebug(debug);
  const viewportRef = useRef<HTMLElement | null>(null);

  const eventHandler = useEventHandlerAdapter({
    id,
    items: columns,
    getId: (data) => data.id,
    get: (data) => data,
    make: (object) => object,
    canDrop: ({ source }) => Obj.instanceOf(TestColumn, source.data),
  });

  return (
    <div
      role='none'
      className={mx('p-2 grid bs-full is-full overflow-hidden', debug && 'grid-cols-[1fr_20rem] gap-2')}
      ref={forwardedRef}
    >
      <Focus.Group asChild axis='horizontal'>
        <Mosaic.Container
          asChild
          axis='horizontal'
          withFocus
          autoScroll={viewportRef.current}
          eventHandler={eventHandler}
          debug={debugHandler}
        >
          <Mosaic.Viewport options={{ overflow: { x: 'scroll' } }} viewportRef={viewportRef}>
            <Mosaic.Stack
              axis='horizontal'
              className='plb-3'
              items={columns}
              getId={(item) => item.id}
              Tile={Column}
              debug={debug}
            />
          </Mosaic.Viewport>
        </Mosaic.Container>
      </Focus.Group>
      <DebugInfo />
    </div>
  );
});

//
// Column
//

type ColumnProps = Pick<MosaicTileProps<TestColumn>, 'classNames' | 'location' | 'data' | 'debug'>;

export const Column = forwardRef<HTMLDivElement, ColumnProps>(({ classNames, location, data, debug }, forwardedRef) => {
  const [column, updateColumn] = useObject(data);
  const [DebugInfo, debugHandler] = useContainerDebug(debug);
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const eventHandler = useEventHandlerAdapter<Ref.Unknown>({
    id: data.id,
    items: column.items,
    getId: (data) => data.dxn.toString(),
    get: (data) => data.target!,
    make: (object) => Ref.make(object),
    canDrop: ({ source }) => Obj.instanceOf(TestItem, source.data.target),
    onChange: (mutator) => updateColumn((column) => mutator(column.items)),
  });

  // Context menu.
  const menuItems = useMemo<NonNullable<CardMenuProps<TestItem>['items']>>(
    () => [
      {
        label: 'Delete',
        onClick: (obj) => {
          updateColumn((column) => {
            const idx = column.items.findIndex((item) => item.target?.id === obj?.id);
            if (idx !== -1) {
              column.items.splice(idx, 1);
            }
          });
        },
      },
    ],
    [updateColumn],
  );

  return (
    <Mosaic.Tile asChild dragHandle={dragHandleRef.current} location={location} id={data.id} data={data} debug={debug}>
      <Focus.Group asChild>
        <div
          className={mx(
            'grid bs-full is-[--dx-cardDefaultWidth] overflow-hidden bg-deckSurface',
            debug ? 'grid-rows-[min-content_1fr_20rem]' : 'grid-rows-[min-content_1fr_min-content]',
            classNames,
          )}
          ref={forwardedRef}
        >
          <Card.Toolbar>
            <Card.DragHandle ref={dragHandleRef} />
            <Card.Title>{column.id}</Card.Title>
            <Card.Menu items={[]} />
          </Card.Toolbar>
          {/* TODO(burdon): See deprecation warning. */}
          <Card.Context value={{ menuItems }}>
            <Mosaic.Container
              asChild
              axis='vertical'
              withFocus
              autoScroll={viewportRef.current}
              eventHandler={eventHandler}
              debug={debugHandler}
            >
              <Mosaic.Viewport options={{ overflow: { y: 'scroll' } }} viewportRef={viewportRef}>
                <Mosaic.Stack
                  axis='vertical'
                  className='pli-3'
                  items={column.items}
                  getId={(data) => data.dxn.toString()}
                  Tile={Item}
                />
              </Mosaic.Viewport>
            </Mosaic.Container>
          </Card.Context>
          <div>
            <div className='grow flex p-1 justify-center text-xs'>{column.items.length}</div>
            <DebugInfo />
          </div>
        </div>
      </Focus.Group>
    </Mosaic.Tile>
  );
});

Column.displayName = 'Column';

//
// Item
//

type ItemProps = Pick<MosaicTileProps<Ref.Ref<TestItem>>, 'classNames' | 'data' | 'location'> & {
  menuItems?: CardMenuProps<TestItem>['items'];
};

const Item = forwardRef<HTMLDivElement, ItemProps>(({ classNames, data: ref, location, menuItems }, forwardedRef) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const object = ref.target;
  if (!object) {
    return null;
  }

  return (
    <Mosaic.Tile asChild dragHandle={dragHandleRef.current} id={ref.dxn.toString()} data={ref} location={location}>
      <Focus.Group asChild>
        <Card.Root classNames={classNames} onClick={() => rootRef.current?.focus()} ref={composedRef}>
          <Card.Toolbar>
            <Card.DragHandle ref={dragHandleRef} />
            <Card.Title>{object.name}</Card.Title>
            <Card.Menu context={object} items={menuItems} />
          </Card.Toolbar>
          <Card.Row icon='ph--note--regular' classNames='text-description'>
            {object.description}
          </Card.Row>
          <Card.Row icon='ph--tag--regular'>
            {object.label && (
              <div role='none' className='flex shrink-0 gap-1 text-xs items-center'>
                <Tag palette={getHashStyles(object.label).hue}>{object.label}</Tag>
              </div>
            )}
          </Card.Row>
        </Card.Root>
      </Focus.Group>
    </Mosaic.Tile>
  );
});

Item.displayName = 'Tile';

//
// Placeholder
//

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

Placeholder.displayName = 'Placeholder';

//
// Debug
//

export const DebugRoot = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames }, forwardedRef) => {
  const { containers, dragging } = useMosaic(DebugRoot.displayName!);
  const counter = useRef(0);
  return (
    <Json
      data={{ containers, dragging, count: counter.current++ }}
      classNames={mx('text-xs', classNames)}
      ref={forwardedRef}
    />
  );
});

DebugRoot.displayName = 'DebugRoot';
