//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { Flex } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

const LIVE_INTERVAL = 5_000;

export type StatsPanelProps = PropsWithChildren<{
  role?: string;
  onRefresh?: () => void;
}>;

/**
 * The stats stack: a toolbar with the refresh controls over a scrolling column of cards. Hosts pass
 * the cards as children — directly, or as a `Surface` over the card role.
 */
export const StatsPanel = ({ children, role, onRefresh }: StatsPanelProps) => {
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (live && onRefresh) {
      const interval = setInterval(onRefresh, LIVE_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [live, onRefresh]);

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>Stats</Next.Toolbar.Text>
          <Next.Toolbar.Separator variant='gap' />
          <Next.Button
            iconOnly
            variant='ghost'
            icon='ph--arrow-clockwise--regular'
            label='Refresh'
            disabled={!onRefresh}
            onClick={onRefresh}
          />
          <Next.Toggle pressed={live} disabled={!onRefresh} onPressedChange={setLive}>
            <Next.Icon icon={live ? 'ph--pause--regular' : 'ph--play--regular'} />
          </Next.Toggle>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root>
          <Next.ScrollArea.Viewport classNames='p-2'>
            <Flex column gap='sm'>
              {children}
            </Flex>
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

StatsPanel.displayName = 'StatsPanel';
