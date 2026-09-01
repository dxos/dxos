//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { StatusBar } from '@dxos/plugin-status-bar/components';
import { type DebugPortController, getDebugPortController } from '@dxos/react-client/devtools';
import { IconButton, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { DebugConsole } from '../DebugConsole/index.ts';

export type DebugPortStatusProps = {
  /** Injectable for stories/tests; defaults to the page-wide controller. */
  controller?: DebugPortController;
};

/**
 * Status-bar console button. The red dot marks a live agent debug port — an agent can evaluate
 * code in this page — so it must be visible without opening settings. The popover hosts the same
 * Effect-CLI console as the devtools CLI panel.
 */
export const DebugPortStatus = ({ controller = getDebugPortController() }: DebugPortStatusProps) => {
  const { t } = useTranslation(meta.profile.key);
  const subscribe = useCallback((listener: () => void) => controller.subscribe(listener), [controller]);
  const getStatus = useCallback(() => controller.getStatus(), [controller]);
  const status = useSyncExternalStore(subscribe, getStatus);
  // Controlled so the console's toolbar close button can dismiss the popover.
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* IconButton is the direct trigger child so the trigger ref/handlers/ARIA attach to the button, not the container. */}
      <StatusBar.Item classNames='relative'>
        <Popover.Trigger asChild>
          <IconButton
            variant='ghost'
            icon='ph--terminal-window--regular'
            iconOnly
            label={status.running ? t('debug-port-status.running.label') : t('open-console.label')}
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
          console opens horizontally centered above the status bar rather than over the trigger.
          Portaled to the body so `fixed` measures against the viewport — inside the status bar a
          transformed ancestor would re-root it next to the trigger. */}
      {createPortal(
        <Popover.Anchor asChild>
          <span role='none' className='fixed inset-x-0 bottom-0 pointer-events-none' />
        </Popover.Anchor>,
        document.body,
      )}
      <Popover.Portal>
        <Popover.Content side='top' align='center'>
          {/* No fixed size: the console's fixed-grid terminal sets the width and height, so the
              popover hugs the cell grid with no rounding slack at the edges. */}
          <Popover.Viewport>
            <DebugConsole onClose={handleClose} />
          </Popover.Viewport>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

DebugPortStatus.displayName = 'DebugPortStatus';
