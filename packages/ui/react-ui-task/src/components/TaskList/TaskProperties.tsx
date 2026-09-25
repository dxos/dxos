//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Button, Column, Icon, IconBlock, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ActionMenu, type MenuAction, createMenuAction } from '@dxos/react-ui-menu';
import { Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import {
  UNSET_ICON,
  estimateTextStyle,
  priorityIcon,
  priorityTextStyle,
  statusIcon,
  statusTextStyle,
} from './status-icons.ts';

/** The glyph for an estimate, which the list renders as letters and has none of its own. */
const ESTIMATE_ICON = 'ph--ruler--regular';

export type TaskPropertiesProps = ThemedClassName<{
  task: Task.Task;
  /** Absent renders the properties read-only, as the list's readonly cells do. */
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
}>;

/**
 * A task's own fields as a labelled list: one row each for status, priority and estimate, the glyph
 * naming the field and the value beside it.
 *
 * A list rather than the row of icon buttons the task list uses. A row has one line and many tasks,
 * so a glyph alone is the only thing that fits and the reader learns the ramp; a detail pane has one
 * task and the room to say what the glyph means — and an unset field can then invite the value
 * ("Set estimate") instead of showing a dot that reads as a value of its own.
 */
export const TaskProperties = ({ task, onTaskUpdate, classNames }: TaskPropertiesProps) => {
  const { t } = useTranslation(translationKey);
  const status = task.status ?? 'todo';
  const priority = task.priority ?? undefined;
  const estimate = task.estimate ?? undefined;

  return (
    <Column.Section
      label={t('task-properties.label')}
      gap='sm'
      classNames={classNames}
      data-testid='taskList.properties'
    >
      <TaskProperty
        icon={statusIcon(status)}
        iconClassNames={statusTextStyle(status)}
        label={t(`status-${status}.label`)}
        testId='taskList.property.status'
        actions={
          onTaskUpdate &&
          (() =>
            Task.StatusOptions.map(({ id }) =>
              createMenuAction(`status-${id}`, () => onTaskUpdate(task, { status: id }), {
                label: t(`status-${id}.label`),
                icon: statusIcon(id),
                iconClassNames: statusTextStyle(id),
                checked: status === id,
              }),
            ))
        }
      />

      <TaskProperty
        icon={priorityIcon(priority)}
        iconClassNames={priorityTextStyle(priority)}
        label={priority ? t(`priority-${priority}.label`) : t('set-priority.label')}
        unset={!priority}
        testId='taskList.property.priority'
        actions={
          onTaskUpdate &&
          (() =>
            [Task.NullOption, ...Task.PriorityOptions].map(({ id, icon }) =>
              createMenuAction(`priority-${id}`, () => onTaskUpdate(task, { priority: id === 'none' ? null : id }), {
                label: t(`priority-${id}.label`),
                icon,
                iconClassNames: priorityTextStyle(id),
                checked: (priority ?? 'none') === id,
              }),
            ))
        }
      />

      <TaskProperty
        icon={estimate ? ESTIMATE_ICON : UNSET_ICON}
        iconClassNames={estimateTextStyle(estimate)}
        label={estimate ? estimate.toUpperCase() : t('set-estimate.label')}
        unset={!estimate}
        testId='taskList.property.estimate'
        actions={
          onTaskUpdate &&
          (() =>
            [Task.NullOption, ...Task.EstimateOptions].map(({ id, title }) =>
              createMenuAction(`estimate-${id}`, () => onTaskUpdate(task, { estimate: id === 'none' ? null : id }), {
                label: title,
                checked: (estimate ?? 'none') === id,
              }),
            ))
        }
      />
    </Column.Section>
  );
};

TaskProperties.displayName = 'TaskList.Properties';

type TaskPropertyProps = {
  icon: string;
  iconClassNames?: string;
  label: ReactNode;
  /** No value yet: the label invites one, so it reads as a prompt rather than as the value. */
  unset?: boolean;
  testId: string;
  /** Absent renders the row as text — the readonly case, and the row is then not a button. */
  actions?: () => MenuAction[];
};

const TaskProperty = ({ icon, iconClassNames, label, unset, testId, actions }: TaskPropertyProps) => {
  const content = (
    <>
      {/* Unset takes the label's own hue, not the value palette's neutral: they are different
          greys, and with the same asterisk on both rows the mismatch read as a meaning the rows do
          not carry. A value keeps the hue its option table gives it. */}
      <IconBlock classNames='size-6'>
        <Icon icon={icon} classNames={mx('shrink-0', unset ? 'text-description' : iconClassNames)} />
      </IconBlock>
      <span className={mx('min-w-0 pe-1.5 truncate', unset && 'text-description')}>{label}</span>
    </>
  );

  if (!actions) {
    return (
      <div className='flex items-center gap-2 min-w-0 px-1' data-testid={testId}>
        {content}
      </div>
    );
  }

  return (
    // Deferred, as the row's controls are: the menu is built when it is opened, not when the pane
    // renders three of them.
    <ActionMenu deferUntilOpen actions={actions}>
      <Button variant='ghost' density='sm' classNames='w-fit justify-start px-0 gap-1' data-testid={testId}>
        {content}
      </Button>
    </ActionMenu>
  );
};
