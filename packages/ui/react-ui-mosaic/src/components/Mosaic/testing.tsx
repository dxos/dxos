//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import * as Schema from 'effect/Schema';
import React, { Fragment, forwardRef, useMemo, useRef, useState } from 'react';

import { Ref, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ScrollArea, Tag, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { getHashStyles, mx } from '@dxos/ui-theme';
import { arrayMove, isTruthy } from '@dxos/util';

import { Card, type CardMenuProps } from '../Card';
import { Focus } from '../Focus';

import {
  Mosaic,
  type MosaicTileProps,
  type MosiacPlaceholderProps,
  useContainerDebug,
  useMosaic,
  useMosaicContainer,
} from './Mosaic';
import { styles } from './styles';

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

type BoardProps = { columns: TestColumn[]; debug?: boolean };

export const Board = forwardRef<HTMLDivElement, BoardProps>(({ columns, debug }, forwardedRef) => {
  const [DebugInfo, debugHandler] = useContainerDebug(debug);

  return (
    <div className={mx('p-2 bs-full is-full grid overflow-hidden', debug && 'grid-cols-[1fr_25rem] gap-2')}>
      <Focus.Group asChild axis='horizontal'>
        <Mosaic.Container
          asChild
          autoscroll
          axis='horizontal'
          withFocus
          debug={debugHandler}
          handler={{
            id: 'board',
            canDrop: () => true,
          }}
        >
          <div role='list' className='flex bs-full plb-2 overflow-x-auto'>
            <Placeholder axis='horizontal' location={0.5} />
            {columns.map((column, i) => (
              <Fragment key={column.id}>
                <Column column={column} debug={debug} />
                <Placeholder axis='horizontal' location={i + 1.5} />
              </Fragment>
            ))}
          </div>
        </Mosaic.Container>
      </Focus.Group>
      <DebugInfo />
    </div>
  );
});

//
// ColumnList
//

//
// Column
//

type ColumnProps = { column: TestColumn; debug?: boolean };

export const Column = forwardRef<HTMLDivElement, ColumnProps>(({ column: { id, items }, debug }, forwardedRef) => {
  const [DebugInfo, debugHandler] = useContainerDebug(debug);

  return (
    <div className={mx('grid bs-full min-is-[20rem] max-is-[25rem] overflow-hidden', debug && 'grid-rows-2 gap-2')}>
      <Focus.Group ref={forwardedRef} classNames='flex flex-col overflow-hidden'>
        <Card.Toolbar>
          <Card.DragHandle />
          <Card.Heading>{id}</Card.Heading>
          <Card.Menu items={[]} />
        </Card.Toolbar>

        <Mosaic.Container
          asChild
          axis='vertical'
          autoscroll
          withFocus
          debug={debugHandler}
          handler={{
            id,
            canDrop: () => true,
            onTake: ({ source }, cb) => {
              log.info('onTake', { source });
              const from = items.findIndex((item) => item.target?.id === source.object.id);
              if (from !== -1) {
                items.splice(from, 1);
              }
              void cb(source.object);
            },
            onDrop: ({ source, target }) => {
              const from = items.findIndex((item) => item.target?.id === source.object.id);
              const to = target?.type === 'tile' || target?.type === 'placeholder' ? target.location : -1;
              log.info('onDrop', { source, target, from, to });
              if (to !== -1) {
                if (from !== -1) {
                  arrayMove(items, from, to);
                } else {
                  const ref = Ref.make(source.object);
                  items.splice(to, 0, ref as any); // TODO(burdon): Remove cast?
                }
              }
            },
          }}
        >
          <ItemList
            items={items.map((item: any) => item.target).filter(isTruthy)}
            menuItems={[
              {
                label: 'Delete',
                onSelect: (object) => {
                  const idx = items.findIndex((item) => item.target?.id === object?.id);
                  if (idx !== -1) {
                    items.splice(idx, 1);
                  }
                },
              },
            ]}
          />
        </Mosaic.Container>
        <div className='grow flex p-1 justify-center text-xs'>{items.length}</div>
      </Focus.Group>
      <DebugInfo />
    </div>
  );
});

Column.displayName = 'Column';

//
// ItemList
//

type ItemListProps = { items: TestItem[] } & Pick<TileProps, 'menuItems'>;

const ItemList = forwardRef<HTMLDivElement, ItemListProps>(({ items, menuItems, ...props }, forwardedRef) => {
  const { dragging } = useMosaicContainer(ItemList.displayName!);

  // TODO(burdon): Factor out.
  const visibleItems = useMemo(() => {
    if (!dragging) {
      return items;
    }

    const current = items.findIndex((item) => item.id === dragging.source.data.object.id);
    const newItems = items.slice();
    newItems.splice(current, 1);
    return newItems;
  }, [items, dragging]);

  // TODO(burdon): WARNING: Auto scrolling has been attached to an element that appears not to be scrollable.
  // TODO(burdon): Support DropIndicator or Placeholder variants.
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
  // Keep a local ref for click-to-focus behavior.
  const rootRef = useRef<HTMLDivElement>(null);
  // Compose the local ref with the forwarded ref so both work.
  const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);

  // TODO(burdon): Convert to ref.
  const [handleRef, setHandleRef] = useState<HTMLElement | null>(null);

  return (
    <Focus.Group asChild>
      <Mosaic.Tile asChild dragHandle={handleRef} object={object} location={location}>
        <Card.StaticRoot classNames={classNames} onClick={() => rootRef.current?.focus()} ref={composedRef}>
          <Card.Toolbar>
            <Card.DragHandle ref={setHandleRef} />
            <Card.Heading>{object.name}</Card.Heading>
            <Card.Menu context={object} items={menuItems} />
          </Card.Toolbar>
          <Card.Section classNames='text-description'>{object.description}</Card.Section>
          <Card.Section icon='ph--tag--regular'>
            {object.label && (
              <div role='none' className='flex shrink-0 gap-1 text-xs text-muted font-mono text-infoText'>
                <Tag palette={getHashStyles(object.label).hue}>{object.label}</Tag>
              </div>
            )}
          </Card.Section>
        </Card.StaticRoot>
      </Mosaic.Tile>
    </Focus.Group>
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
        className={mx('bg-baseSurface border border-dashed border-separator rounded-sm', styles.placeholder.content)}
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
