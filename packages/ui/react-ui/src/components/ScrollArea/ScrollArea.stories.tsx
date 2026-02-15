//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { faker } from '@dxos/random';

faker.seed(123);

import { withLayout, withTheme() } from '../../testing';

import { ScrollArea } from './ScrollArea';

export default {
  title: 'ui/react-ui-core/components/ScrollArea',
  component: ScrollArea,
  decorators: [withTheme()],
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

export const NestedScrollAreas = {
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  render: () => {
    const columns = useMemo(
      () =>
        Array.from({ length: 8 }).map((_, index) => ({
          id: String(index),
          count: faker.number.int({ min: 5, max: 50 }),
        })),
      [],
    );

    return (
      <ScrollArea thin orientation='horizontal'>
        <div className='flex gap-4 p-3 bs-full'>
          {columns.map((column) => (
            <div
              key={column.id}
              className='shrink-0 bs-full is-[16rem] grid grid-rows-[min-content_1fr_min-content] overflow-hidden border border-separator'
            >
              <div className='flex shrink-0 p-2 border-be border-separator'>Column {column.id}</div>
              <ScrollArea thin orientation='vertical'>
                <div className='flex flex-col p-3 gap-1'>
                  {Array.from({ length: column.count }, (_, i) => (
                    <div key={i} className={`p-2 border border-separator rounded-sm text-sm`}>
                      Item {i + 1}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className={`p-2 text-subdued border-bs border-separator`}>{column.count}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  },
};
