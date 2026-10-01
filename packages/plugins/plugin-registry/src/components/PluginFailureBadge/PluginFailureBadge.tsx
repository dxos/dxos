//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef } from 'react';

import type * as PluginManager from '@dxos/app-framework/PluginManager';
import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';

export type PluginFailureBadgeProps = {
  failure: PluginManager.PluginFailure;
  /** Size of the warning icon. */
  size?: ComponentPropsWithoutRef<typeof Next.Button>['iconSize'];
};

/**
 * Compact warning glyph rendered next to a plugin's name when it has failed
 * to load or activate. Clicking the icon opens a popover that names the phase
 * (load / activation), the reason (timeout / error), and the underlying error
 * message — enough for an operator to tell "remote host is offline" apart
 * from "the plugin crashed".
 */
export const PluginFailureBadge = ({ failure, size }: PluginFailureBadgeProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Next.Popover.Root>
      <Next.Popover.Trigger asChild>
        <Next.Button
          variant='destructive'
          icon='ph--warning--bold'
          iconOnly
          showTooltip={false}
          iconSize={size}
          label={t('failure-badge.label')}
          data-testid={`pluginFailureBadge.${failure.id}`}
          onClick={(event) => event.stopPropagation()}
        />
      </Next.Popover.Trigger>
      <Next.Popover.Content>
        <Next.Popover.Body>
          <div className='px-3 py-2 min-w-[18rem] max-w-[28rem] flex flex-col gap-1'>
            <p className='font-medium text-sm'>
              {t('failure-title.label', {
                phase: failure.phase === 'load' ? t('failure-phase-load.label') : t('failure-phase-activation.label'),
                reason:
                  failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure-reason-error.label'),
              })}
            </p>
            <p className='text-description text-sm break-words'>{failure.error.message}</p>
          </div>
        </Next.Popover.Body>
      </Next.Popover.Content>
    </Next.Popover.Root>
  );
};
