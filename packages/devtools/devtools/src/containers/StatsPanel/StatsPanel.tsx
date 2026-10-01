//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { Button, Flex, Icon, Panel, ScrollArea, Toggle, Toolbar } from '@dxos/react-ui';

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
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Stats</Toolbar.Text>
          <Toolbar.Separator variant='gap' />
          <Button
            iconOnly
            variant='ghost'
            icon='ph--arrow-clockwise--regular'
            label='Refresh'
            disabled={!onRefresh}
            onClick={onRefresh}
          />
          <Toggle pressed={live} disabled={!onRefresh} onPressedChange={setLive}>
            <Icon icon={live ? 'ph--pause--regular' : 'ph--play--regular'} />
          </Toggle>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root thin>
          <ScrollArea.Viewport classNames='p-2'>
            <Flex column gap='sm'>
              {children}
            </Flex>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

StatsPanel.displayName = 'StatsPanel';
