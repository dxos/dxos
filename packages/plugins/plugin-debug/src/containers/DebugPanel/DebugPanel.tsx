//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Panel, SystemIconButton, ToggleIconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';

import { meta } from '#meta';

import { DebugConsole } from '../DebugConsole';
import { LoggerPanel } from '../LoggerPanel';
import { DEBUG_PANEL_CONTEXT, type DebugPanelTab, debugPanelAspect } from './view-state';

export type DebugPanelProps = {
  /** Overridable so a second host (or a story) gets its own tab and pin rather than the rail's. */
  contextId?: string;
  /** Rendered as a close button when provided (the popover host closes itself). */
  onClose?: () => void;
};

/**
 * The debug surface: the log viewer and the Effect-CLI console behind one toolbar, so the two
 * share a single entry point in the status rail rather than a popover each.
 */
export const DebugPanel = ({ contextId = DEBUG_PANEL_CONTEXT, onClose }: DebugPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { tab, pinned } = useViewState(debugPanelAspect, contextId);
  const { update } = useViewStateActions(debugPanelAspect, contextId);
  const handleTabChange = useCallback(
    (value: string) => update((prev) => ({ ...prev, tab: value as DebugPanelTab })),
    [update],
  );
  const handlePinChange = useCallback(() => update((prev) => ({ ...prev, pinned: !prev.pinned })), [update]);

  return (
    <Tabs.Root
      classNames='contents'
      orientation='horizontal'
      activationMode='automatic'
      keepMounted
      value={tab}
      onValueChange={handleTabChange}
    >
      <Panel.Root>
        <Panel.Toolbar size='sm' asChild>
          <Toolbar.Root density='sm'>
            <Tabs.Tablist classNames='w-auto p-0 gap-0.5'>
              <Tabs.Button value='console' density='sm'>
                {t('console.tab.label')}
              </Tabs.Button>
              <Tabs.Button value='logs' density='sm'>
                {t('logs.tab.label')}
              </Tabs.Button>
            </Tabs.Tablist>
            <div role='none' className='grow' />
            <ToggleIconButton
              variant='ghost'
              active={pinned}
              icon='ph--push-pin--regular'
              iconOnly
              activeIcon='ph--push-pin-slash--regular'
              label={t(pinned ? 'unpin.label' : 'pin.label')}
              data-testid='debugPlugin.pin'
              onClick={handlePinChange}
            />
            {onClose && <SystemIconButton.Close variant='ghost' iconOnly onClick={onClose} />}
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <Tabs.Panel value='console' classNames='dx-expand'>
            <DebugConsole fit />
          </Tabs.Panel>
          <Tabs.Panel value='logs' classNames='dx-expand'>
            <LoggerPanel />
          </Tabs.Panel>
        </Panel.Content>
      </Panel.Root>
    </Tabs.Root>
  );
};

DebugPanel.displayName = 'DebugPanel';
