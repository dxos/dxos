//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, IconButton, Tag, useTranslation } from '@dxos/react-ui';
import { Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { STATUS_ICONS } from './status-icons';

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
  const done = status === 'done';
  // A started agent task is actively being worked by a sub-agent (started is stamped at spawn), so
  // it spins; a human-started task keeps the static glyph.
  const { icon, classNames: iconClassNames } = active
    ? { icon: 'ph--spinner--regular', classNames: 'text-info-text animate-spin' }
    : STATUS_ICONS[status];

  if (!onTaskUpdate) {
    return (
      <span className={mx('grid h-8 place-items-center', classNames)}>
        <Icon icon={icon} classNames={iconClassNames} size={4} />
        <span className='sr-only'>{t(`status-${status}.label`)}</span>
      </span>
    );
  }

  return (
    <IconButton
      classNames={mx('shrink-0', iconClassNames, classNames)}
      variant='ghost'
      density='sm'
      icon={icon}
      iconOnly
      label={done ? t('mark-todo.label') : t('mark-done.label')}
      onClick={(event) => {
        // The row is the selection target; the status control must not also select it.
        event.stopPropagation();
        onTaskUpdate(task, { status: done ? 'todo' : 'done' });
      }}
    />
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
