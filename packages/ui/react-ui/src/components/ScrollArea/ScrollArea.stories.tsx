//
// Copyright 2026 DXOS.org
//

import React, { PropsWithChildren, useMemo } from 'react';

import { random } from '@dxos/random';
import { mx } from '@dxos/ui-theme';

import { withLayout, withTheme } from '../../testing';

import { ScrollArea } from './ScrollArea';
import { Column } from '../../primitives';
import { Input } from '../Input';
import { ThemedClassName } from '@dxos/ui-types';

random.seed(123);

export default {
  title: 'ui/react-ui-core/components/ScrollArea',
  component: ScrollArea,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
};

const List = ({ items = 50 }: { items?: number }) => (
  <div>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className='px-1 cursor-pointer hover:bg-hover-surface'>
        Item {index + 1}
      </div>
    ))}
  </div>
);

const Row = ({ items = 50 }: { items?: number }) => (
  <div className='flex gap-2 w-max'>
    {Array.from({ length: items }).map((_, index) => (
      <div
        key={index}
        className='shrink-0 h-20 w-20 cursor-pointer border border-separator rounded-md flex items-center justify-center hover:bg-hover-surface'
      >
        {index + 1}
      </div>
    ))}
  </div>
);

const Container = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  return (
    <div role='none' className={mx('border border-separator rounded-md overflow-hidden', classNames)}>
      {children}
    </div>
  );
};

export const Vertical = {
  render: () => (
    <Container classNames='h-72 w-48'>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport>
          <List />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Container>
  ),
};

export const VerticalThin = {
  render: () => (
    <Container classNames='h-72 w-48'>
      <ScrollArea.Root orientation='vertical' thin>
        <ScrollArea.Viewport>
          <List />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Container>
  ),
};

export const VerticalPadded = {
  render: () => (
    <Container classNames='h-72 w-48'>
      <ScrollArea.Root orientation='vertical' centered padding thin>
        <ScrollArea.Viewport>
          <List />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Container>
  ),
};

export const VerticalColumn = {
  render: () => (
    <Container classNames='h-72 w-48'>
      <Column.Root gutter='sm' classNames='h-full overflow-hidden'>
        <ScrollArea.Root orientation='vertical' padding thin>
          <ScrollArea.Viewport classNames='py-2'>
            <Input.Root>
              <Input.TextInput classNames='p-1' />
            </Input.Root>
            <List />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Column.Root>
    </Container>
  ),
};

export const Horizontal = {
  render: () => (
    <Container classNames='w-96'>
      <ScrollArea.Root orientation='horizontal'>
        <ScrollArea.Viewport>
          <Row />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Container>
  ),
};

export const HorizontalThin = {
  render: () => (
    <Container classNames='w-96'>
      <ScrollArea.Root orientation='horizontal' thin>
        <ScrollArea.Viewport>
          <Row />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Container>
  ),
};

export const Both = {
  render: () => (
    <Container classNames='w-96 h-96'>
      <ScrollArea.Root orientation='all'>
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
    </Container>
  ),
};

export const Fullscreen = {
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  render: () => (
    <ScrollArea.Root orientation='all' thin>
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
  ),
};

export const NestedScrollAreas = {
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  render: () => {
    const columns = useMemo(
      () =>
        Array.from({ length: 8 }).map((_, index) => ({
          id: String(index),
          count: random.number.int({ min: 5, max: 20 }),
        })),
      [],
    );

    return (
      <ScrollArea.Root orientation='horizontal' thin padding>
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
          '[&::-webkit-scrollbar-track]:bg-scrollbar-track',
          '[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumbSubdued',
          'group-hover:[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
        )}
      >
        <List />
      </div>
    </div>
  ),
};
