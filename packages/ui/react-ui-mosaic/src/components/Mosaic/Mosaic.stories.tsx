//
// Copyright 2023 DXOS.org
//

import {
  useArrowNavigationGroup,
  useFocusableGroup,
  useMergedTabsterAttributes_unstable,
} from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { Fragment, forwardRef, useMemo, useRef, useState } from 'react';

import { Obj, Ref, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { faker } from '@dxos/random';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';
import { arraySwap, isTruthy } from '@dxos/util';

import { Mosaic, type MosaicCellProps, useMosaic, useMosaicContainer } from './Mosaic';
import { styles } from './styles';

faker.seed(999);

const TestItem = Schema.Struct({
  name: Schema.String,
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
  debug?: boolean;
  columns?: number;
};

const DefaultStory = ({ debug = false, columns: columnsProp = 1 }: StoryProps) => {
  const [columns, _setColumns] = useState<TestColumn[]>(
    Array.from({ length: columnsProp }).map((_, i) =>
      Obj.make(TestColumn, {
        items: Array.from({ length: faker.number.int({ min: 8, max: 20 }) }).map((_, j) =>
          Ref.make(
            Obj.make(TestItem, {
              name: `[${i}-${j}] ${faker.lorem.sentence(3)}`,
            }),
          ),
        ),
      }),
    ),
  );

  // TODO(burdon): Create draggable cell for container.
  return (
    <Mosaic.Root>
      <div className='p-2 bs-full is-full grid grid-flow-col gap-2 auto-cols-[minmax(0,1fr)] overflow-hidden'>
        {columns.map(({ id, items }) => (
          <div key={id} className='flex flex-col overflow-hidden'>
            <Mosaic.Container
              asChild
              autoscroll
              classNames={styles.container.border}
              handler={{
                id,
                canDrop: () => true,
                onDrop: ({ source, target }) => {
                  const from = items.findIndex((item) => item.target?.id === source.object.id);
                  const to = target?.type === 'cell' || target?.type === 'placeholder' ? target.location : -1;
                  if (from !== -1 && to !== -1) {
                    arraySwap(items, from, to);
                  }
                },
                onTake: ({ source }, cb) => {
                  // TODO(burdon): Delete from items.
                  void cb(source.object);
                },
              }}
            >
              <Container debug={debug} items={items.map((item: any) => item.target).filter(isTruthy)} />
            </Mosaic.Container>
          </div>
        ))}
        {debug && (
          <div className='flex flex-col overflow-hidden'>
            <DebugRoot classNames='p-2 border border-separator rounded-sm' />
          </div>
        )}
      </div>
    </Mosaic.Root>
  );
};

// TODO(burdon): Factor out.
// TODO(burdon): NOTE: asChild should forwared classNames.
const Container = forwardRef<HTMLDivElement, { debug?: boolean; className?: string; items: TestItem[] }>(
  ({ debug = false, className, items, ...props }, forwardedRef) => {
    const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });
    const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);
    const { dragging } = useMosaicContainer(Container.displayName!);
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
      <div className={mx('grid bs-full', debug && 'grid-rows-2 gap-2')}>
        <div
          {...tabsterAttrs}
          {...props}
          tabIndex={0}
          className={mx('flex flex-col pli-3 overflow-y-auto', className)}
          ref={forwardedRef}
        >
          <Placeholder location={0} />
          {visibleItems.map((item, i) => (
            <Fragment key={item.id}>
              <Cell location={i} object={item} />
              <Placeholder location={i + 1} />
            </Fragment>
          ))}
        </div>
        {debug && <DebugContainer classNames='p-2 border border-separator rounded-sm' />}
      </div>
    );
  },
);

Container.displayName = 'Container';

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
          className={mx('flex gap-2 items-center p-1', styles.cell.border, classNames)}
          onClick={() => rootRef.current?.focus()}
          ref={composedRef}
        >
          <div role='none' className='cursor-pointer' ref={setHandleRef}>
            <Icon icon='ph--dots-six-vertical--regular' />
          </div>
          <div role='none' className='truncate'>
            {object.name}
          </div>
        </div>
      </Mosaic.Cell>
    );
  },
);

Cell.displayName = 'Cell';

// TODO(burdon): Factor out (defaults).
const Placeholder = ({ location }: Pick<MosaicCellProps<TestItem>, 'location'>) => {
  return (
    <Mosaic.Placeholder location={location} classNames={styles.placeholder.outer}>
      <div
        role='none'
        className={mx('bg-groupSurface border border-dashed border-separator', styles.placeholder.inner)}
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
