//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

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
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { mode, setMode } = useDebugPanelContext();
  const { invokePromise } = Hooks.useOperationInvoker();

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
      <Panel.Header>
        <Toolbar.Root size='sm'>
          <Toolbar.Text classNames='grow'>{t('debug-panel.title')}</Toolbar.Text>
          <DebugPanelHeader mode={mode} onModeChange={handleModeChange} onClose={handleClose} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='grid'>
        <DebugPanel.Body />
      </Panel.Body>
    </Panel.Root>
  );
};
