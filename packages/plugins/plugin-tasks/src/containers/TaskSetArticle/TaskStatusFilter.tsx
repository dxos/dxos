//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { ActionMenu, createLineSeparator, createMenuAction, createMenuItemGroup } from '@dxos/react-ui-menu';
import { statusIcon, statusTextStyle } from '@dxos/react-ui-task';
import { Task } from '@dxos/types';

import { meta } from '#meta';

/** Every status the schema offers, in the order the schema lists them. */
export const ALL_STATUSES: readonly Task.Status[] = Task.StatusOptions.map(({ id }) => id);

export type TaskStatusFilterProps = {
  /** The statuses the list shows. Every status is the unfiltered state. */
  value: readonly Task.Status[];
  onChange: (value: readonly Task.Status[]) => void;
  /** Whether anything narrows the list — the query too, not just the statuses this menu hides. */
  active?: boolean;
};

/**
 * Which statuses the ledger shows, as a menu of checkboxes beside the query editor.
 *
 * A menu rather than a row of toggles: nine statuses would fill the toolbar, and hiding a status is
 * a decision a reader makes once and reads off the trigger afterwards. Multi-select, so the menu
 * stays open across several toggles — picking one value and closing is single-select behaviour.
 *
 * Separate from the query editor rather than written into its text as `status:` terms: the terms are
 * one value each, so hiding two statuses cannot be said in the query language the editor parses, and
 * a reader narrowing by text should not have their status choice rewritten under them.
 */
export const TaskStatusFilter = ({ value, onChange, active }: TaskStatusFilterProps) => {
  const { t } = useTranslation(meta.profile.key);
  const selected = useMemo(() => new Set(value), [value]);
  const filtered = selected.size < ALL_STATUSES.length;
  const narrowed = active || filtered;

  // The group carries no items of its own — it is the context that makes the items checkboxes rather
  // than radios, and the menu stay open while they are toggled.
  const group = useMemo(
    () =>
      createMenuItemGroup('taskStatusFilter', {
        label: t('filter-status.label'),
        icon: 'ph--funnel--regular',
        variant: 'dropdownMenu',
        selectCardinality: 'multiple',
        value: [...value],
      }),
    [t, value],
  );

  const handleToggle = useCallback(
    (status: Task.Status) =>
      onChange(selected.has(status) ? value.filter((entry) => entry !== status) : [...value, status]),
    [selected, value, onChange],
  );

  // A thunk, so the menu builds its items when it is opened rather than on every keystroke in the
  // query editor beside it.
  const actions = useCallback(
    () => [
      ...Task.StatusOptions.map(({ id, title }) =>
        createMenuAction(`status-${id}`, () => handleToggle(id), {
          label: title,
          icon: statusIcon(id),
          iconClassNames: statusTextStyle(id),
          checked: selected.has(id),
          testId: `tasks.filter.status.${id}`,
        }),
      ),
      createLineSeparator('taskStatusFilterSeparator').nodes[0],
      createMenuAction('status-all', () => onChange(ALL_STATUSES), {
        label: t('filter-status-all.label'),
        icon: 'ph--list-checks--regular',
        disabled: !filtered,
        testId: 'tasks.filter.status.all',
      }),
      createMenuAction('status-none', () => onChange([]), {
        label: t('filter-status-none.label'),
        icon: 'ph--prohibit--regular',
        disabled: selected.size === 0,
        testId: 'tasks.filter.status.none',
      }),
    ],
    [selected, filtered, handleToggle, onChange, t],
  );

  return (
    <ActionMenu deferUntilOpen group={group} actions={actions}>
      <IconButton
        // Filled and accented while anything narrows the list, so the trigger says rows are missing
        // without the reader opening it; the accent survives the toolbar dimming icons at rest.
        icon={narrowed ? 'ph--funnel--fill' : 'ph--funnel--regular'}
        iconClassNames={narrowed ? 'text-accent-text' : undefined}
        data-filtered={narrowed ? 'true' : 'false'}
        iconOnly
        label={t('filter-status.label')}
        data-testid='tasks.filter.status'
      />
    </ActionMenu>
  );
};

TaskStatusFilter.displayName = 'TaskStatusFilter';
