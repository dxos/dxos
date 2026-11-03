//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { ActionMenu, createLineSeparator, createMenuAction, createMenuItemGroup } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import { type Milestone } from '@dxos/types';

import { TasksNamespace } from '../../namespace.ts';

export type TaskMilestoneFilterProps = {
  milestones: readonly Milestone.Milestone[];
  /** The id of the milestone the list is narrowed to; absent shows every milestone. */
  value?: string;
  onChange: (value: string | undefined) => void;
};

export const TaskMilestoneFilter = ({ milestones, value, onChange }: TaskMilestoneFilterProps) => {
  const { t } = Hooks.useTranslation(TasksNamespace.key);
  const current = value === undefined ? undefined : milestones.find((milestone) => milestone.id === value);

  const group = useMemo(
    () =>
      createMenuItemGroup('taskMilestoneFilter', {
        label: t('filter-milestone.label'),
        icon: 'ph--flag-banner--regular',
        variant: 'dropdownMenu',
        selectCardinality: 'single',
        value: value ?? '',
      }),
    [t, value],
  );

  const actions = useCallback(
    () => [
      ...milestones.map((milestone) =>
        createMenuAction(`milestone-${milestone.id}`, () => onChange(milestone.id), {
          label: milestone.name ?? '',
          icon: 'ph--flag-banner--regular',
          checked: milestone.id === value,
          testId: `tasks.filter.milestone.${milestone.id}`,
        }),
      ),
      createLineSeparator('taskMilestoneFilterSeparator').nodes[0],
      createMenuAction('milestone-all', () => onChange(undefined), {
        label: t('filter-milestone-all.label'),
        icon: 'ph--list-checks--regular',
        disabled: value === undefined,
        testId: 'tasks.filter.milestone.all',
      }),
    ],
    [milestones, value, onChange, t],
  );

  return (
    <ActionMenu deferUntilOpen group={group} actions={actions}>
      <Button.Root
        icon={current ? 'ph--flag-banner--fill' : 'ph--flag-banner--regular'}
        iconClassNames={current ? 'text-accent-text' : undefined}
        iconOnly={!current}
        label={current?.name ?? t('filter-milestone.label')}
        data-testid='tasks.filter.milestone'
      />
    </ActionMenu>
  );
};

TaskMilestoneFilter.displayName = 'TaskMilestoneFilter';
