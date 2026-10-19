//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef } from 'react';

import type * as PluginManager from '@dxos/app-framework/PluginManager';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';

import { meta } from '#meta';

export type PluginFailureBadgeProps = {
  failure: PluginManager.PluginFailure;
  /** Size of the warning icon. */
  size?: ComponentPropsWithoutRef<typeof Button.Root>['iconSize'];
};

/**
 * Compact warning glyph rendered next to a plugin's name when it has failed
 * to load or activate. Clicking the icon opens a popover that names the phase
 * (load / activation), the reason (timeout / error), and the underlying error
 * message — enough for an operator to tell "remote host is offline" apart
 * from "the plugin crashed".
 */
export const PluginFailureBadge = ({ failure, size }: PluginFailureBadgeProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button.Root
          variant='destructive'
          icon='ph--warning--bold'
          iconOnly
          showTooltip={false}
          iconSize={size}
          label={t('failure-badge.label')}
          data-testid={`pluginFailureBadge.${failure.id}`}
          onClick={(event) => event.stopPropagation()}
        />
      </Popover.Trigger>
      <Popover.Content>
        <Popover.Body>
          <Layout.Flex column gap='xs' classNames='px-3 py-2 min-w-[18rem] max-w-[28rem]'>
            <p className='font-medium text-sm'>
              {t('failure-title.label', {
                phase: failure.phase === 'load' ? t('failure-phase-load.label') : t('failure-phase-activation.label'),
                reason:
                  failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure-reason-error.label'),
              })}
            </p>
            <p className='text-fg-muted text-sm break-words'>{failure.error.message}</p>
          </Layout.Flex>
        </Popover.Body>
      </Popover.Content>
    </Popover.Root>
  );
};
