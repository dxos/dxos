//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { StatusBar } from '@dxos/plugin-status-bar/components';
import { type DebugPortController, getDebugPortController } from '@dxos/react-client/devtools';
import { IconButton, Popover, useTranslation } from '@dxos/react-ui';
import { useViewState } from '@dxos/react-ui-attention';

import { meta } from '#meta';

import { DEBUG_PANEL_CONTEXT, DebugPanel, debugPanelAspect } from '../DebugPanel';

export type DebugPanelStatusProps = {
  /** Injectable for stories/tests; defaults to the page-wide controller. */
  controller?: DebugPortController;
};

/**
 * Status-bar button opening the debug panel. The red dot marks a live agent debug port — an agent
 * can evaluate code in this page — so it must be visible without opening settings.
 */
export const DebugPanelStatus = ({ controller = getDebugPortController() }: DebugPanelStatusProps) => {
  const { t } = useTranslation(meta.profile.key);
  const subscribe = useCallback((listener: () => void) => controller.subscribe(listener), [controller]);
  const getStatus = useCallback(() => controller.getStatus(), [controller]);
  const status = useSyncExternalStore(subscribe, getStatus);
  // Controlled so the panel's toolbar close button can dismiss the popover.
  const [open, setOpen] = useState(false);
  const { pinned } = useViewState(debugPanelAspect, DEBUG_PANEL_CONTEXT);
  const handleClose = useCallback(() => setOpen(false), []);
  // Pinning suppresses only self-dismissal; the trigger and the close button still close it.
  const handleDismiss = useCallback((event: Event) => pinned && event.preventDefault(), [pinned]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* IconButton is the direct trigger child so the trigger ref/handlers/ARIA attach to the button, not the container. */}
      <StatusBar.Item classNames='relative'>
        <Popover.Trigger asChild>
          <IconButton
            variant='ghost'
            icon='ph--terminal-window--regular'
            iconOnly
            label={status.running ? t('debug-port-status.running.label') : t('open-debug-panel.label')}
          />
        </Popover.Trigger>
        {status.running && (
          <span
            role='status'
            aria-label={t('debug-port-status.running.label')}
            data-testid='debugPlugin.portIndicator'
            className='absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 pointer-events-none'
          />
        )}
      </StatusBar.Item>
      {/* Full-width strip pinned to the bottom of the viewport: with side=top / align=center the
          panel opens horizontally centered above the status bar rather than over the trigger.
          Portaled to the body so `fixed` measures against the viewport — inside the status bar a
          transformed ancestor would re-root it next to the trigger. */}
      {createPortal(
        <Popover.Anchor asChild>
          <span role='none' className='fixed inset-x-0 bottom-0 pointer-events-none' />
        </Popover.Anchor>,
        document.body,
      )}
      <Popover.Portal>
        <Popover.Content side='top' align='center' onInteractOutside={handleDismiss} onEscapeKeyDown={handleDismiss}>
          {/* Definite size: the log table needs room to breathe and the terminal fits itself to
              whatever it is given, so neither child can size the panel. */}
          <Popover.Viewport classNames='h-[24rem] w-[64rem] max-w-[calc(100vw-4rem)]'>
            <DebugPanel onClose={handleClose} />
          </Popover.Viewport>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

DebugPanelStatus.displayName = 'DebugPanelStatus';
