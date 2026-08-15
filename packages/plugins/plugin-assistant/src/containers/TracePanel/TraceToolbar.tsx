//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Icon, Input, Separator, Toolbar, useTranslation } from '@dxos/react-ui';
import { Combobox } from '@dxos/react-ui-list';

import { type OperationTagScope } from '#execution-graph';
import { meta } from '#meta';

import { tagIcon } from './trace-filter';

export type TraceToolbarProps = {
  /** Tags currently shown. */
  selected: readonly string[];
  /** Every tag offered, in menu order (see `availableOperationTags`). */
  available: readonly string[];
  onSelectedChange: (tags: readonly string[]) => void;
  /** How deep the tag selection reaches. */
  scope: OperationTagScope;
  onScopeChange: (scope: OperationTagScope) => void;
  /** Whether the live process tree is shown above the timeline. */
  processTree: boolean;
  onProcessTreeChange: (processTree: boolean) => void;
};

/**
 * Trace panel toolbar.
 *
 * Both controls are deliberately reticent: bare icons, no visible state, so the default view reads
 * as "the trace" rather than "a filtered trace". What is on only shows once the user asks.
 */
export const TraceToolbar = ({
  selected,
  available,
  onSelectedChange,
  scope,
  onScopeChange,
  processTree,
  onProcessTreeChange,
}: TraceToolbarProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [query, setQuery] = useState('');
  const label = (tag: string) => t(`trace-tag-${tag}.label`, { defaultValue: tag });
  const filtered = useMemo(
    () => available.filter((tag) => label(tag).toLowerCase().includes(query.toLowerCase())),
    [available, query, t],
  );
  const handleScopeChange = useCallback(
    (allLevels: boolean) => onScopeChange(allLevels ? 'all' : 'top-level'),
    [onScopeChange],
  );

  return (
    <Toolbar.Root density='sm' classNames='border-be border-subdued-separator'>
      <Toolbar.Toggle
        variant='ghost'
        pressed={processTree}
        onPressedChange={onProcessTreeChange}
        aria-label={t('trace-processes.menu')}
        data-testid='tracePanel.processes'
      >
        <Icon icon='ph--tree-structure--regular' size={4} />
      </Toolbar.Toggle>

      <div role='none' className='grow' />

      <Combobox.Root multiple value={selected} onValueChange={onSelectedChange}>
        {/* The toolbar owns the control's metrics, so the trigger is one of its own icon buttons. */}
        <Combobox.Trigger asChild>
          <Toolbar.IconButton
            iconOnly
            variant='ghost'
            icon='ph--funnel--regular'
            label={t('trace-filter.menu')}
            data-testid='tracePanel.filter'
          />
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
            {/* Outside the listbox: a setting about the selection, not a member of it. */}
            <Separator classNames='mlb-1' />
            <Input.Root>
              <div
                role='none'
                className='flex items-center gap-2 pli-(--dx-control-pad) min-h-(--dx-control) cursor-default'
              >
                <Input.Label classNames='w-0 grow truncate'>{t('trace-filter-scope.label')}</Input.Label>
                <Input.Switch
                  checked={scope === 'all'}
                  onCheckedChange={handleScopeChange}
                  data-testid='tracePanel.filterScope'
                />
              </div>
            </Input.Root>
            <Combobox.Arrow />
          </Combobox.Content>
        </Combobox.Portal>
      </Combobox.Root>
    </Toolbar.Root>
  );
};

TraceToolbar.displayName = 'TraceToolbar';
