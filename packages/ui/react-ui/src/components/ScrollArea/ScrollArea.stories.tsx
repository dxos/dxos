//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { withLayout, withTheme } from '../../testing';

import { ScrollArea } from './ScrollArea';

export default {
  title: 'ui/react-ui-core/components/ScrollArea',
  component: ScrollArea,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

const Column = () => (
  <div>
    {Array.from({ length: 50 }).map((_, index) => (
      <div key={index} className='text-sm'>
        Item {index + 1}
      </div>
    ))}
  </div>
);

const Row = () => (
  <div className='flex gap-2 is-max'>
    {Array.from({ length: 50 }).map((_, index) => (
      <div
        key={index}
        className='shrink-0 bs-20 is-20 border border-separator rounded-md flex items-center justify-center text-sm'
      >
        {index + 1}
      </div>
    ))}
  </div>
);

export const Vertical = {
  render: () => (
    <div className='bs-72 is-48 p-2 border border-separator rounded-md'>
      <ScrollArea orientation='vertical'>
        <Column />
      </ScrollArea>
    </div>
  ),
};

export const VerticalThin = {
  render: () => (
    <div className='bs-72 is-48 p-2 border border-separator rounded-md'>
      <ScrollArea thin orientation='vertical'>
        <Column />
      </ScrollArea>
    </div>
  ),
};

export const Horizontal = {
  render: () => (
    <div className='is-96 p-2 border border-separator rounded-md'>
      <ScrollArea orientation='horizontal'>
        <Row />
      </ScrollArea>
    </div>
  ),
};

export const HorizontalThin = {
  render: () => (
    <div className='is-96 p-2 border border-separator rounded-md'>
      <ScrollArea thin orientation='horizontal'>
        <Row />
      </ScrollArea>
    </div>
  ),
};

export const Both = {
  render: () => (
    <div className='bs-72 is-96 p-2 border border-separator rounded-md'>
      <ScrollArea thin orientation='all'>
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 50 }).map((_, rowIndex) => (
            <div key={rowIndex} className='flex gap-2'>
              {Array.from({ length: 50 }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className='shrink-0 bs-20 is-20 flex items-center justify-center text-sm border border-separator font-mono'
                >
                  [{colIndex}:{rowIndex}]
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  ),
};

/**
 * NOTE: This example demonstrates how to use ScrollArea with nested ScrollAreas.
 * However, due to a Radix UI bug, this example will not work as expected.
 * See: https://github.com/radix-ui/primitives/issues/3053
 */
export const NestedScrollAreas = {
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
  render: () => {
    const columns = Array.from({ length: 8 }).map((_, index) => ({
      id: String(index),
      count: 20,
    }));

    return (
      <div className='flex bs-full is-full overflow-hidden border border-sky-500'>
        <ScrollArea orientation='horizontal'>
          <div className='flex gap-4 p-3 bs-full overflow-hidden'>
            {columns.map((column) => (
              <div
                key={column.id}
                className='grid grid-rows-[min-content_1fr_min-content] bs-full overflow-hidden is-[300px]'
              >
                <div className='flex shrink-0 p-2 border border-separator'>Column {column.id}</div>
                <ScrollArea orientation='vertical'>
                  <div className='flex flex-col p-3 space-y-2'>
                    {Array.from({ length: column.count }, (_, i) => (
                      <div key={i} className={`p-3 border border-separator rounded-sm`}>
                        Item {i + 1}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className={`p-2 border border-separator`}>Footer</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  },
};
