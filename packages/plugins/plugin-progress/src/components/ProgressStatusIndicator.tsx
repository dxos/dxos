//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { useProgressMonitors } from '@dxos/app-toolkit/ui';
import { StatusBar } from '@dxos/plugin-status-bar/components';
import { Next, useTranslation } from '@dxos/react-ui';
import { ProgressMeter } from '@dxos/react-ui-components';

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

  return (
    <StatusBar.Item>
      <Next.Popover.Root positioning={{ placement: 'left' }}>
        <Next.Popover.Trigger asChild>
          <Next.Button
            variant='ghost'
            icon='ph--circle-notch--regular'
            iconOnly
            label={t('progress-indicator.label')}
            iconClassNames={active.length > 0 && 'animate-spin-slow text-amber-500'}
          />
        </Next.Popover.Trigger>
        {active.length > 0 && (
          <Next.Popover.Content>
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
          </Next.Popover.Content>
        )}
      </Next.Popover.Root>
    </StatusBar.Item>
  );
};

ProgressStatusIndicator.displayName = 'ProgressStatusIndicator';
