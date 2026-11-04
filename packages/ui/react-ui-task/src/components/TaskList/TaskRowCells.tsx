//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as Typography from '@dxos/react-ui/Typography';
import { Task } from '@dxos/types';
import { getHashHue, mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { TaskField } from './TaskField.tsx';
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

const useAgentWorking = (task: Task.Task): boolean =>
  useAtomValue(useMemo(() => Atom.make((get) => Task.isAgentWorking(get(Obj.atom(task)))), [task]));

export const TaskStatusControl = ({ task, onTaskUpdate, active, classNames }: TaskStatusControlProps) => {
  const [status] = useObject(task, 'status');
  const agentWorking = useAgentWorking(task);
  return (
    <TaskField
      field='status'
      value={status ?? undefined}
      working={active ?? agentWorking}
      onChange={onTaskUpdate && ((status) => onTaskUpdate(task, { status }))}
      testId='taskList.item.status'
      classNames={classNames}
    />
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

export const TaskPriorityControl = ({ task, classNames }: { task: Task.Task; classNames?: string }) => {
  const { onTaskUpdate } = useTaskListContext('TaskList.PriorityControl');
  const [priority] = useObject(task, 'priority');
  return (
    <TaskField
      field='priority'
      value={priority ?? undefined}
      onChange={onTaskUpdate && ((priority) => onTaskUpdate(task, { priority: priority ?? null }))}
      testId='taskList.item.priority'
      classNames={classNames}
    />
  );
};

TaskPriorityControl.displayName = 'TaskList.PriorityControl';

export const TaskEstimateControl = ({ task, classNames }: { task: Task.Task; classNames?: string }) => {
  const { onTaskUpdate } = useTaskListContext('TaskList.EstimateControl');
  const [estimate] = useObject(task, 'estimate');
  return (
    <TaskField
      field='estimate'
      value={estimate ?? undefined}
      onChange={onTaskUpdate && ((estimate) => onTaskUpdate(task, { estimate: estimate ?? null }))}
      testId='taskList.item.estimate'
      classNames={classNames}
    />
  );
};

TaskEstimateControl.displayName = 'TaskList.EstimateControl';

export const TaskEstimateLabel = ({ estimate }: { estimate?: Task.Estimate }) =>
  estimate ? (
    <Typography.Text asChild tone='muted' data-testid='taskList.item.estimate'>
      <span>{estimate.toUpperCase()}</span>
    </Typography.Text>
  ) : null;

TaskEstimateLabel.displayName = 'TaskList.EstimateLabel';
