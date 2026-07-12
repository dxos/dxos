//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ProgressMeter, useProgressMonitors } from '@dxos/app-toolkit/ui';
import { StatusBar } from '@dxos/plugin-status-bar/components';
import { IconButton, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

/**
 * R0 rail status indicator: shows a spinner icon while any provider is active and, on click, a
 * popover listing every active provider as a {@link ProgressMeter}. Renders nothing when no
 * provider is active, so the rail stays clean when idle.
 */
export const ProgressStatusIndicator = () => {
  const { t } = useTranslation(meta.profile.key);
  const registry = useCapability(AppCapabilities.ProgressRegistry);
  const monitors = useProgressMonitors();
  const active = monitors.filter((monitor) => monitor.status === 'running' || monitor.status === 'pending');

  if (active.length === 0) {
    return null;
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <IconButton
            variant='ghost'
            icon='ph--spinner-gap--regular'
            iconOnly
            label={t('progress-indicator.label')}
            classNames='animate-spin-slow'
          />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='left'>
          <div className='flex flex-col gap-3 w-[260px] p-2'>
            {active.map((monitor) => (
              <ProgressMeter key={monitor.name} state={monitor} onCancel={() => registry.cancel(monitor.name)} />
            ))}
          </div>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

ProgressStatusIndicator.displayName = 'ProgressStatusIndicator';
