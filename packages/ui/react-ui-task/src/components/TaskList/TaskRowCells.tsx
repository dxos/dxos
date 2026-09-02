//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, IconBlock, IconButton, Tag, useTranslation } from '@dxos/react-ui';
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
  /** Whether the assignee is an agent actively working the task; its glyph spins. */
  active?: boolean;
  classNames?: string;
};

/** The status glyph, which is also the control that completes the task. */
export const TaskStatusControl = ({ task, onTaskUpdate, active, classNames }: TaskStatusControlProps) => {
  const { t } = useTranslation(translationKey);
  const status = task.status ?? 'todo';
  // A started agent task is actively being worked by a sub-agent (started is stamped at spawn), so
  // it spins; a human-started task keeps the static glyph.
  const { icon, classNames: iconClassNames } = active
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
        <IconButton
          data-testid='taskList.item.status'
          classNames={mx('shrink-0', classNames)}
          // The hue goes on the icon, not the button: the row dims icons through `--icons-color`,
          // which the `Icon` root reads, so a colour set on the button is overridden at rest and
          // only reappears once selection invalidates the variable.
          iconClassNames={iconClassNames}
          variant='ghost'
          density='sm'
          icon={icon}
          iconOnly
          label={t('task-status.label')}
          // The row is the selection target; opening the menu must not also select it.
          onClick={(event) => event.stopPropagation()}
        />
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
    <Tag hue={hue} classNames={mx('tabular-nums', classNames)}>
      {ordinal}
    </Tag>
  );
};

TaskOrdinal.displayName = 'TaskList.Ordinal';
