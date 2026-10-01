//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Next } from '../next/index.ts';

random.seed(999);

type TestItem = {
  name: string;
};

const meta: Meta = {
  title: 'ui/react-ui-core/exemplars/virtualizer',
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const NUM_ITEMS = 500;

/**
 * https://tanstack.com/virtual/latest/docs/introduction
 */
export const Default = {
  render: () => {
    const [index, setIndex] = useState(0);
    const items = useMemo<TestItem[]>(
      () =>
        Array.from({ length: NUM_ITEMS }, () => ({
          name: random.lorem.paragraph(),
        })),
      [],
    );

    const parentRef = useRef(null);
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const virtualizer = useVirtualizer({
      getScrollElement: () => viewport,
      estimateSize: () => 40,
      count: items.length,
      gap: 8,
    });

    useEffect(() => {
      virtualizer.scrollToIndex(index, { align: 'start' });
    }, [virtualizer, index]);

    const virtualItems = virtualizer.getVirtualItems();

    return (
      <Next.Panel.Root>
        <Next.Panel.Header>
          <ScrollToolbar items={items} index={index} setIndex={setIndex} />
        </Next.Panel.Header>
        <Next.Panel.Body asChild>
          <Next.ScrollArea.Root orientation='vertical'>
            <Next.ScrollArea.Viewport classNames='p-2' ref={setViewport}>
              <div
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                  width: '100%',
                }}
                ref={parentRef}
              >
                {virtualItems.map((virtualItem) => (
                  <div
                    key={virtualItem.key}
                    role='list'
                    className='grid grid-cols-[3rem_1fr] overflow-hidden border border-separator rounded-xs'
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                  >
                    <div className='p-1'>{virtualItem.index + 1}</div>
                    <div className='p-1'>{items[virtualItem.index].name}</div>
                  </div>
                ))}
              </div>
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        </Next.Panel.Body>
      </Next.Panel.Root>
    );
  },
};

const ScrollToolbar = ({
  items,
  index,
  setIndex,
}: {
  items: any[];
  index: number;
  setIndex: (index: number) => void;
}) => {
  return (
    <Next.Toolbar.Root>
      <Next.Toolbar.Separator variant='gap' />
      <Next.Button
        variant='ghost'
        icon='ph--arrow-line-left--regular'
        iconOnly
        label='start'
        onClick={() => setIndex(0)}
      />
      <Next.Button
        variant='ghost'
        icon='ph--arrows-out-line-horizontal--regular'
        iconOnly
        label='random'
        onClick={() => setIndex(Math.floor(Math.random() * items.length))}
      />
      <Next.Button
        variant='ghost'
        icon='ph--arrow-line-right--regular'
        iconOnly
        label='end'
        onClick={() => setIndex(items.length - 1)}
      />
      <Next.Toolbar.Separator variant='gap' />
      <Next.Toolbar.Text>
        {index + 1}/{items.length}
      </Next.Toolbar.Text>
    </Next.Toolbar.Root>
  );
};
