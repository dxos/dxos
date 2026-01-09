//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import * as Schema from 'effect/Schema';
import React, { Fragment, forwardRef, useMemo, useRef, useState } from 'react';

import { Ref, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';
import { arrayMove, isTruthy } from '@dxos/util';

import { Card } from '../Card';
import { Focus } from '../Focus';

import { Mosaic, type MosaicTileProps, useContainerDebug, useMosaic, useMosaicContainer } from './Mosaic';
import { styles } from './styles';

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
// Column
//

// TODO(burdon): Factor out list/stack.
export const Column = forwardRef<HTMLDivElement, { column: TestColumn; debug?: boolean }>(
  ({ column: { id, items }, debug }, forwardedRef) => {
    const [DebugInfo, debugHandler] = useContainerDebug(debug);

    return (
      <div className={mx('grid bs-full min-is-[20rem] max-is-[25rem] overflow-hidden', debug && 'grid-rows-2 gap-2')}>
        <Focus.Group ref={forwardedRef} classNames='flex flex-col overflow-hidden'>
          {/* TODO(burdon): Remove focus. */}
          {/* TODO(burdon): Common header with Card. */}
          <div className='flex gap-2 items-center plb-2 pli-3 border-b border-separator'>
            <Card.DragHandle />
            <div className='grow truncate'>{id}</div>
            <div>{items.length}</div>
          </div>

          <Mosaic.Container
            asChild
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

                // TODO(burdon): UI doesn't update.
                // console.log(items.map((item) => item.target?.label));
              },
            }}
          >
            <ItemList items={items.map((item: any) => item.target).filter(isTruthy)} />
          </Mosaic.Container>
        </Focus.Group>
        <DebugInfo />
      </div>
    );
  },
);

const ItemList = forwardRef<HTMLDivElement, { items: TestItem[] }>(({ items, ...props }, forwardedRef) => {
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
        <Placeholder location={0} />
        {visibleItems.map((item, i) => (
          <Fragment key={item.id}>
            <Tile location={i + 1} object={item} />
            <Placeholder location={i + 1} />
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

const Tile = forwardRef<HTMLDivElement, Pick<MosaicTileProps<TestItem>, 'classNames' | 'object' | 'location'>>(
  ({ classNames, object, location }, forwardedRef) => {
    // Keep a local ref for click-to-focus behavior.
    const rootRef = useRef<HTMLDivElement>(null);
    // Compose the local ref with the forwarded ref so both work.
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const [handleRef, setHandleRef] = useState<HTMLElement | null>(null);

    return (
      <Focus.Group asChild>
        <Mosaic.Tile asChild dragHandle={handleRef} object={object} location={location}>
          <Card.StaticRoot classNames={classNames} onClick={() => rootRef.current?.focus()} ref={composedRef}>
            <Card.Toolbar>
              <Card.DragHandle ref={setHandleRef} />
              {object.name}
              {object.label && (
                <div role='none' className='shrink-0 text-xs text-muted font-mono text-infoText'>
                  {object.label}
                </div>
              )}
            </Card.Toolbar>
            <Card.Text>{object.description}</Card.Text>
          </Card.StaticRoot>
        </Mosaic.Tile>
      </Focus.Group>
    );
  },
);

Tile.displayName = 'Tile';

//
// Placeholder
//

// TODO(burdon): Need darker surface.
const Placeholder = ({ location }: Pick<MosaicTileProps<TestItem>, 'location'>) => {
  return (
    <Mosaic.Placeholder location={location} classNames={styles.placeholder.root}>
      <div
        role='none'
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
