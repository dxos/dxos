//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type PluginManager } from '@dxos/app-framework';
import { IconButton, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

// Mirrors react-ui `Icon`'s `size` prop literal subset; kept inline so we don't
// have to add `@dxos/ui-types` as a dep just for one type alias.
type IconSize = 4 | 5 | 6 | 8;

export type PluginFailureBadgeProps = {
  failure: PluginManager.PluginFailure;
  /** Optional override for the trigger icon's tailwind classes. */
  iconClassNames?: string;
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
export const PluginFailureBadge = ({ failure, iconClassNames, size = 4 }: PluginFailureBadgeProps) => {
  const { t } = useTranslation(meta.id);

  const phaseLabel = failure.phase === 'load' ? t('failure-phase-load.label') : t('failure-phase-activation.label');
  const reasonLabel =
    failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure-reason-error.label');

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          variant='ghost'
          iconOnly
          noTooltip
          icon='ph--warning--bold'
          size={size}
          iconClassNames={iconClassNames}
          label={t('failure-badge.label')}
          data-testid={`pluginFailureBadge.${failure.id}`}
          // Don't bubble up to row click handlers (e.g. the card's `onClick`
          // that opens the details pane). The popover is the action here.
          onClick={(event) => event.stopPropagation()}
        />
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
