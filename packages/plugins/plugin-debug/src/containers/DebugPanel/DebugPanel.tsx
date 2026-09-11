//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback } from 'react';

import { Tabs, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { DebugConsole } from '../DebugConsole/index.ts';
import { LoggerPanel } from '../LoggerPanel/index.ts';
import { DEBUG_PANEL_CONTEXT, type DebugPanelTab, debugPanelAspect } from './view-state.ts';

export type DebugPanelRootProps = PropsWithChildren<{
  /** Overridable so a second host (or a story) gets its own tab rather than the rail's. */
  contextId?: string;
}>;

/**
 * The debug surface in parts, so a host places the tab strip where it wants it — the floating
 * window puts it in the title bar beside the drag handle — and the panels where the room is. `Root`
 * owns the selected tab, persisted so a debugging session survives the reloads it provokes.
 */
const DebugPanelRoot = ({ contextId = DEBUG_PANEL_CONTEXT, children }: DebugPanelRootProps) => {
  const { tab } = useViewState(debugPanelAspect, contextId);
  const { update } = useViewStateActions(debugPanelAspect, contextId);
  const handleTabChange = useCallback(
    (value: string) => update((prev) => ({ ...prev, tab: value as DebugPanelTab })),
    [update],
  );

  return (
    <Tabs.Root
      classNames='contents'
      orientation='horizontal'
      activationMode='automatic'
      keepMounted
      value={tab}
      onValueChange={handleTabChange}
    >
      {children}
    </Tabs.Root>
  );
};

DebugPanelRoot.displayName = 'DebugPanel.Root';

export type DebugPanelTablistProps = ThemedClassName<{}>;

/** The console and log tabs, sized to their labels so they sit inside a toolbar or a title bar. */
const DebugPanelTablist = ({ classNames }: DebugPanelTablistProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Tabs.Tablist classNames={mx('w-auto p-0 gap-0.5', classNames)}>
      <Tabs.Button value='console' density='sm'>
        {t('console.tab.label')}
      </Tabs.Button>
      <Tabs.Button value='logs' density='sm'>
        {t('logs.tab.label')}
      </Tabs.Button>
    </Tabs.Tablist>
  );
};

DebugPanelTablist.displayName = 'DebugPanel.Tablist';

/** The Effect-CLI console and the log viewer, one per tab; both stay mounted so neither loses its state. */
const DebugPanelContent = () => (
  <>
    <Tabs.Panel value='console' classNames='dx-expand'>
      <DebugConsole fit />
    </Tabs.Panel>
    <Tabs.Panel value='logs' classNames='dx-expand'>
      <LoggerPanel />
    </Tabs.Panel>
  </>
);

DebugPanelContent.displayName = 'DebugPanel.Content';

export const DebugPanel = {
  Root: DebugPanelRoot,
  Tablist: DebugPanelTablist,
  Content: DebugPanelContent,
};
