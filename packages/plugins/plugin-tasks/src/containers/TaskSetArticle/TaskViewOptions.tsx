//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { GroupMenu, SortMenu } from '@dxos/react-ui-menu';
import * as Hooks from '@dxos/react-ui/Hooks';

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
 * The order-by field and its direction. `Manual` is the set's own order — the one a drag writes — so
 * it is the only field without a direction to pick.
 */
export const TaskSortMenu = ({ value, onChange }: TaskSortMenuProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const fields = useMemo(
    () => TaskSetView.SortField.literals.map((id) => ({ id, label: t(`sort-${id}.label`), icon: SORT_ICONS[id] })),
    [t],
  );
  const directionLabels = useMemo(() => ({ asc: t('sort-asc.label'), desc: t('sort-desc.label') }), [t]);
  return (
    <SortMenu
      fields={fields}
      value={value}
      onChange={onChange}
      label={t('sort.label')}
      directionLabels={directionLabels}
      unsorted='manual'
      testId='tasks.sort'
    />
  );
};

TaskSortMenu.displayName = 'TaskSortMenu';

export type TaskGroupMenuProps = {
  value: TaskSetView.GroupField;
  onChange: (value: TaskSetView.GroupField) => void;
};

/** What the list is grouped by, as a single-select menu beside the sort. */
export const TaskGroupMenu = ({ value, onChange }: TaskGroupMenuProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const fields = useMemo(
    () => TaskSetView.GroupField.literals.map((id) => ({ id, label: t(`group-${id}.label`), icon: GROUP_ICONS[id] })),
    [t],
  );
  return (
    <GroupMenu
      fields={fields}
      value={value}
      onChange={onChange}
      label={t('group.label')}
      none='none'
      testId='tasks.group'
    />
  );
};

TaskGroupMenu.displayName = 'TaskGroupMenu';
