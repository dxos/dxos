//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { Fragment, type KeyboardEvent, type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { Icon, IconButton, Input, Tag, composable, composableProps } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { type Actor, type Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

const TASK_LIST_NAME = 'TaskList.Root';

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

/**
 * One row geometry shared by `Item` and `Create` so their affordances land in the same columns:
 * a fixed icon gutter (the status toggle above the add `+`), the flexible label, then trailing
 * chips/actions pinned to the far edge. `w-full` is load-bearing — the listbox item is a flex
 * container, so without it the grid shrinks to its content and the trailing actions float
 * mid-row. `px-3` matches the listbox item's own inset, which `Create` does not inherit.
 */
const ROW_GRID = 'grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 w-full min-w-0 px-3 h-8';

//
// Context — plain Radix context (un-scoped); nesting task lists has no meaning today.
//

type TaskListContextValue = {
  tasks: readonly Task.Task[];
  groupByStatus: boolean;
  statusLabel: (status: TaskStatus) => string;
  onTaskCreate?: (title: string) => void;
  onTaskUpdate?: (task: Task.Task, patch: TaskPatch) => void;
  onTaskDelete?: (task: Task.Task) => void;
  onTaskSelect?: (task: Task.Task) => void;
};

const [TaskListProvider, useTaskListContext] = createContext<TaskListContextValue>(TASK_LIST_NAME);

//
// Root — headless context provider. Renders no DOM.
//

type TaskListRootProps = PropsWithChildren<{
  tasks: readonly Task.Task[];
  /** Group rows into status sections (Linear order); flat list otherwise. */
  groupByStatus?: boolean;
  /** i18n hook for group headings; defaults to English labels. */
  statusLabel?: (status: TaskStatus) => string;
  /** Enables `Create`; called with the trimmed title. */
  onTaskCreate?: (title: string) => void;
  /** Enables the done toggle. Every mutation is delegated — the list never writes. */
  onTaskUpdate?: (task: Task.Task, patch: TaskPatch) => void;
  /** Enables the per-row delete affordance. */
  onTaskDelete?: (task: Task.Task) => void;
  /** Row click. */
  onTaskSelect?: (task: Task.Task) => void;
}>;

const TaskListRoot = ({
  children,
  tasks,
  groupByStatus = true,
  statusLabel = (status) => DEFAULT_STATUS_LABELS[status],
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onTaskSelect,
}: TaskListRootProps) => (
  <TaskListProvider
    tasks={tasks}
    groupByStatus={groupByStatus}
    statusLabel={statusLabel}
    onTaskCreate={onTaskCreate}
    onTaskUpdate={onTaskUpdate}
    onTaskDelete={onTaskDelete}
    onTaskSelect={onTaskSelect}
  >
    {/* Both roots are headless, so the pair renders no DOM of its own. */}
    <Listbox.Root>{children}</Listbox.Root>
  </TaskListProvider>
);

TaskListRoot.displayName = 'TaskList.Root';

//
// Viewport — the scrolling region (the listbox's own viewport). `Create` sits outside it, so the
// add row stays pinned while the rows scroll.
//

type TaskListViewportProps = ComposableProps;

const TaskListViewport = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  return (
    <Listbox.Viewport {...rest} classNames={mx('min-w-0', className)} ref={forwardedRef}>
      {children}
    </Listbox.Viewport>
  );
});

TaskListViewport.displayName = 'TaskList.Viewport';

//
// Content — the rows, grouped by status when the root says so.
//

type TaskListContentProps = ComposableProps;

const TaskListContent = composable<HTMLUListElement>((props, forwardedRef) => {
  const { tasks, groupByStatus, statusLabel } = useTaskListContext('TaskList.Content');
  const { className, ...rest } = composableProps(props);
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
    <Listbox.Content {...rest} aria-label='Tasks' classNames={className} ref={forwardedRef}>
      {groups.map(({ status, tasks }) => (
        <Fragment key={status ?? 'all'}>
          {status && <TaskListGroupLabel>{statusLabel(status)}</TaskListGroupLabel>}
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} />
          ))}
        </Fragment>
      ))}
    </Listbox.Content>
  );
});

TaskListContent.displayName = 'TaskList.Content';

//
// GroupLabel
//

type TaskListGroupLabelProps = ComposableProps;

const TaskListGroupLabel = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  return (
    <div {...rest} className={mx('px-2 pt-3 pb-1 text-xs text-subdued uppercase', className)} ref={forwardedRef}>
      {children}
    </div>
  );
});

TaskListGroupLabel.displayName = 'TaskList.GroupLabel';

//
// Item — one row. Exported so a host can render its own selection of tasks.
//

type TaskListItemProps = ComposableProps<{ task: Task.Task }>;

const TaskListItem = composable<HTMLLIElement, { task: Task.Task }>(({ task, ...props }, forwardedRef) => {
  const { onTaskUpdate, onTaskDelete, onTaskSelect } = useTaskListContext('TaskList.Item');
  const { className, ...rest } = composableProps(props);
  // Subscribe per row: a query re-emits when membership changes, not when a task's own fields do,
  // so a rename elsewhere (task form, agent, sync) would otherwise leave the row stale.
  const [snapshot] = useObject(task);
  const current = snapshot ?? task;
  const done = current.status === 'done';
  const handleToggle = useCallback(
    () => onTaskUpdate?.(task, { status: done ? 'todo' : 'done' }),
    [onTaskUpdate, task, done],
  );

  return (
    // `px-0` hands the horizontal inset to `ROW_GRID`, so the row shares the create row's columns.
    <Listbox.Item {...rest} id={task.id} classNames={mx('px-0 py-0 group', className)} ref={forwardedRef}>
      <div role='none' data-testid='taskList.item' className={ROW_GRID}>
        {onTaskUpdate ? (
          <IconButton
            variant='ghost'
            density='xs'
            icon={done ? 'ph--check--regular' : 'ph--circle--regular'}
            iconOnly
            label={done ? 'Mark todo' : 'Mark done'}
            classNames={mx('justify-self-center', done && 'text-success-text')}
            onClick={handleToggle}
          />
        ) : (
          <Icon
            icon={done ? 'ph--check--regular' : 'ph--circle--regular'}
            classNames={mx('justify-self-center', done && 'text-success-text')}
            size={4}
          />
        )}
        <span
          className={onTaskSelect ? 'truncate cursor-pointer' : 'truncate'}
          onClick={onTaskSelect ? () => onTaskSelect(task) : undefined}
        >
          {current.title}
        </span>
        <div className='flex items-center gap-1'>
          {current.priority && current.priority !== 'none' && <Tag hue='neutral'>{current.priority}</Tag>}
          {current.assignee && <TaskListAssignee assignee={current.assignee} />}
          {onTaskDelete && (
            <IconButton
              variant='ghost'
              density='xs'
              icon='ph--x--regular'
              iconOnly
              label='Delete task'
              classNames='invisible group-hover:visible'
              onClick={() => onTaskDelete(task)}
            />
          )}
        </div>
      </div>
    </Listbox.Item>
  );
});

TaskListItem.displayName = 'TaskList.Item';

//
// Create — the add row; renders nothing unless the root supplies `onTaskCreate`.
//

type TaskListCreateProps = ComposableProps<{ placeholder?: string }>;

const TaskListCreate = composable<HTMLDivElement, { placeholder?: string }>(
  ({ placeholder = 'Add task', ...props }, forwardedRef) => {
    const { onTaskCreate } = useTaskListContext('TaskList.Create');
    const { className, ...rest } = composableProps(props);
    const [title, setTitle] = useState('');
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        const trimmed = title.trim();
        if (event.key === 'Enter' && trimmed.length > 0) {
          onTaskCreate?.(trimmed);
          setTitle('');
        }
      },
      [title, onTaskCreate],
    );

    if (!onTaskCreate) {
      return null;
    }

    return (
      <div {...rest} data-testid='taskList.create' className={mx(ROW_GRID, className)} ref={forwardedRef}>
        <Icon icon='ph--plus--regular' size={4} classNames='justify-self-center text-subdued' />
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
  },
);

TaskListCreate.displayName = 'TaskList.Create';

//
// Assignee — actor-aware chip: a Person ref resolves to the contact's name; otherwise fall back to
// name, email, or a shortened DID; agents (`role: 'assistant'`) are marked with a sparkle.
//

type TaskListAssigneeProps = { assignee: Actor.Actor };

const TaskListAssignee = composable<HTMLSpanElement, TaskListAssigneeProps>(({ assignee }, _forwardedRef) => {
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
});

TaskListAssignee.displayName = 'TaskList.Assignee';

const shortDid = (did: string): string => `${did.slice(0, 12)}…`;

//
// TaskList
//

export const TaskList = {
  Root: TaskListRoot,
  Viewport: TaskListViewport,
  Content: TaskListContent,
  GroupLabel: TaskListGroupLabel,
  Item: TaskListItem,
  Create: TaskListCreate,
  Assignee: TaskListAssignee,
};

export type {
  TaskListAssigneeProps,
  TaskListContentProps,
  TaskListCreateProps,
  TaskListGroupLabelProps,
  TaskListItemProps,
  TaskListRootProps,
  TaskListViewportProps,
};
