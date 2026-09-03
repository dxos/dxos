//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, IconBlock, IconButton, Input, Tag, useTranslation } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { STATUS_ICONS, statusTextStyle } from './status-icons';

/**
 * Cells shared by the flat row and the tree row.
 *
 * The two paths differ only in their container — a `Listbox.Item` in a grid the list owns, versus an
 * Ark tree row whose anatomy splits content across a heading and a columns slot. That is a
 * difference in where cells are handed to the renderer, not in what a cell contains, so the cells
 * live here and both paths render the same ones. Written after the tree's own copies drifted:
 * a cruder status map, and a selected row whose icons faded.
 */

export type TaskStatusControlProps = {
  task: Task.Task;
  /** Absent for a readonly list, which renders the glyph without the control. */
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  /**
   * Overrides whether the glyph spins. Defaults to {@link Task.isAgentWorking} — a host passes this
   * only when it knows something the task does not, e.g. that the session behind it has stopped.
   */
  active?: boolean;
  classNames?: string;
};

/** The status glyph, which is also the control that completes the task. */
export const TaskStatusControl = ({ task, onTaskUpdate, active, classNames }: TaskStatusControlProps) => {
  const { t } = useTranslation(translationKey);
  const status = task.status ?? 'todo';
  // Derived from the task rather than wired down from the list: a task an agent has taken and
  // started is being worked right now whoever renders it, and the row is the only place that says
  // so. A human-started task keeps the static glyph.
  const working = active ?? Task.isAgentWorking(task);
  const { icon, classNames: iconClassNames } = working
    ? { icon: 'ph--spinner--regular', classNames: 'text-info-text animate-spin' }
    : { icon: STATUS_ICONS[status].icon, classNames: statusTextStyle(status) };

  if (!onTaskUpdate) {
    // `IconBlock square` rather than a bare span: the glyph must hold the same square an
    // `IconButton iconOnly` occupies, or the readonly list's status column collapses to the glyph's
    // own width and stops lining up with the editable list's.
    return (
      <IconBlock square aria-hidden={false} data-testid='taskList.item.status' classNames={classNames}>
        <Icon icon={icon} classNames={iconClassNames} size={4} />
        <span className='sr-only'>{t(`status-${status}.label`)}</span>
      </IconBlock>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        {/* The block, not the button, is the trigger: the same `IconBlock > IconButton` shape as
            the priority cell, so every control in the row is one rail-item square. */}
        <IconBlock square classNames={classNames}>
          <IconButton
            data-testid='taskList.item.status'
            // The hue goes on the icon, not the button: the row dims icons through `--icons-color`,
            // which the `Icon` root reads, so a colour set on the button is overridden at rest and
            // only reappears once selection invalidates the variable.
            iconClassNames={iconClassNames}
            variant='ghost'
            icon={icon}
            iconOnly
            label={t('task-status.label')}
            // The row is the selection target; opening the menu must not also select it.
            onClick={(event) => event.stopPropagation()}
          />
        </IconBlock>
      </Menu.Trigger>
      {/* Sourced from the schema's own option table, so the picker offers exactly what the field
          accepts and carries the same hue the form's select paints it with. */}
      <Menu.Content
        items={Task.StatusOptions.map(({ id }) =>
          createMenuAction(`status-${id}`, () => onTaskUpdate(task, { status: id }), {
            label: t(`status-${id}.label`),
            icon: STATUS_ICONS[id].icon,
            iconClassNames: statusTextStyle(id),
            checked: status === id,
          }),
        )}
      />
    </Menu.Root>
  );
};

TaskStatusControl.displayName = 'TaskList.StatusControl';

export type TaskOrdinalProps = {
  task: Task.Task;
  ordinal: number;
  classNames?: string;
};

/** The gutter's ordinal, tinted by outcome so a scan down the column reads as progress. */
export const TaskOrdinal = ({ task, ordinal, classNames }: TaskOrdinalProps) => {
  const status = task.status ?? 'todo';
  const hue = status === 'done' ? 'green' : status === 'failed' || status === 'cancelled' ? 'rose' : 'neutral';
  return (
    // The same square every other cell in the row occupies, so the badge centres under the pane's
    // column rather than hugging the track's start.
    <IconBlock square aria-hidden={false} classNames={classNames}>
      <Tag hue={hue} classNames='tabular-nums'>
        {ordinal}
      </Tag>
    </IconBlock>
  );
};

TaskOrdinal.displayName = 'TaskList.Ordinal';

export type TaskCheckboxProps = {
  task: Task.Task;
  checked: boolean;
  onCheckedChange: (task: Task.Task) => void;
  classNames?: string;
};

/**
 * The gutter's checkbox: which rows an action will act on, never a status write — completing a task
 * is what the status control does. It takes the ordinal's cell rather than a column of its own, so a
 * list that offers it keeps one row geometry and the trailing controls do not shift.
 */
export const TaskCheckbox = ({ task, checked, onCheckedChange, classNames }: TaskCheckboxProps) => {
  const { t } = useTranslation(translationKey);
  return (
    // `IconBlock square` so the box is centred in the same square an `IconButton iconOnly` occupies;
    // bare, the 1rem box hugged the start of a 2rem track beside 2rem controls.
    <IconBlock square aria-hidden={false} classNames={classNames}>
      <Input.Root>
        <Input.Checkbox
          checked={checked}
          data-testid='taskList.item.checkbox'
          aria-label={t('task-check.label')}
          onCheckedChange={() => onCheckedChange(task)}
          // The row is the selection target; checking it must not also make it the current row.
          onClick={(event) => event.stopPropagation()}
        />
      </Input.Root>
    </IconBlock>
  );
};

TaskCheckbox.displayName = 'TaskList.Checkbox';
