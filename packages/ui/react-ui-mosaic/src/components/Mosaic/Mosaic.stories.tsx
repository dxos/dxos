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
import { createPortal } from 'react-dom';

import { Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { Mosaic, type MosaicCellProps, useMosaicContainerContext, useMosaicContext } from './Mosaic';
import { styles } from './styles';
import { type MosaicCellData, type MosaicData } from './types';

faker.seed(1);

// TODO(burdon): Nail down event handlers.
// TODO(burdon): Factor out handler utils (e.g., splice).
// TODO(burdon): Key nav (as with Grid story).

const TestData = Schema.Struct({
  name: Schema.String,
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Test',
    version: '0.1.0',
  }),
);

interface TestData extends Schema.Schema.Type<typeof TestData> {}

// TODO(burdon): Factor out.
const splice = <T extends Obj.AnyProps>(items: T[], source: MosaicCellData, target?: MosaicData): T[] => {
  const from = items.findIndex((item) => item.id === source.id);
  const to: number = target?.type === 'cell' || target?.type === 'placeholder' ? target.location : -1;
  log('splice', { from, to });
  if (from !== -1) {
    const newItems = [...items];
    newItems.splice(from, 1);
    if (target) {
      newItems.splice(to, 0, source.object as T);
    }

    return newItems;
  }

  return items;
};

const Container = forwardRef<HTMLDivElement, { items: TestData[]; debug?: HTMLDivElement | null }>(
  ({ items, debug, ...props }, forwardedRef) => {
    const { dragging } = useMosaicContainerContext(Container.displayName!);
    const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });
    const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);

    // TODO(burdon): Factor out.
    const visibleItems = useMemo(() => {
      if (!dragging) {
        return items;
      }

      return splice(items, dragging.source);
    }, [items, dragging]);

    // TODO(burdon): Dragging is constantly updated.
    // useDebugDeps([items, dragging]);

    return (
      <div role='none' {...tabsterAttrs} {...props} ref={forwardedRef}>
        <Placeholder location={0} />
        {visibleItems.map((item, i) => (
          <Fragment key={item.id}>
            <Cell location={i} object={item} />
            <Placeholder location={i + 1} />
          </Fragment>
        ))}
        {debug && createPortal(<DebugContainer />, debug)}
      </div>
    );
  },
);

Container.displayName = 'Container';

const Cell = forwardRef<HTMLDivElement, Pick<MosaicCellProps<TestData>, 'classNames' | 'object' | 'location'>>(
  ({ classNames, object, location }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const focusableGroupAttrs = useFocusableGroup();
    const [handleRef, setHandleRef] = useState<HTMLDivElement | null>(null);

    return (
      <Mosaic.Cell asChild dragHandle={handleRef} object={object} location={location}>
        <div
          role='none'
          tabIndex={0}
          {...focusableGroupAttrs}
          className={mx('flex gap-2 items-center p-1', styles.cell.border, styles.cell.dragging, classNames)}
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

// TODO(burdon): Factor out gaps. Add before and after first and last element.
// TODO(burdon): Get dimensions from dragging.
const Placeholder = ({ location }: Pick<MosaicCellProps<TestData>, 'location'>) => {
  return (
    <Mosaic.Placeholder location={location} classNames={styles.placeholder.active}>
      <div
        role='none'
        className={mx(
          'bs-full hidden group-data-[mosaic-placeholder-state=active]:block',
          'bg-groupSurface border border-dashed border-separator',
        )}
      />
    </Mosaic.Placeholder>
  );
};

Placeholder.displayName = 'Placeholder';

const DebugRoot = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames = 'text-xs' }, forwardedRef) => {
  const info = useMosaicContext(DebugRoot.displayName!);
  return <Json data={info} classNames={classNames} ref={forwardedRef} />;
});

DebugRoot.displayName = 'DebugRoot';

const DebugContainer = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames = 'text-xs' }, forwardedRef) => {
  const info = useMosaicContainerContext(DebugContainer.displayName!);
  return <Json data={info} classNames={classNames} ref={forwardedRef} />;
});

DebugContainer.displayName = 'DebugContainer';

const DefaultStory = () => {
  const debugRoot = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<TestData[]>(() =>
    Array.from({ length: 10 }).map((_, i) =>
      Obj.make(TestData, {
        name: `${i} ${faker.lorem.sentence()}`,
      }),
    ),
  );

  return (
    <Mosaic.Root>
      <div role='none' className='bs-full is-full grid grid-cols-3 gap-2 overflow-hidden'>
        <div className='flex bs-full is-full p-2 overflow-hidden'>
          <div
            className={mx(
              'flex flex-col bs-full is-full overflow-hidden',
              'border border-separator rounded-sm',
              styles.container.active,
            )}
          >
            <Mosaic.Container
              asChild
              classNames='flex flex-col pli-2 overflow-y-auto'
              autoscroll
              handler={{
                id: 'test',
                canDrop: () => true,
                onDrop: ({ source, target }) => {
                  setItems(splice(items, source, target));
                },
              }}
            >
              <Container items={items} debug={debugRoot.current} />
            </Mosaic.Container>
          </div>
        </div>
        <div className='p-2 overflow-hidden'>
          <h2>Container</h2>
          <div ref={debugRoot} />
        </div>
        <div className='p-2 overflow-hidden'>
          <h2>Root</h2>
          <DebugRoot />
        </div>
      </div>
    </Mosaic.Root>
  );
};

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
  args: {},
};
