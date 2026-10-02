//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import * as Flex from '@dxos/react-ui/Flex';
import * as Icon from '@dxos/react-ui/Icon';
import * as IconButton from '@dxos/react-ui/IconButton';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toggle from '@dxos/react-ui/Toggle';
import * as Toolbar from '@dxos/react-ui/Toolbar';

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
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Stats</Toolbar.Text>
          <Toolbar.Separator variant='gap' />
          <IconButton.Root
            iconOnly
            variant='ghost'
            icon='ph--arrow-clockwise--regular'
            label='Refresh'
            disabled={!onRefresh}
            onClick={onRefresh}
          />
          <Toggle.Root pressed={live} disabled={!onRefresh} onPressedChange={setLive}>
            <Icon.Root icon={live ? 'ph--pause--regular' : 'ph--play--regular'} />
          </Toggle.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root thin>
          <ScrollArea.Viewport classNames='p-2'>
            <Flex.Root column gap='sm'>
              {children}
            </Flex.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

StatsPanel.displayName = 'StatsPanel';
