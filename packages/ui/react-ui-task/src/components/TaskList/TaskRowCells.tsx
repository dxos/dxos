//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import { Task } from '@dxos/types';
import { getHashHue, mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import {
  UNSET_ICON,
  estimateTextStyle,
  priorityIcon,
  priorityTextStyle,
  statusIcon,
  statusTextStyle,
} from '../../util/status-icons.ts';
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
  const { t } = Hooks.useTranslation(translationKey);
  const [snapshot] = useObject(task);
  const status = snapshot.status ?? 'todo';
  // Derived from the task rather than wired down from the list: a task an agent has taken and
  // started is being worked right now whoever renders it, and the row is the only place that says
  // so. A human-started task keeps the static glyph.
  const working = active ?? Task.isAgentWorking(snapshot);
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
      <Layout.Block aria-hidden={false} data-testid='taskList.item.status' classNames={classNames}>
        <Icon.Icon icon={icon} classNames={iconClassNames} />
        <span className='sr-only'>{t(`status-${status}.label`)}</span>
      </Layout.Block>
    );
  }

  // The button is the trigger, not the block: the button stops the click so the row is not selected
  // too, and a trigger above it would never receive it. The block still gives every control in the
  // row one rail-item square.
  const trigger = (
    <Button.Root
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
    <Layout.Block classNames={classNames}>
      {/* Deferred: a list renders one of these per task, and the menu is opened for at most one. */}
      <ActionMenu deferUntilOpen actions={actions}>
        {trigger}
      </ActionMenu>
    </Layout.Block>
  );
};

TaskStatusControl.displayName = 'TaskList.StatusControl';

export type TaskMnemonicProps = {
  task: Obj.Unknown | Obj.Snapshot;
  /** The row's number down the list, shown in place of the clipboard until the button is hovered. */
  ordinal?: number;
  classNames?: string;
};

/**
 * The task's reference: a button in the task's mnemonic hue that copies it. With an ordinal it shows the number, and
 * the clipboard only on hover; without one, the clipboard. At least as wide as the clipboard button, so a one-digit
 * number does not make a narrower target.
 *
 * Copies the task's full `echo://<space>/<id>` URI rather than the mnemonic it names: a mnemonic is only unique enough
 * to read, while the URI resolves the task from anywhere it is pasted — a prompt, an MCP call, another space.
 */
export const TaskMnemonic = ({ task, ordinal, classNames }: TaskMnemonicProps) => {
  const mnemonic = Obj.getMnemonic(task);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The pending reset would otherwise set state on an unmounted component.
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  // Confirmed only once the write resolves: `writeText` rejects when the document is unfocused or permission is
  // refused, and a check shown before that would report a copy that never happened.
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    void navigator.clipboard
      .writeText(Obj.getURI(task, { prefer: 'absolute' }).toString())
      .then(() => {
        setCopied(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 1_000);
      })
      .catch(() => setCopied(false));
  };

  const icon = <Icon.Icon icon={copied ? 'ph--check--regular' : 'ph--clipboard--regular'} />;
  return (
    <Tooltip.Trigger asChild content={mnemonic}>
      <Button.Root
        size='sm'
        compact
        // Hashed from the mnemonic so the task's Gantt lane, which hashes the same string, shares its hue.
        hue={getHashHue(mnemonic)}
        aria-label={mnemonic}
        data-testid='taskList.item.mnemonic'
        classNames={mx('group justify-center min-w-(--dx-control-size) font-mono tabular-nums', classNames)}
        onClick={handleClick}
      >
        {ordinal === undefined || copied ? (
          icon
        ) : (
          <>
            <span data-testid='taskList.item.ordinal' className='group-hover:hidden'>
              {ordinal}
            </span>
            <span className='hidden group-hover:contents'>{icon}</span>
          </>
        )}
      </Button.Root>
    </Tooltip.Trigger>
  );
};

TaskMnemonic.displayName = 'TaskList.Mnemonic';

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
  const { t } = Hooks.useTranslation(translationKey);
  return (
    // `IconBlock square` so the box is centred in the same square an `IconButton iconOnly` occupies;
    // bare, the 1rem box hugged the start of a 2rem track beside 2rem controls.
    <Layout.Block aria-hidden={false} classNames={classNames}>
      <Field.Root>
        <Input.Checkbox
          checked={checked}
          data-testid='taskList.item.checkbox'
          aria-label={t('task-check.label')}
          onCheckedChange={() => onCheckedChange(task)}
          // The row is the selection target; checking it must not also make it the current row.
          onClick={(event) => event.stopPropagation()}
        />
      </Field.Root>
    </Layout.Block>
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
export const TaskEstimateControl = ({ task, classNames }: { task: Task.Task; classNames?: string }) => {
  const { onTaskUpdate } = useTaskListContext('TaskList.EstimateControl');
  const [estimate] = useObject(task, 'estimate');
  return (
    <TaskEstimatePicker
      estimate={estimate}
      onChange={onTaskUpdate && ((estimate) => onTaskUpdate(task, { estimate: estimate ?? null }))}
      testId='taskList.item.estimate'
      classNames={classNames}
    />
  );
};

export type TaskEstimatePickerProps = {
  estimate?: Task.Estimate;
  /** Omitted for a readonly label. */
  onChange?: (estimate: Task.Estimate | undefined) => void;
  testId?: string;
  classNames?: string;
};

/** The estimate label and its menu over a bare value, for a row's task or a draft that has none yet. */
export const TaskEstimatePicker = ({ estimate, onChange, testId, classNames }: TaskEstimatePickerProps) => {
  const label = estimate?.toUpperCase() ?? <Icon.Icon icon={UNSET_ICON} classNames='text-neutral-500' />;

  if (!onChange) {
    return <Layout.Block classNames={mx(estimateTextStyle(estimate), classNames)}>{label}</Layout.Block>;
  }

  return (
    <Layout.Block classNames={classNames}>
      {/* Deferred: a list renders one of these per task, and the menu is opened for at most one. */}
      <ActionMenu
        deferUntilOpen
        actions={() =>
          [Task.NullOption, ...Task.EstimateOptions].map(({ id, title }) =>
            createMenuAction(`estimate-${id}`, () => onChange(id === 'none' ? undefined : id), {
              label: title,
              checked: (estimate ?? 'none') === id,
            }),
          )
        }
      >
        <Button.Root
          variant='ghost'
          data-testid={testId}
          classNames={mx('w-8 px-0 text-xs tabular-nums', estimateTextStyle(estimate))}
          onClick={(event: MouseEvent) => event.stopPropagation()}
        >
          {label}
        </Button.Root>
      </ActionMenu>
    </Layout.Block>
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
export const TaskPriorityIcon = ({ task, classNames }: { task: Task.Task; classNames?: string }) => {
  const { onTaskUpdate } = useTaskListContext('TaskList.PriorityIcon');
  const [priority] = useObject(task, 'priority');
  return (
    <TaskPriorityPicker
      priority={priority ?? undefined}
      onChange={onTaskUpdate && ((priority) => onTaskUpdate(task, { priority: priority ?? null }))}
      testId='taskList.item.priority'
      classNames={classNames}
    />
  );
};

export type TaskPriorityPickerProps = {
  priority?: Task.Priority;
  /** Omitted for a readonly glyph. */
  onChange?: (priority: Task.Priority | undefined) => void;
  testId?: string;
  classNames?: string;
};

/** The priority glyph and its menu over a bare value, for a row's task or a draft that has none yet. */
export const TaskPriorityPicker = ({ priority, onChange, testId, classNames }: TaskPriorityPickerProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const icon = priorityIcon(priority);
  const styles = priorityTextStyle(priority);

  if (!onChange) {
    // Falls back to the dot rather than rendering nothing: a readonly row still says "no priority"
    // in the same column its neighbours use, so the list reads as one column and not a ragged one.
    return (
      <Layout.Block classNames={classNames}>
        <Icon.Icon icon={icon} classNames={mx(styles)} />
      </Layout.Block>
    );
  }

  return (
    <Layout.Block classNames={classNames}>
      {/* Deferred: a list renders one of these per task, and the menu is opened for at most one. */}
      <ActionMenu
        deferUntilOpen
        actions={() =>
          [Task.NullOption, ...Task.PriorityOptions].map(({ id, icon: optionIcon }) =>
            createMenuAction(`priority-${id}`, () => onChange(id === 'none' ? undefined : id), {
              label: t(`priority-${id}.label`),
              // `None` takes the row's unset glyph, so every option has an icon and the labels align.
              icon: optionIcon ?? UNSET_ICON,
              iconClassNames: priorityTextStyle(id),
              checked: (priority ?? 'none') === id,
            }),
          )
        }
      >
        <Button.Root
          variant='ghost'
          icon={icon}
          iconOnly
          label={t('task-priority.label')}
          data-testid={testId}
          iconClassNames={styles}
          onClick={(event) => event.stopPropagation()}
        />
      </ActionMenu>
    </Layout.Block>
  );
};
