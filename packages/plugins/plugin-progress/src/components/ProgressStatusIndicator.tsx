//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as StatusBar from '@dxos/plugin-status-bar/StatusBar';
import { ProgressMeter } from '@dxos/react-ui-components';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as IconButton from '@dxos/react-ui/IconButton';
import * as Popover from '@dxos/react-ui/Popover';

import { meta } from '#meta';

/**
 * R0 rail status indicator: shows a spinner icon while any provider is active and, on click, a
 * popover listing every active provider as a {@link ProgressMeter}. Renders nothing when no
 * provider is active, so the rail stays clean when idle.
 */
export const ProgressStatusIndicator = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const registry = AppHooks.useCapability(AppCapabilities.ProgressRegistry);
  const monitors = ToolkitHooks.useProgressMonitors();
  const active = monitors.filter((monitor) => monitor.status === 'running' || monitor.status === 'pending');

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <IconButton.Root
            variant='ghost'
            icon='ph--circle-notch--regular'
            iconOnly
            label={t('progress-indicator.label')}
            iconClassNames={active.length > 0 && 'animate-spin-slow text-amber-500'}
          />
        </StatusBar.Item>
      </Popover.Trigger>
      {active.length > 0 && (
        <Popover.Portal>
          <Popover.Content side='left' border>
            <div className='flex flex-col gap-1 w-[18rem] p-1 overflow-hidden'>
              {active.map((monitor) => (
                <ProgressMeter
                  key={monitor.name}
                  delay={0}
                  state={monitor}
                  onCancel={() => registry.cancel(monitor.name)}
                />
              ))}
            </div>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
};

ProgressStatusIndicator.displayName = 'ProgressStatusIndicator';
