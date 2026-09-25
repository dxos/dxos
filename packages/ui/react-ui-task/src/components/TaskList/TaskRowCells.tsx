//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Button, Field, Icon, IconBlock, IconButton, SystemIconButton, Tag, useTranslation } from '@dxos/react-ui';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu';
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
import { useTaskListContext } from './TaskListContext.ts';

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
  classNames?: string;
  /**
   * Overrides whether the glyph spins. Defaults to {@link Task.isAgentWorking} — a host passes this
   * only when it knows something the task does not, e.g. that the session behind it has stopped.
   */
  active?: boolean;
  task: Task.Task;
  /** Absent for a readonly list, which renders the glyph without the control. */
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
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
    : { icon: statusIcon(status), classNames: statusTextStyle(status) };

  // Sourced from the schema's own option table, so the picker offers exactly what the field accepts
  // and carries the same hue the form's select paints it with. A thunk, so a row that is never
  // opened builds neither the options nor their labels.
  const actions = useCallback(
    () =>
      Task.StatusOptions.map(({ id }) =>
        createMenuAction(`status-${id}`, () => onTaskUpdate?.(task, { status: id }), {
          label: t(`status-${id}.label`),
          icon: statusIcon(id),
          iconClassNames: statusTextStyle(id),
          checked: status === id,
        }),
      ),
    [onTaskUpdate, task, status, t],
  );

  if (!onTaskUpdate) {
    // `IconBlock square` rather than a bare span: the glyph must hold the same square an
    // `IconButton iconOnly` occupies, or the readonly list's status column collapses to the glyph's
    // own width and stops lining up with the editable list's.
    return (
      <IconBlock square aria-hidden={false} data-testid='taskList.item.status' classNames={classNames}>
        <Icon icon={icon} classNames={iconClassNames} />
        <span className='sr-only'>{t(`status-${status}.label`)}</span>
      </IconBlock>
    );
  }

  // The button is the trigger, not the block: the button stops the click so the row is not selected
  // too, and a trigger above it would never receive it. The block still gives every control in the
  // row one rail-item square.
  const trigger = (
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
  );

  return (
    <IconBlock square classNames={classNames}>
      {/* Deferred: a list renders one of these per task, and the menu is opened for at most one. */}
      <ActionMenu deferUntilOpen actions={actions}>
        {trigger}
      </ActionMenu>
    </IconBlock>
  );
};

TaskStatusControl.displayName = 'TaskList.StatusControl';

/**
 * The task's mnemonic, as a chip that copies a reference to it.
 *
 * Copies `@mnemonic` rather than the bare id: that is the form an agent is addressed with, so what
 * lands on the clipboard can be pasted into a prompt as it stands.
 */
export const TaskMnemonic = ({
  task,
  classNames,
}: {
  // A snapshot too: the row reads its subject off one, and the mnemonic comes from the id, which a
  // snapshot carries like the object does.
  task: Obj.Unknown | Obj.Snapshot;
  classNames?: string;
}) => (
  <SystemIconButton.Clipboard
    classNames={mx('font-mono', classNames)}
    density='sm'
    variant='tag'
    hue='emerald'
    label={Obj.getMnemonic(task)}
    iconEnd
    onCopy={() => '@' + Obj.getMnemonic(task)}
    data-testid='taskList.item.mnemonic'
  />
);

TaskMnemonic.displayName = 'TaskList.Mnemonic';

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
  classNames?: string;
  task: Task.Task;
  checked: boolean;
  onCheckedChange: (task: Task.Task) => void;
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
      <Field.Root>
        <Field.Checkbox
          checked={checked}
          data-testid='taskList.item.checkbox'
          aria-label={t('task-check.label')}
          onCheckedChange={() => onCheckedChange(task)}
          // The row is the selection target; checking it must not also make it the current row.
          onClick={(event) => event.stopPropagation()}
        />
      </Field.Root>
    </IconBlock>
  );
};

TaskCheckbox.displayName = 'TaskList.Checkbox';

/**
 * Estimate as its own label rather than a glyph: the sizes are a vocabulary a reader already knows
 * (`XS`…`XL`), and two ordinal ramps side by side would be read as one. Rendered on every row so
 * setting an estimate never depends on discovering a hover affordance, and falling back to
 * {@link UNSET_ICON} when unset — the same dot the priority column shows, so a row with neither set
 * reads as two empty controls rather than a dash beside a dot.
 */
export const TaskEstimateControl = ({ task }: { task: Task.Task }) => {
  const { onTaskUpdate } = useTaskListContext('TaskList.EstimateControl');
  const estimate = task.estimate;
  const label = estimate?.toUpperCase() ?? <Icon icon={UNSET_ICON} classNames='text-neutral-500' />;

  if (!onTaskUpdate) {
    return <IconBlock classNames={estimateTextStyle(estimate)}>{label}</IconBlock>;
  }

  return (
    <>
      <IconBlock>
        {/* Deferred: a list renders one of these per task, and the menu is opened for at most one. */}
        <ActionMenu
          deferUntilOpen
          actions={() =>
            [Task.NullOption, ...Task.EstimateOptions].map(({ id, title }) =>
              createMenuAction(`estimate-${id}`, () => onTaskUpdate(task, { estimate: id === 'none' ? null : id }), {
                label: title,
                checked: (estimate ?? 'none') === id,
              }),
            )
          }
        >
          <Button
            variant='ghost'
            data-testid='taskList.item.estimate'
            classNames={mx('w-8 px-0 text-xs tabular-nums', estimateTextStyle(estimate))}
            onClick={(event: MouseEvent) => event.stopPropagation()}
          >
            {label}
          </Button>
        </ActionMenu>
      </IconBlock>
    </>
  );
};

TaskEstimateControl.displayName = 'TaskList.EstimateControl';

/**
 * Priority as a signal-strength glyph rather than a word: the four levels are ordinal, so a ramp
 * reads at a glance where four differently-worded tags do not. `urgent` breaks the ramp deliberately
 * — it is a different kind of statement from "how much", and a filled mark carries that.
 *
 * The glyph is also the control: it opens a menu to set the level. It renders on every row —
 * including one with no priority, which shows a dot — so setting a priority never depends on
 * discovering a hover affordance.
 */
export const TaskPriorityIcon = ({ task }: { task: Task.Task }) => {
  const { t } = useTranslation(translationKey);
  const { onTaskUpdate } = useTaskListContext('TaskList.PriorityIcon');
  const priority = task.priority ?? undefined;
  const icon = priorityIcon(priority);
  const styles = priorityTextStyle(priority);

  if (!onTaskUpdate) {
    // Falls back to the dot rather than rendering nothing: a readonly row still says "no priority"
    // in the same column its neighbours use, so the list reads as one column and not a ragged one.
    return (
      <IconBlock square>
        <Icon icon={icon} classNames={mx('shrink-0', styles)} />
      </IconBlock>
    );
  }

  return (
    <IconBlock>
      {/* Deferred: a list renders one of these per task, and the menu is opened for at most one. */}
      <ActionMenu
        deferUntilOpen
        actions={() =>
          [Task.NullOption, ...Task.PriorityOptions].map(({ id, icon: optionIcon }) =>
            createMenuAction(`priority-${id}`, () => onTaskUpdate(task, { priority: id === 'none' ? null : id }), {
              label: t(`priority-${id}.label`),
              icon: optionIcon,
              iconClassNames: priorityTextStyle(id),
              checked: priority === id,
            }),
          )
        }
      >
        <IconButton
          variant='ghost'
          icon={icon}
          iconOnly
          label={t('task-priority.label')}
          data-testid='taskList.item.priority'
          iconClassNames={styles}
          onClick={(event) => event.stopPropagation()}
        />
      </ActionMenu>
    </IconBlock>
  );
};
