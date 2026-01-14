//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import * as Schema from 'effect/Schema';
import React, { forwardRef, useMemo, useRef, useState } from 'react';

import { Obj, Ref, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { Tag, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { getHashStyles, mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

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

type BoardProps = { id: string; columns: TestColumn[]; debug?: boolean };

export const Board = forwardRef<HTMLDivElement, BoardProps>(({ id, columns, debug }, forwardedRef) => {
  const [DebugInfo, debugHandler] = useContainerDebug(debug);
  const [scrollViewport, setViewportElement] = useState<HTMLElement | null>(null);

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
      role='none'
      className={mx('p-2 grid bs-full is-full overflow-hidden', debug && 'grid-cols-[1fr_20rem] gap-2')}
      ref={forwardedRef}
    >
      <Focus.Group asChild axis='horizontal'>
        <Mosaic.Container
          asChild
          axis='horizontal'
          withFocus
          autoScroll={scrollViewport}
          eventHandler={eventHandler}
          debug={debugHandler}
        >
          <Mosaic.Viewport
            options={{
              overflow: { x: 'scroll' },
              scrollbars: {
                autoHide: 'leave',
                autoHideDelay: 1_000,
                autoHideSuspend: true,
              },
            }}
            onViewportReady={setViewportElement}
          >
            <Mosaic.Stack axis='horizontal' className='plb-3' items={columns} Component={Column} />
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

type ColumnProps = Pick<MosaicTileProps<TestColumn>, 'classNames' | 'object' | 'location'> & {
  debug?: boolean;
};

export const Column = forwardRef<HTMLDivElement, ColumnProps>(
  ({ classNames, object, debug, location }, forwardedRef) => {
    const { id, items } = object;
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const dragHandleRef = useRef<HTMLButtonElement>(null);
    const [scrollViewport, setViewportElement] = useState<HTMLElement | null>(null);
    const eventHandler = useEventHandlerAdapter({
      id,
      canDrop: ({ source }) => {
        return Obj.instanceOf(TestItem, source.object);
      },
      items,
      get: (item) => item.target,
      make: (object) => Ref.make(object),
    });

    // TODO(burdon): Context.
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
      [items],
    );

    return (
      <Mosaic.Tile asChild dragHandle={dragHandleRef.current} object={object} location={location}>
        <Focus.Group asChild>
          <div
            className={mx(
              'grid bs-full is-min-[20rem] is-max-[20rem] overflow-hidden bg-deckSurface',
              debug ? 'grid-rows-[min-content_1fr_20rem]' : 'grid-rows-[min-content_1fr_min-content]',
              classNames,
            )}
            // TODO(burdon): Class for widths.
            style={{
              width: '25rem', //'var(--dx-cardDefaultWidth)px',
            }}
            ref={forwardedRef}
          >
            <Card.Toolbar>
              <Card.DragHandle ref={dragHandleRef} />
              <Card.Heading>{id}</Card.Heading>
              <Card.Menu items={[]} />
            </Card.Toolbar>
            <Mosaic.Container
              asChild
              axis='vertical'
              withFocus
              autoScroll={scrollViewport}
              eventHandler={eventHandler}
              debug={debugHandler}
            >
              <Mosaic.Viewport options={{ overflow: { y: 'scroll' } }} onViewportReady={setViewportElement}>
                <Mosaic.Stack
                  axis='vertical'
                  className='pli-3'
                  items={items.map((item: any) => item.target).filter(isTruthy)}
                  Component={Tile}
                />
              </Mosaic.Viewport>
            </Mosaic.Container>
            <div>
              <div className='grow flex p-1 justify-center text-xs'>{items.length}</div>
              <DebugInfo />
            </div>
          </div>
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);

Column.displayName = 'Column';

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
          <Card.Section icon='ph--note--regular' classNames='text-description'>
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
    <Mosaic.Placeholder {...props} classNames={mosaicStyles.placeholder.root}>
      <div
        className={mx(
          'flex bs-full bg-baseSurface border border-dashed border-separator rounded-sm',
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
