//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { faker } from '@dxos/random';
import { mx } from '@dxos/ui-theme';

import { withLayout, withTheme } from '../../testing';

import { ScrollArea } from './ScrollArea';

faker.seed(123);

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
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport>
          <Column />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  ),
};

export const VerticalThin = {
  render: () => (
    <div className='bs-72 is-48 p-2 border border-separator rounded-md'>
      <ScrollArea.Root orientation='vertical' thin>
        <ScrollArea.Viewport>
          <Column />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  ),
};

export const Horizontal = {
  render: () => (
    <div className='is-96 p-2 border border-separator rounded-md'>
      <ScrollArea.Root orientation='horizontal'>
        <ScrollArea.Viewport>
          <Row />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  ),
};

export const HorizontalThin = {
  render: () => (
    <div className='is-96 p-2 border border-separator rounded-md'>
      <ScrollArea.Root orientation='horizontal' thin>
        <ScrollArea.Viewport>
          <Row />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  ),
};

export const Both = {
  render: () => (
    <div className='bs-72 is-96 p-2 border border-separator rounded-md'>
      <ScrollArea.Root thin orientation='all'>
        <ScrollArea.Viewport>
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
        </ScrollArea.Viewport>
      </ScrollArea.Root>
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
          count: faker.number.int({ min: 5, max: 20 }),
        })),
      [],
    );

    return (
      <ScrollArea.Root thin orientation='horizontal'>
        <ScrollArea.Viewport classNames='gap-4'>
          {columns.map((column) => (
            <section
              key={column.id}
              className='shrink-0 bs-full is-[16rem] grid grid-rows-[min-content_1fr_min-content] border border-separator'
            >
              <header className='flex shrink-0 p-2 border-be border-separator'>Column {column.id}</header>
              <ScrollArea.Root thin orientation='vertical'>
                <ScrollArea.Viewport classNames='plb-2 pli-2 gap-2'>
                  {Array.from({ length: column.count }, (_, i) => (
                    <div key={i} role='listitem' className={`shrink-0 p-2 text-sm border border-separator rounded-sm`}>
                      Item {i + 1}
                    </div>
                  ))}
                </ScrollArea.Viewport>
              </ScrollArea.Root>
              <footer className={`p-2 text-subdued border-bs border-separator`}>{column.count}</footer>
            </section>
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
};

export const NativeScroll = {
  render: () => (
    <div className='group bs-72 is-48 p-2 border border-separator rounded-md'>
      <div
        className={mx(
          'group bs-full is-full overflow-y-auto',
          '[&::-webkit-scrollbar]:is-1',
          '[&::-webkit-scrollbar-thumb]:bg-transparent',
          'group-hover:[&::-webkit-scrollbar-thumb]:bg-neutral-300',
          'dark:group-hover:[&::-webkit-scrollbar-thumb]:bg-neutral-600',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:transition-colors',
        )}
      >
        <Column />
      </div>
    </div>
  ),
};
