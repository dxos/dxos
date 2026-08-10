//
// Copyright 2026 DXOS.org
//

// `react-hooks` deliberately doesn't depend on `@dxos/react-ui` (a `withTheme`/`withLayout` import
// would create a cycle since `react-ui` depends on this package). Storybook's global
// `withThemeByClassName` already applies the theme class at the root.

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { useMediaQuery } from './useMediaQuery';

const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];

const useWindowWidth = () => {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
};

type MediaQueryDemoProps = {
  /** Breakpoint token or raw media query. */
  query: string;
};

/**
 * Test:
 * 1. Resize the window across the tracked breakpoint — "matches" must flip live.
 * 2. Switch the `query` control to another breakpoint — "matches" must immediately reflect the
 *    new query at the current width (regression: the hook once kept tracking the original query
 *    for the component's lifetime).
 */
const MediaQueryDemo = ({ query }: MediaQueryDemoProps) => {
  const [matches] = useMediaQuery(query);
  const width = useWindowWidth();

  return (
    <div className='flex flex-col w-full gap-4 p-4 font-mono text-sm'>
      <div className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 max-w-md'>
        <span className='text-description'>query</span>
        <span>{query}</span>
        <span className='text-description'>window width</span>
        <span>{width}px</span>
        <span className='text-description'>matches</span>
        <span data-testid='matches'>{String(matches)}</span>
      </div>
      <AllBreakpoints />
    </div>
  );
};

/** Live view of every breakpoint token, for orientation while resizing. */
const AllBreakpoints = () => {
  const matches = useMediaQuery(breakpoints);

  return (
    <div className='flex gap-2'>
      {breakpoints.map((token, index) => (
        <span key={token} className={`px-2 py-1 border border-separator rounded ${matches[index] ? '' : 'opacity-30'}`}>
          {token}
        </span>
      ))}
    </div>
  );
};

const meta = {
  title: 'ui/react-hooks/useMediaQuery',
  component: MediaQueryDemo,
  argTypes: {
    query: {
      control: 'select',
      options: [...breakpoints, '(orientation: portrait)', '(pointer: coarse)'],
    },
  },
} satisfies Meta<typeof MediaQueryDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    query: 'md',
  },
};
