//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import {
  DEBUG_PANEL_CONTEXT,
  DebugPanel,
  DebugPanelHeader,
  type DebugPanelMode,
  useDebugPanelContext,
} from '../DebugPanel/index.ts';

export type DebugPanelDrawerProps = {
  /** Overridable so a story gets its own selection rather than the app's. */
  contextId?: string;
};

/**
 * The debug panel docked as the deck's bottom drawer: a title bar over the tree and the page. It
 * shares the floating window's context, so floating it keeps the tool that was open.
 */
export const DebugPanelDrawer = ({ contextId = DEBUG_PANEL_CONTEXT }: DebugPanelDrawerProps) => (
  <DebugPanel.Root contextId={contextId}>
    <DebugPanelDrawerContent />
  </DebugPanel.Root>
);

DebugPanelDrawer.displayName = 'DebugPanelDrawer';

const DebugPanelDrawerContent = () => {
  const { t } = useTranslation(meta.profile.key);
  const { mode, setMode } = useDebugPanelContext();
  const { invokePromise } = useOperationInvoker();

  // Floating asks the drawer to close so the window the status bar opens on the mode change does
  // not stay over it; docking keeps it open.
  const handleModeChange = useCallback(
    (next: DebugPanelMode) => {
      void invokePromise(LayoutOperation.UpdateDrawer, { state: next === 'floating' ? 'closed' : 'open' });
      setMode(next);
    },
    [invokePromise, setMode],
  );
  const handleClose = useCallback(
    () => void invokePromise(LayoutOperation.UpdateDrawer, { state: 'closed' }),
    [invokePromise],
  );

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root density='sm'>
          <Toolbar.Text classNames='grow'>{t('debug-panel.title')}</Toolbar.Text>
          <DebugPanelHeader mode={mode} onModeChange={handleModeChange} onClose={handleClose} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='grid'>
        <DebugPanel.Body />
      </Panel.Content>
    </Panel.Root>
  );
};
