//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { faker } from '@dxos/random';
import { Layout, ScrollArea, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

faker.seed(999);

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
          name: faker.lorem.paragraph(),
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
      <Layout.Main toolbar>
        <ScrollToolbar items={items} index={index} setIndex={setIndex} />
        <ScrollArea.Root orientation='vertical' margin>
          <ScrollArea.Viewport classNames='p-2' ref={setViewport}>
            <div
              role='none'
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
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Layout.Main>
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
    <Toolbar.Root classNames='grid grid-cols-3'>
      <div />
      <div className='flex justify-center gap-1'>
        <Toolbar.IconButton icon='ph--arrow-line-left--regular' iconOnly label='start' onClick={() => setIndex(0)} />
        <Toolbar.IconButton
          icon='ph--arrows-out-line-horizontal--regular'
          iconOnly
          label='random'
          onClick={() => setIndex(Math.floor(Math.random() * items.length))}
        />
        <Toolbar.IconButton
          icon='ph--arrow-line-right--regular'
          iconOnly
          label='end'
          onClick={() => setIndex(items.length - 1)}
        />
      </div>
      <div className='p-1 text-right'>
        {index + 1}/{items.length}
      </div>
    </Toolbar.Root>
  );
};
