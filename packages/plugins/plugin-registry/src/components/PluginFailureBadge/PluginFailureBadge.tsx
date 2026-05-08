//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type PluginManager } from '@dxos/app-framework';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

// Mirrors react-ui `Icon`'s `size` prop literal subset; kept inline so we don't
// have to add `@dxos/ui-types` as a dep just for one type alias.
type IconSize = 4 | 5 | 6 | 8;

export type PluginFailureBadgeProps = {
  failure: PluginManager.PluginFailure;
  /** Optional override for the trigger icon's tailwind classes. */
  classNames?: string;
  /** Visual size of the warning icon (passed through to react-ui `<Icon />`). */
  size?: IconSize;
};

/**
 * Compact warning glyph rendered next to a plugin's name when it has failed
 * to load or activate. Clicking the icon opens a popover that names the phase
 * (load / activation), the reason (timeout / error), and the underlying error
 * message — enough for an operator to tell "remote host is offline" apart
 * from "the plugin crashed".
 */
export const PluginFailureBadge = ({ failure, classNames, size = 4 }: PluginFailureBadgeProps) => {
  const { t } = useTranslation(meta.id);

  const phaseLabel = failure.phase === 'load' ? t('failure-phase-load.label') : t('failure-phase-activation.label');
  const reasonLabel =
    failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure-reason-error.label');

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type='button'
          aria-label={t('failure-badge.label')}
          data-testid={`pluginFailureBadge.${failure.id}`}
          className='inline-flex items-center justify-center text-warning hover:text-warning-hover cursor-pointer'
          // Don't bubble up to row click handlers (e.g. the card's `onClick`
          // that opens the details pane). The popover is the action here.
          onClick={(event) => event.stopPropagation()}
        >
          <Icon icon='ph--warning--bold' size={size} classNames={mx(classNames)} />
        </button>
      </Popover.Trigger>
      <Popover.Content>
        <Popover.Viewport>
          <div className='px-3 py-2 min-w-[18rem] max-w-[28rem] flex flex-col gap-1'>
            <p className='font-medium text-sm'>
              {t('failure-title.label', { phase: phaseLabel, reason: reasonLabel })}
            </p>
            <p className='text-description text-sm break-words'>{failure.error.message}</p>
          </div>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};
