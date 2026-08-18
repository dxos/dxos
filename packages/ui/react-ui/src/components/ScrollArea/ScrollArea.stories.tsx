//
// Copyright 2026 DXOS.org
//

import React, { PropsWithChildren, useMemo } from 'react';

import { random } from '@dxos/random';
import { mx } from '@dxos/ui-theme';
import { ThemedClassName } from '@dxos/ui-types';

import { withLayout, withTheme } from '../../testing';
import { ScrollArea, type ScrollAreaRootProps } from './ScrollArea';

random.seed(123);

const Container = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  return <div className={mx('border border-separator rounded-md overflow-hidden', classNames)}>{children}</div>;
};

// Items are direct children of the viewport, carrying their own `snap-start`: `snap` sets the
// snap type on the scroller, but the browser needs an alignment on the items to snap to.
// The filled background makes the `padding` inset visible against the scroller edge.

const List = ({ items = 50 }: { items?: number }) => (
  <>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className='snap-start px-1 mb-1 bg-hover-surface cursor-pointer'>
        {index + 1} tempor incididunt ut labore et dolore magna aliqua
      </div>
    ))}
  </>
);

const Row = ({ items = 50 }: { items?: number }) => (
  <>
    {Array.from({ length: items }).map((_, index) => (
      <div
        key={index}
        className='snap-start shrink-0 h-20 w-20 me-2 cursor-pointer border border-separator rounded-md flex items-center justify-center bg-hover-surface'
      >
        {index + 1}
      </div>
    ))}
  </>
);

const Grid = ({ items = 50 }: { items?: number }) => (
  <>
    {Array.from({ length: items }).map((_, rowIndex) => (
      <div key={rowIndex} className='snap-start flex gap-2 mb-2'>
        {Array.from({ length: items }).map((_, colIndex) => (
          <div
            key={colIndex}
            className='shrink-0 h-20 w-20 flex items-center justify-center text-sm border border-separator font-mono bg-hover-surface'
          >
            [{colIndex}:{rowIndex}]
          </div>
        ))}
      </div>
    ))}
  </>
);

const sizes: Record<string, string> = {
  vertical: 'h-72 w-64',
  horizontal: 'w-96',
  all: 'w-96 h-96',
};

const Story = ({ orientation = 'vertical', ...props }: ScrollAreaRootProps) => (
  <Container classNames={sizes[orientation]}>
    <ScrollArea.Root orientation={orientation} {...props}>
      <ScrollArea.Viewport>
        {orientation === 'vertical' && <List />}
        {orientation === 'horizontal' && <Row />}
        {orientation === 'all' && <Grid />}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  </Container>
);

export default {
  title: 'ui/react-ui-core/components/ScrollArea',
  component: ScrollArea.Root,
  render: (args: ScrollAreaRootProps) => <Story {...args} />,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal', 'all'] },
    native: { control: 'boolean' },
    autoHide: { control: 'boolean' },
    scrollbars: { control: 'boolean' },
    padding: { control: 'boolean' },
    centered: { control: 'boolean' },
    thin: { control: 'boolean' },
    snap: { control: 'boolean' },
  },
  // Mirrors the component defaults so the controls panel reflects real behaviour.
  args: {
    native: false,
    autoHide: true,
    scrollbars: true,
    padding: false,
    centered: false,
    thin: false,
    snap: false,
  } satisfies ScrollAreaRootProps,
};

export const Vertical = {
  args: { orientation: 'vertical' },
};

export const Horizontal = {
  args: { orientation: 'horizontal' },
};

export const Both = {
  args: { orientation: 'all' },
};

/** The classic native scrollbar, which consumes layout width. */
export const Native = {
  args: { orientation: 'vertical', native: true },
};

/** Nesting is not expressible through the controls panel: a vertical scroller inside a horizontal one. */
export const Nested = {
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  render: ({ orientation: _orientation, ...props }: ScrollAreaRootProps) => {
    const columns = useMemo(
      () =>
        Array.from({ length: 8 }).map((_, index) => ({
          id: String(index),
          count: random.number.int({ min: 5, max: 20 }),
        })),
      [],
    );

    return (
      <ScrollArea.Root orientation='horizontal' padding {...props}>
        <ScrollArea.Viewport classNames='gap-4'>
          {columns.map((column) => (
            <section
              key={column.id}
              className='shrink-0 h-full w-[16rem] grid grid-rows-[min-content_1fr_min-content] border border-separator'
            >
              <header className='flex shrink-0 p-2 border-b border-separator'>Column {column.id}</header>
              <ScrollArea.Root orientation='vertical' padding {...props}>
                <ScrollArea.Viewport classNames='py-2 px-2 gap-2'>
                  {Array.from({ length: column.count }, (_, index) => (
                    <div
                      key={index}
                      role='listitem'
                      className='shrink-0 p-2 text-sm border border-separator rounded-xs'
                    >
                      Item {index + 1}
                    </div>
                  ))}
                </ScrollArea.Viewport>
              </ScrollArea.Root>
              <footer className='p-2 text-subdued border-t border-separator'>{column.count}</footer>
            </section>
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
};
