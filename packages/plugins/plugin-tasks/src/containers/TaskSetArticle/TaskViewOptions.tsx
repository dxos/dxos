//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { ActionMenu, createLineSeparator, createMenuAction, createMenuItemGroup } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { TaskSetView } from '#types';

const SORT_ICONS: Record<TaskSetView.SortField, string> = {
  manual: 'ph--hand-grabbing--regular',
  status: 'ph--circle-half--regular',
  priority: 'ph--cell-signal-high--regular',
  estimate: 'ph--ruler--regular',
  created: 'ph--calendar-plus--regular',
  updated: 'ph--clock-clockwise--regular',
  title: 'ph--text-aa--regular',
};

const GROUP_ICONS: Record<TaskSetView.GroupField, string> = {
  none: 'ph--list--regular',
  status: 'ph--circle-half--regular',
  priority: 'ph--cell-signal-high--regular',
  assignee: 'ph--user--regular',
  milestone: 'ph--flag-banner--regular',
};

export type TaskSortMenuProps = {
  value: TaskSetView.Sort;
  onChange: (value: TaskSetView.Sort) => void;
};

/**
 * The order-by field and its direction, as one menu beside the filter. `Manual` is the set's own
 * order — the one a drag writes — so it is the only field without a direction to pick.
 */
export const TaskSortMenu = ({ value, onChange }: TaskSortMenuProps) => {
  const { t } = useTranslation(meta.profile.key);
  const sorted = value.field !== 'manual';

  const group = useMemo(
    () =>
      createMenuItemGroup('taskSort', {
        label: t('sort.label'),
        icon: 'ph--sort-ascending--regular',
        variant: 'dropdownMenu',
        selectCardinality: 'single',
        value: value.field,
      }),
    [t, value.field],
  );

  const actions = useCallback(
    () => [
      ...TaskSetView.SortField.literals.map((field) =>
        createMenuAction(`sort-${field}`, () => onChange({ ...value, field }), {
          label: t(`sort-${field}.label`),
          icon: SORT_ICONS[field],
          checked: value.field === field,
          testId: `tasks.sort.${field}`,
        }),
      ),
      createLineSeparator('taskSortSeparator').nodes[0],
      ...TaskSetView.SortDirection.literals.map((direction) =>
        createMenuAction(`sort-${direction}`, () => onChange({ ...value, direction }), {
          label: t(`sort-${direction}.label`),
          icon: direction === 'asc' ? 'ph--sort-ascending--regular' : 'ph--sort-descending--regular',
          checked: sorted && value.direction === direction,
          disabled: !sorted,
          testId: `tasks.sort.${direction}`,
        }),
      ),
    ],
    [value, sorted, onChange, t],
  );

  return (
    <ActionMenu deferUntilOpen group={group} actions={actions}>
      <IconButton
        // The trigger names the order while it is not the set's own, so a reader can tell why the
        // rows are not where they dragged them.
        icon={
          !sorted
            ? 'ph--arrows-down-up--regular'
            : value.direction === 'asc'
              ? 'ph--sort-ascending--regular'
              : 'ph--sort-descending--regular'
        }
        iconOnly={!sorted}
        label={sorted ? t('sort-by.label', { field: t(`sort-${value.field}.label`) }) : t('sort.label')}
        data-testid='tasks.sort'
      />
    </ActionMenu>
  );
};

TaskSortMenu.displayName = 'TaskSortMenu';

export type TaskGroupMenuProps = {
  value: TaskSetView.GroupField;
  onChange: (value: TaskSetView.GroupField) => void;
};

/** What the list is grouped by, as a single-select menu beside the sort. */
export const TaskGroupMenu = ({ value, onChange }: TaskGroupMenuProps) => {
  const { t } = useTranslation(meta.profile.key);
  const grouped = value !== 'none';

  const group = useMemo(
    () =>
      createMenuItemGroup('taskGroup', {
        label: t('group.label'),
        icon: 'ph--rows--regular',
        variant: 'dropdownMenu',
        selectCardinality: 'single',
        value,
      }),
    [t, value],
  );

  const actions = useCallback(
    () =>
      TaskSetView.GroupField.literals.map((field) =>
        createMenuAction(`group-${field}`, () => onChange(field), {
          label: t(`group-${field}.label`),
          icon: GROUP_ICONS[field],
          checked: value === field,
          testId: `tasks.group.${field}`,
        }),
      ),
    [value, onChange, t],
  );

  return (
    <ActionMenu deferUntilOpen group={group} actions={actions}>
      <IconButton
        icon={grouped ? GROUP_ICONS[value] : 'ph--rows--regular'}
        iconOnly={!grouped}
        label={grouped ? t('group-by.label', { field: t(`group-${value}.label`) }) : t('group.label')}
        data-testid='tasks.group'
      />
    </ActionMenu>
  );
};

TaskGroupMenu.displayName = 'TaskGroupMenu';
