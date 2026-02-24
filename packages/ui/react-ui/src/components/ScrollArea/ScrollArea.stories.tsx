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
      <div key={index} className='px-1 text-sm cursor-pointer hover:bg-hover-surface'>
        Item {index + 1}
      </div>
    ))}
  </div>
);

const Row = () => (
  <div className='flex gap-2 w-max'>
    {Array.from({ length: 50 }).map((_, index) => (
      <div
        key={index}
        className='shrink-0 h-20 w-20 cursor-pointer border border-separator rounded-md flex items-center justify-center text-sm hover:bg-hover-surface'
      >
        {index + 1}
      </div>
    ))}
  </div>
);

export const Vertical = {
  render: () => (
    <div className='h-72 w-48 p-2 border border-separator rounded-md'>
      <ScrollArea.Root orientation='vertical' padding>
        <ScrollArea.Viewport>
          <Column />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  ),
};

export const VerticalThin = {
  render: () => (
    <div className='h-72 w-48 p-2 border border-separator rounded-md'>
      <ScrollArea.Root orientation='vertical' padding thin>
        <ScrollArea.Viewport>
          <Column />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  ),
};

export const Horizontal = {
  render: () => (
    <div className='w-96 p-2 border border-separator rounded-md'>
      <ScrollArea.Root orientation='horizontal' padding>
        <ScrollArea.Viewport>
          <Row />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  ),
};

export const HorizontalThin = {
  render: () => (
    <div className='w-96 p-2 border border-separator rounded-md'>
      <ScrollArea.Root orientation='horizontal' padding thin>
        <ScrollArea.Viewport>
          <Row />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  ),
};

export const Both = {
  render: () => (
    <div className='h-96 w-96 p-2 border border-separator rounded-md'>
      <ScrollArea.Root orientation='all' padding>
        <ScrollArea.Viewport>
          <div className='flex flex-col gap-2'>
            {Array.from({ length: 50 }).map((_, rowIndex) => (
              <div key={rowIndex} className='flex gap-2'>
                {Array.from({ length: 50 }).map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className='shrink-0 h-20 w-20 flex items-center justify-center text-sm border border-separator font-mono'
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
              className='shrink-0 h-full w-[16rem] grid grid-rows-[min-content_1fr_min-content] border border-separator'
            >
              <header className='flex shrink-0 p-2 border-b border-separator'>Column {column.id}</header>
              <ScrollArea.Root thin orientation='vertical'>
                <ScrollArea.Viewport classNames='py-2 px-2 gap-2'>
                  {Array.from({ length: column.count }, (_, i) => (
                    <div key={i} role='listitem' className={`shrink-0 p-2 text-sm border border-separator rounded-xs`}>
                      Item {i + 1}
                    </div>
                  ))}
                </ScrollArea.Viewport>
              </ScrollArea.Root>
              <footer className={`p-2 text-subdued border-t border-separator`}>{column.count}</footer>
            </section>
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
};

export const NativeScroll = {
  render: () => (
    <div className='group h-48 w-48 border border-separator'>
      <div
        className={mx(
          'group h-full w-full overflow-y-scroll',
          '[&::-webkit-scrollbar]:w-3',
          '[&::-webkit-scrollbar-thumb]:rounded-none',
          '[&::-webkit-scrollbar-track]:bg-scrollbarTrack',
          '[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumbSubdued',
          'group-hover:[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
        )}
      >
        <Column />
      </div>
    </div>
  ),
};
