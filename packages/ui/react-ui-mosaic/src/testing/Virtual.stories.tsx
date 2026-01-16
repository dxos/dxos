//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Mosaic, type Stack } from '../components';

import { TestItem } from './Board';

faker.seed(999);

const meta: Meta<typeof Stack> = {
  title: 'ui/react-ui-mosaic/Virtual',
  decorators: [withLayout({ layout: 'column' }), withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

/**
 * https://tanstack.com/virtual/latest/docs/introduction
 */
export const Default = {
  render: () => {
    const [index, setIndex] = useState(0);
    const items = useMemo<TestItem[]>(
      () =>
        Array.from({ length: 100 }, () =>
          Obj.make(TestItem, {
            name: faker.lorem.paragraph(),
          }),
        ),
      [],
    );

    const parentRef = useRef(null);
    const [viewportElement, setViewportElement] = useState<HTMLElement | null>(null);
    const virtualizer = useVirtualizer({
      getScrollElement: () => viewportElement,
      estimateSize: () => 40,
      count: items.length,
    });

    const virtualItems = virtualizer.getVirtualItems();

    // TODO(burdon): Issues:
    // - [ ] Item ref (surface container).

    return (
      <div className='flex flex-col bs-full'>
        <Toolbar.Root>
          <Toolbar.IconButton
            icon='ph--arrow-line-left--regular'
            iconOnly
            label='start'
            onClick={() => virtualizer.scrollToIndex(0)}
          />
          <Toolbar.Button
            onClick={() => {
              const index = Math.floor(Math.random() * items.length);
              setIndex(index);
              virtualizer.scrollToIndex(index, { align: 'start' });
            }}
          >
            Random
          </Toolbar.Button>
          <div className='is-[3rem]'>{index}</div>
          <Toolbar.IconButton
            icon='ph--arrow-line-right--regular'
            iconOnly
            label='start'
            onClick={() => virtualizer.scrollToIndex(items.length - 1)}
          />
        </Toolbar.Root>
        <Mosaic.Viewport
          options={{ overflow: { y: 'scroll' } }}
          className='pli-3'
          onViewportReady={setViewportElement}
          ref={parentRef}
        >
          <div
            style={{
              position: 'relative',
              height: virtualizer.getTotalSize(),
              width: '100%',
            }}
          >
            {virtualItems.map((virtualItem) => (
              <div
                key={virtualItem.key}
                className='grid grid-cols-[4rem_1fr] overflow-hidden border border-separator border-sm'
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
                <div className='p-1'>{virtualItem.index}</div>
                <div className='p-1'>{items[virtualItem.index].name}</div>
              </div>
            ))}
          </div>
        </Mosaic.Viewport>
      </div>
    );
  },
};
