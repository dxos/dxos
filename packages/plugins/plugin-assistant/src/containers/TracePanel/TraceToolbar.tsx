//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Toolbar, useTranslation } from '@dxos/react-ui';
import { Combobox } from '@dxos/react-ui-list';

import { meta } from '#meta';

import { tagIcon } from './trace-filter';

export type TraceToolbarProps = {
  /** Tags currently shown. */
  selected: readonly string[];
  /** Every tag offered, in menu order (see `availableOperationTags`). */
  available: readonly string[];
  onSelectedChange: (tags: readonly string[]) => void;
};

/**
 * Trace panel toolbar.
 *
 * The filter is deliberately reticent: the trigger is a bare funnel, so the default view reads as
 * "the trace" rather than "a filtered trace", and the current selection only appears once the user
 * asks for it.
 */
export const TraceToolbar = ({ selected, available, onSelectedChange }: TraceToolbarProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [query, setQuery] = useState('');
  const label = (tag: string) => t(`trace-tag-${tag}.label`, { defaultValue: tag });
  const filtered = useMemo(
    () => available.filter((tag) => label(tag).toLowerCase().includes(query.toLowerCase())),
    [available, query, t],
  );

  return (
    <Toolbar.Root density='sm' classNames='justify-end border-be border-subdued-separator'>
      <Combobox.Root multiple value={selected} onValueChange={onSelectedChange}>
        {/* The toolbar owns the control's metrics, so the trigger is one of its own icon buttons. */}
        <Combobox.Trigger asChild>
          <Toolbar.IconButton iconOnly variant='ghost' icon='ph--funnel--regular' label={t('trace-filter.menu')} />
        </Combobox.Trigger>
        {/* Portalled: rendered inline, the popover is clipped by the panel's grid and scroll areas.
            The portal also cuts it off from the panel's density, so it carries its own. */}
        <Combobox.Portal>
          <Combobox.Content align='end' classNames='dx-density-sm'>
            <Combobox.Input
              autoFocus
              density='sm'
              placeholder={t('trace-filter.placeholder')}
              value={query}
              onValueChange={setQuery}
            />
            <Combobox.List>
              {filtered.map((tag) => (
                <Combobox.Item key={tag} value={tag} label={label(tag)} icon={tagIcon(tag)} />
              ))}
            </Combobox.List>
            <Combobox.Arrow />
          </Combobox.Content>
        </Combobox.Portal>
      </Combobox.Root>
    </Toolbar.Root>
  );
};

TraceToolbar.displayName = 'TraceToolbar';
