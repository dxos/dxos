//
// Copyright 2023 DXOS.org
//

import { useFocusableGroup } from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import * as Schema from 'effect/Schema';
import React, { Fragment, forwardRef, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Ref, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Icon, ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';
import { arrayMove, isTruthy } from '@dxos/util';

import { Focus } from '../Focus';

import { Mosaic, type MosaicCellProps, useMosaic, useMosaicContainer } from './Mosaic';
import { styles } from './styles';

export const TestItem = Schema.Struct({
  name: Schema.String,
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
    const containerRef = useRef<HTMLDivElement | null>(null);

    return (
      <div className={mx('grid bs-full min-is-[20rem] max-is-[25rem] overflow-hidden', debug && 'grid-rows-2 gap-2')}>
        <Focus.Group ref={forwardedRef} classNames='flex flex-col overflow-hidden'>
          {/* TODO(burdon): Common header with Card. */}
          <div className='flex gap-2 items-center plb-2 pli-3 border-b border-separator'>
            <div role='none' className='cursor-pointer'>
              <Icon icon='ph--dots-six-vertical--regular' />
            </div>
            <div className='grow truncate'>{id}</div>
            <div>{items.length}</div>
          </div>

          <Mosaic.Container
            asChild
            autoscroll
            withFocus
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
                const to = target?.type === 'cell' || target?.type === 'placeholder' ? target.location : -1;
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
            debug={() => containerRef.current && createPortal(<DebugContainer />, containerRef.current)}
          >
            <ItemList items={items.map((item: any) => item.target).filter(isTruthy)} />
          </Mosaic.Container>
        </Focus.Group>
        {debug && <div ref={containerRef} className='overflow-hidden' />}
      </div>
    );
  },
);

const ItemList = forwardRef<HTMLDivElement, { items: TestItem[] }>(({ items, ...props }, forwardedRef) => {
  const { dragging } = useMosaicContainer(ItemList.displayName!);
  const visibleItems = useMemo(() => {
    if (!dragging) {
      return items;
    }

    const from = items.findIndex((item) => item.id === dragging.source.object.id);
    const newItems = items.slice();
    newItems.splice(from, 1);
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
            <Cell location={i} object={item} />
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
// Cell
//

const Cell = forwardRef<HTMLDivElement, Pick<MosaicCellProps<TestItem>, 'classNames' | 'object' | 'location'>>(
  ({ classNames, object, location }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const focusableGroupAttrs = useFocusableGroup();
    const [handleRef, setHandleRef] = useState<HTMLDivElement | null>(null);

    return (
      <Mosaic.Cell asChild dragHandle={handleRef} object={object} location={location}>
        <div
          {...focusableGroupAttrs}
          tabIndex={0}
          className={mx('flex gap-2 items-center p-1', styles.cell.root, classNames)}
          onClick={() => rootRef.current?.focus()}
          ref={composedRef}
        >
          {/* TODO(burdon): Common header with Card. */}
          <div role='none' className='cursor-pointer' ref={setHandleRef}>
            <Icon icon='ph--dots-six-vertical--regular' />
          </div>
          <div role='none' className='truncate grow'>
            {object.name}
          </div>
          {object.label && (
            <div role='none' className='pli-1 shrink-0 text-sm text-muted font-mono text-infoText'>
              {object.label}
            </div>
          )}
        </div>
      </Mosaic.Cell>
    );
  },
);

Cell.displayName = 'Cell';

//
// Placeholder
//

const Placeholder = ({ location }: Pick<MosaicCellProps<TestItem>, 'location'>) => {
  return (
    <Mosaic.Placeholder location={location} classNames={styles.placeholder.root}>
      <div
        role='none'
        className={mx('bg-groupSurface border border-dashed border-separator', styles.placeholder.content)}
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

export const DebugContainer = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames }, forwardedRef) => {
  const info = useMosaicContainer(DebugContainer.displayName!);
  return <Json data={info} classNames={mx('text-xs', classNames)} ref={forwardedRef} />;
});

DebugContainer.displayName = 'DebugContainer';
