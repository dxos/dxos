//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useMemo, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { Icon, IconButton, Input, Tag, type ThemedClassName } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { type Actor, type Task } from '@dxos/types';

export type TaskStatus = NonNullable<Task.Task['status']>;

/** Linear-style status groups, most active first. */
export const STATUS_ORDER: TaskStatus[] = ['in-progress', 'todo', 'done', 'failed', 'cancelled'];

const DEFAULT_STATUS_LABELS: Record<TaskStatus, string> = {
  'in-progress': 'In progress',
  'todo': 'Todo',
  'done': 'Done',
  'failed': 'Failed',
  'cancelled': 'Cancelled',
};

export type TaskPatch = Partial<Pick<Task.Task, 'title' | 'status' | 'priority' | 'estimate' | 'assignee'>>;

export type TaskListProps = ThemedClassName<{
  tasks: readonly Task.Task[];
  /** Group rows into status sections (Linear order); flat list otherwise. */
  groupByStatus?: boolean;
  /** i18n hook for group headings; defaults to English labels. */
  statusLabel?: (status: TaskStatus) => string;
  /** Renders an add row; called with the trimmed title on Enter. */
  onTaskCreate?: (title: string) => void;
  /** Enables the done toggle (status patch) and any future field affordances. */
  onTaskUpdate?: (task: Task.Task, patch: TaskPatch) => void;
  /** Renders a per-row delete affordance. */
  onTaskDelete?: (task: Task.Task) => void;
  /** Row click. */
  onTaskSelect?: (task: Task.Task) => void;
  createPlaceholder?: string;
}>;

/**
 * List of durable {@link Task} objects with optional CRUD affordances — every mutation is
 * delegated to a callback (typically a `TaskOperation` invocation), never performed here.
 */
export const TaskList = ({
  classNames,
  tasks,
  groupByStatus = true,
  statusLabel = (status) => DEFAULT_STATUS_LABELS[status],
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onTaskSelect,
  createPlaceholder = 'Add task',
}: TaskListProps) => {
  const groups = useMemo(() => {
    if (!groupByStatus) {
      return tasks.length > 0 ? [{ status: undefined, tasks }] : [];
    }
    return STATUS_ORDER.map((status) => ({
      status,
      tasks: tasks.filter((task) => (task.status ?? 'todo') === status),
    })).filter((group) => group.tasks.length > 0);
  }, [tasks, groupByStatus]);

  return (
    <div className='flex flex-col min-w-0'>
      <Listbox.Root>
        <Listbox.Viewport classNames={['dx-container', classNames]}>
          <Listbox.Content aria-label='Tasks'>
            {groups.map(({ status, tasks }) => (
              <React.Fragment key={status ?? 'all'}>
                {status && <div className='px-2 pt-3 pb-1 text-xs text-subdued uppercase'>{statusLabel(status)}</div>}
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onUpdate={onTaskUpdate}
                    onDelete={onTaskDelete}
                    onSelect={onTaskSelect}
                  />
                ))}
              </React.Fragment>
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
      {onTaskCreate && <TaskCreateRow placeholder={createPlaceholder} onCreate={onTaskCreate} />}
    </div>
  );
};

type TaskRowProps = {
  task: Task.Task;
  onUpdate?: TaskListProps['onTaskUpdate'];
  onDelete?: TaskListProps['onTaskDelete'];
  onSelect?: TaskListProps['onTaskSelect'];
};

const TaskRow = ({ task, onUpdate, onDelete, onSelect }: TaskRowProps) => {
  const done = task.status === 'done';
  const handleToggle = useCallback(() => onUpdate?.(task, { status: done ? 'todo' : 'done' }), [onUpdate, task, done]);

  return (
    <Listbox.Item id={task.id} classNames='py-0 group'>
      <div className='flex items-center gap-2 min-w-0'>
        {onUpdate ? (
          <IconButton
            variant='ghost'
            density='sm'
            icon={done ? 'ph--check--regular' : 'ph--circle--regular'}
            iconOnly
            label={done ? 'Mark todo' : 'Mark done'}
            classNames={done ? 'text-success-text' : undefined}
            onClick={handleToggle}
          />
        ) : (
          <Icon
            icon={done ? 'ph--check--regular' : 'ph--circle--regular'}
            classNames={done ? 'text-success-text' : undefined}
            size={4}
          />
        )}
        <span
          className={onSelect ? 'truncate flex-1 cursor-pointer' : 'truncate flex-1'}
          onClick={onSelect ? () => onSelect(task) : undefined}
        >
          {task.title}
        </span>
        {task.priority && task.priority !== 'none' && <Tag hue='neutral'>{task.priority}</Tag>}
        {task.assignee && <AssigneeChip assignee={task.assignee} />}
        {onDelete && (
          <IconButton
            variant='ghost'
            density='sm'
            icon='ph--x--regular'
            iconOnly
            label='Delete task'
            classNames='invisible group-hover:visible'
            onClick={() => onDelete(task)}
          />
        )}
      </div>
    </Listbox.Item>
  );
};

type TaskCreateRowProps = {
  placeholder: string;
  onCreate: (title: string) => void;
};

const TaskCreateRow = ({ placeholder, onCreate }: TaskCreateRowProps) => {
  const [title, setTitle] = useState('');
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const trimmed = title.trim();
      if (event.key === 'Enter' && trimmed.length > 0) {
        onCreate(trimmed);
        setTitle('');
      }
    },
    [title, onCreate],
  );

  return (
    <div className='flex items-center gap-2 px-2 py-1'>
      <Icon icon='ph--plus--regular' size={4} classNames='text-subdued' />
      <Input.Root>
        <Input.TextInput
          variant='subdued'
          placeholder={placeholder}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Input.Root>
    </div>
  );
};

/**
 * Actor-aware assignee chip: a Person ref resolves to the contact's name; otherwise fall back to
 * name, email, or a shortened DID; agents (`role: 'assistant'`) are marked with a sparkle.
 */
export const AssigneeChip = ({ assignee }: { assignee: Actor.Actor }) => {
  const [contact] = useObject(assignee.contact);
  const label =
    contact?.fullName ??
    assignee.name ??
    assignee.email ??
    (assignee.identityDid ? shortDid(assignee.identityDid) : undefined);
  const agent = assignee.role === 'assistant';
  if (!label && !agent) {
    return null;
  }

  return (
    <Tag hue={agent ? 'purple' : 'indigo'}>
      {agent && <Icon icon='ph--sparkle--regular' size={3} classNames='inline-block me-1' />}
      {label ?? 'agent'}
    </Tag>
  );
};

const shortDid = (did: string): string => `${did.slice(0, 12)}…`;
