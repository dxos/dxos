//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';

import { tagIcon, toggleOperationTag } from './trace-filter';

export type TraceToolbarProps = {
  /** Tags currently shown. */
  selected: readonly string[];
  /** Every tag offered, in menu order (see `availableOperationTags`). */
  available: readonly string[];
  onSelectedChange: (tags: string[]) => void;
};

/**
 * Trace panel toolbar.
 *
 * The filter is deliberately reticent: the trigger is a bare funnel, so the default view reads as
 * "the trace" rather than "a filtered trace", and the current selection only appears once the user
 * asks for it.
 */
export const TraceToolbar = ({ selected, available, onSelectedChange }: TraceToolbarProps) => {
  const handleToggle = useCallback(
    (tag: string) => onSelectedChange(toggleOperationTag(selected, tag, available)),
    [selected, available, onSelectedChange],
  );

  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'operationTags',
          {
            label: ['trace-filter.menu', { ns: meta.profile.key }],
            icon: 'ph--funnel--regular',
            iconOnly: true,
            variant: 'dropdownMenu',
            selectCardinality: 'multiple',
            value: [...selected],
            testId: 'tracePanel.filter',
          },
          (group) => {
            for (const tag of available) {
              group.action(
                tag,
                {
                  // A plugin may define its own tag; fall back to the raw tag rather than a missing key.
                  label: [`trace-tag-${tag}.label`, { ns: meta.profile.key, defaultValue: tag }],
                  icon: tagIcon(tag),
                  checked: selected.includes(tag),
                },
                () => handleToggle(tag),
              );
            }
            group.separator('line');
            group.action(
              'all',
              { label: ['trace-filter-all.label', { ns: meta.profile.key }], icon: 'ph--list-checks--regular' },
              () => onSelectedChange([...available]),
            );
            group.action(
              'none',
              { label: ['trace-filter-none.label', { ns: meta.profile.key }], icon: 'ph--prohibit--regular' },
              () => onSelectedChange([]),
            );
          },
        )
        .build(),
    [selected, available, handleToggle, onSelectedChange],
  );

  return (
    <Menu.Root {...menu} alwaysActive>
      <Menu.Toolbar classNames='justify-end border-be border-subdued-separator'>
        <Menu.Items />
      </Menu.Toolbar>
    </Menu.Root>
  );
};

TraceToolbar.displayName = 'TraceToolbar';
