//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Registry from 'effect/reactivity/AtomRegistry';
import React, { useEffect, useMemo } from 'react';
import { expect, waitFor } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withTheme } from '@dxos/react-ui/testing';

import { createDefaultBackends } from '../../core/index.ts';
import { ViewState } from '../../types/index.ts';
import { ViewStateProvider } from '../ViewStateProvider/index.ts';
import { ScrollScope } from './ScrollScope.tsx';

const OBJECT = 'echo:@ABC/01J00000000000000000000000';

const ROWS = Array.from({ length: 60 }, (_, index) => ({
  id: `row-${index}`,
  text: `Row ${index}. ${'A row of text that wraps to more lines in a narrow pane than in a wide one. '.repeat(2)}`,
}));

const makeManager = () => {
  const registry = Registry.make();
  return new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });
};

const Article = ({ prefix, width }: { prefix: string; width: string }) => (
  <ScrollArea.Root classNames={['h-[14rem] border border-separator', width]}>
    <ScrollArea.Viewport data-testid={`${prefix}-viewport`}>
      {ROWS.map(({ id, text }) => (
        <div key={id} data-scroll-anchor={id} className='p-2 border-b border-separator'>
          {text}
        </div>
      ))}
    </ScrollArea.Viewport>
  </ScrollArea.Root>
);

/** Two sessions' views of one object; the follower takes each value the leader sends, as the follow does. */
const FollowStory = () => {
  const leader = useMemo(makeManager, []);
  const follower = useMemo(makeManager, []);
  useEffect(
    () =>
      leader.subscribeFollowed((key, contextId) => {
        const value = leader.followed([contextId])[key]?.[contextId];
        if (value !== undefined) {
          follower.setEncoded(key, contextId, value);
        }
      }),
    [leader, follower],
  );
  return (
    <div className='flex gap-4 p-4'>
      <ViewStateProvider manager={leader}>
        <ScrollScope contextId={OBJECT}>
          <Article prefix='leader' width='w-[26rem]' />
        </ScrollScope>
      </ViewStateProvider>
      <ViewStateProvider manager={follower}>
        <ScrollScope contextId={OBJECT}>
          <Article prefix='follower' width='w-[14rem]' />
        </ScrollScope>
      </ViewStateProvider>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-attention/ScrollScope',
  render: FollowStory,
  decorators: [withTheme()],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** The follower's view lands on the row at the top of the leader's. */
export const Follow: Story = {
  play: async ({ canvasElement }) => {
    const leader = canvasElement.querySelector<HTMLElement>('[data-testid="leader-viewport"]');
    const follower = canvasElement.querySelector<HTMLElement>('[data-testid="follower-viewport"]');
    const row = leader?.querySelector('[data-scroll-anchor="row-20"]');
    if (!leader || !follower || !row) {
      throw new Error('missing views');
    }
    leader.scrollTop += row.getBoundingClientRect().top - leader.getBoundingClientRect().top;
    await waitFor(() =>
      expect(ScrollArea.captureScrollPosition(follower)).toMatchObject({ anchor: 'row-20', offset: 0 }),
    );
  },
};
