//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useSyncExternalStore } from 'react';

import { CliPanel } from '@dxos/plugin-devtools/containers';
import { StatusBar } from '@dxos/plugin-status-bar/components';
import { type DebugPortController, getDebugPortController } from '@dxos/react-client/devtools';
import { IconButton, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

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

  return (
    <Popover.Root>
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
      <Popover.Portal>
        <Popover.Content side='top'>
          <Popover.Viewport classNames='w-[40rem] h-[24rem]'>
            <CliPanel />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

DebugPortStatus.displayName = 'DebugPortStatus';
