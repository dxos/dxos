//
// Copyright 2026 DXOS.org
//

import React, { useSyncExternalStore } from 'react';

import * as Tabs from '@dxos/react-ui/Tabs';
import * as Theme from '@dxos/react-ui/Theme';

/**
 * The tab strip above the main pane. Only the triggers are React: each tab's content is owned by the
 * Solid shell, which shows the selected one, so the strip is controlled and holds no panels.
 */

export type Tab = 'agent' | 'tree';

export type TabBarIslandProps = {
  value: Tab;
  onChange: (value: Tab) => void;
};

const isTab = (value: string): value is Tab => value === 'agent' || value === 'tree';

export const TabBarIsland = ({ value, onChange }: TabBarIslandProps) => {
  const themeMode = useSyncExternalStore(subscribeToDocumentClass, () =>
    document.documentElement.classList.contains('dark') ? ('dark' as const) : ('light' as const),
  );
  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode={themeMode}>
      <Tabs.Root value={value} onValueChange={(next) => isTab(next) && onChange(next)}>
        <Tabs.List aria-label='View'>
          <Tabs.Trigger value='agent' icon='ph--chat-circle--regular' label='Agent' data-testid='tab-agent' />
          <Tabs.Trigger value='tree' icon='ph--tree-structure--regular' label='Tree' data-testid='tab-tree' />
        </Tabs.List>
      </Tabs.Root>
    </Theme.Provider>
  );
};

const subscribeToDocumentClass = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['class'] });
  return () => observer.disconnect();
};
