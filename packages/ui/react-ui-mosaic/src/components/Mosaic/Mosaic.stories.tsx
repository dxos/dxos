//
// Copyright 2023 DXOS.org
//

import { useFocusableGroup } from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { Fragment, forwardRef, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Obj, Ref, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { Icon, IconButton, ScrollArea, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';
import { arrayMove, isTruthy } from '@dxos/util';

import { Focus } from '../Focus';

import { Mosaic, type MosaicCellProps, useMosaic, useMosaicContainer } from './Mosaic';
import { styles } from './styles';

faker.seed(999);

const TestItem = Schema.Struct({
  name: Schema.String,
  label: Schema.optional(Schema.String),
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Item',
    version: '0.1.0',
  }),
);

interface TestItem extends Schema.Schema.Type<typeof TestItem> {}

const TestColumn = Schema.Struct({
  id: ObjectId,
  items: Schema.mutable(Schema.Array(Type.Ref(TestItem))),
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Column',
    version: '0.1.0',
  }),
);

interface TestColumn extends Schema.Schema.Type<typeof TestColumn> {}

type StoryProps = {
  columns?: number;
  debug?: boolean;
};

const DefaultStory = ({ columns: columnsProp = 1, debug = false }: StoryProps) => {
  const [columns, setColumns] = useState<TestColumn[]>(
    Array.from({ length: columnsProp }).map((_, i) =>
      Obj.make(TestColumn, {
        items: Array.from({ length: faker.number.int({ min: 8, max: 20 }) }).map((_, j) =>
          Ref.make(
            Obj.make(TestItem, {
              name: faker.lorem.sentence(3),
              label: `${String.fromCharCode(65 + i)}-${j}`,
            }),
          ),
        ),
      }),
    ),
  );

  return (
    <Mosaic.Root>
      <Focus.Group axis='horizontal' classNames='p-2 bs-full is-full grid grid-cols-[1fr_25rem] gap-2 overflow-hidden'>
        <div className='flex bs-full overflow-x-auto'>
          <div className='flex gap-2 bs-full'>
            {/* <Mosaic.Container autoscroll withFocus> */}
            {columns.map((column) => (
              <Column key={column.id} column={column} debug={debug} />
            ))}
            {/* </Mosaic.Container> */}
          </div>
        </div>

        {debug && (
          <Focus.Group classNames='flex flex-col gap-2 overflow-hidden'>
            <Toolbar.Root classNames='border-b border-separator'>
              <IconButton
                icon='ph--arrows-clockwise--regular'
                iconOnly
                label='refresh'
                onClick={() => setColumns([...columns])}
              />
            </Toolbar.Root>
            <DebugRoot classNames='p-2' />
          </Focus.Group>
        )}
      </Focus.Group>
    </Mosaic.Root>
  );
};

const Column = forwardRef<HTMLDivElement, { column: TestColumn; debug?: boolean }>(
  ({ column: { id, items }, debug }, forwardedRef) => {
    const debugRef = useRef<HTMLDivElement>(null);

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

          {/* TODO(burdon): Factor out list/stack. */}
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
                    const ref = Ref.make(source.object); // TODO(burdon): Cast?
                    items.splice(to, 0, ref as any);
                  }
                }

                // TODO(burdon): UI doesn't update.
                console.log(items.map((item) => item.target?.label));
              },
            }}
          >
            <ContainerInner items={items.map((item: any) => item.target).filter(isTruthy)} debug={debugRef.current} />
          </Mosaic.Container>
        </Focus.Group>

        <div role='none' className='overflow-hidden' ref={debugRef} />
      </div>
    );
  },
);

// TODO(burdon): Debug Slot?
const ContainerInner = forwardRef<HTMLDivElement, { items: TestItem[]; debug?: HTMLDivElement | null }>(
  ({ items, debug, ...props }, forwardedRef) => {
    const { dragging } = useMosaicContainer(ContainerInner.displayName!);
    const visibleItems = useMemo(() => {
      if (!dragging) {
        return items;
      }

      const from = items.findIndex((item) => item.id === dragging.source.object.id);
      const newItems = items.slice();
      newItems.splice(from, 1);
      return newItems;
    }, [items, dragging]);

    return (
      <>
        {/* TODO(burdon): WARNING: Auto scrolling has been attached to an element that appears not to be scrollable. */}
        <ScrollArea.Root>
          <ScrollArea.Viewport {...props} classNames='pli-3' ref={forwardedRef}>
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

        {debug && createPortal(<DebugContainer classNames='p-2 border border-separator rounded-sm' />, debug)}
      </>
    );
  },
);

ContainerInner.displayName = 'Container';

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

const DebugRoot = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames }, forwardedRef) => {
  const info = useMosaic(DebugRoot.displayName!);
  return <Json data={info} classNames={mx('text-xs', classNames)} ref={forwardedRef} />;
});

DebugRoot.displayName = 'DebugRoot';

const DebugContainer = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames }, forwardedRef) => {
  const info = useMosaicContainer(DebugContainer.displayName!);
  return <Json data={info} classNames={mx('text-xs', classNames)} ref={forwardedRef} />;
});

DebugContainer.displayName = 'DebugContainer';

const meta = {
  title: 'ui/react-ui-mosaic/Mosaic',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    debug: true,
    columns: 2,
  },
};
