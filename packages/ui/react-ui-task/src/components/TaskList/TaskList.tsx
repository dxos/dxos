//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { Fragment, type KeyboardEvent, type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import {
  Icon,
  IconButton,
  IconButtonProps,
  Input,
  Tag,
  composable,
  composableProps,
  useTranslation,
} from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { type Actor, type Task, TaskSet } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

const TASK_LIST_NAME = 'TaskList.Root';

/** Linear-style status groups, most active first. */
export const STATUS_ORDER: Task.Status[] = ['started', 'todo', 'done', 'failed', 'cancelled'];

/** Fallback status labels. */
const DEFAULT_STATUS_LABELS: Record<Task.Status, string> = {
  started: 'Started',
  todo: 'To Do',
  done: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export type TaskPatch = Partial<Pick<Task.Task, 'title' | 'status' | 'priority' | 'estimate' | 'assignee'>>;

//
// Context — plain Radix context (un-scoped); nesting task lists has no meaning today.
//

type TaskListContextValue = {
  tasks: readonly Task.Task[];
  groupByStatus: boolean;
  showGroupLabels: boolean;
  showOrdinals: boolean;
  statusLabel: (status: Task.Status) => string;
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
  /** Render the status heading above each group; grouping order is kept either way. */
  showGroupLabels?: boolean;
  /** Number rows by their position in `tasks` (set order), so tasks can be referenced by ordinal. */
  showOrdinals?: boolean;
  /** i18n hook for group headings; defaults to English labels. */
  statusLabel?: (status: Task.Status) => string;
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
  showGroupLabels = true,
  showOrdinals = false,
  statusLabel = (status) => DEFAULT_STATUS_LABELS[status],
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onTaskSelect,
}: TaskListRootProps) => (
  <TaskListProvider
    tasks={tasks}
    groupByStatus={groupByStatus}
    showGroupLabels={showGroupLabels}
    showOrdinals={showOrdinals}
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
  const { tasks, groupByStatus, showGroupLabels, showOrdinals, statusLabel } = useTaskListContext('TaskList.Content');
  // Ordinals follow the set's canonical order, not the grouped display order, so a task keeps its
  // number as it moves between status groups.
  const ordinals = useMemo(() => new Map(tasks.map((task, index) => [task.id, index + 1])), [tasks]);
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
    <Listbox.Content
      {...composableProps(props, {
        // Row height lives on the auto rows — an `h-8` on the grid itself would size the whole
        // list to one row and let the rest overflow invisibly.
        classNames: mx(
          'group grid auto-rows-[2rem] gap-x-2 items-center w-full min-w-0',
          showOrdinals
            ? 'grid-cols-[2rem_1rem_1fr_min-content_min-content_2rem]'
            : 'grid-cols-[1rem_1fr_min-content_min-content_2rem]',
        ),
      })}
      aria-label='Tasks'
      ref={forwardedRef}
    >
      {groups.map(({ status, tasks }) => (
        <Fragment key={status ?? 'all'}>
          {status && showGroupLabels && <TaskListGroupLabel>{statusLabel(status)}</TaskListGroupLabel>}
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} ordinal={showOrdinals ? ordinals.get(task.id) : undefined} />
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
    <div
      {...rest}
      className={mx('col-span-full pt-3 pb-1 text-xs text-subdued uppercase', className)}
      ref={forwardedRef}
    >
      {children}
    </div>
  );
});

TaskListGroupLabel.displayName = 'TaskList.GroupLabel';

//
// Item — one row. Exported so a host can render its own selection of tasks.
//

const STATUS_ICONS: Record<Task.Status, { icon: string; classNames?: string }> = {
  todo: { icon: 'ph--square--regular', classNames: 'text-subdued' },
  started: { icon: 'ph--hourglass--regular', classNames: 'text-info-text' },
  done: { icon: 'ph--check--regular', classNames: 'text-success-text' },
  failed: { icon: 'ph--x--regular', classNames: 'text-error-text' },
  cancelled: { icon: 'ph--x--regular', classNames: 'text-error-text' },
};

type TaskListItemProps = ComposableProps<{ task: Task.Task; ordinal?: number }>;

const TaskListItem = composable<HTMLLIElement, { task: Task.Task; ordinal?: number }>(
  ({ task, ordinal, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { tasks, onTaskUpdate, onTaskDelete, onTaskSelect } = useTaskListContext('TaskList.Item');
    const { className, ...rest } = composableProps(props);

    // Subscribe per row: a query re-emits when membership changes, not when a task's own fields do,
    // so a rename elsewhere (task form, agent, sync) would otherwise leave the row stale.
    const [snapshot] = useObject(task);
    const current = snapshot ?? task;

    const done = current.status === 'done';
    const error = current.status === 'failed';

    // Virtual: an open task whose dependencies (resolved within the set) are not all done.
    const blocked = (current.status ?? 'todo') === 'todo' && !TaskSet.isTaskReady(tasks, task);
    // A started agent task is actively being worked by a sub-agent (started is stamped at spawn),
    // so it spins; a human-started task keeps the static glyph.
    const active = current.status === 'started' && current.assignee?.role === 'assistant';
    const { icon, classNames: iconClassNames } = active
      ? { icon: 'ph--spinner--regular', classNames: 'text-info-text animate-spin' }
      : STATUS_ICONS[current.status ?? 'todo'];

    const handleToggle = useCallback(
      () => onTaskUpdate?.(task, { status: done ? 'todo' : 'done' }),
      [onTaskUpdate, task, done],
    );

    return (
      <Listbox.Item
        {...rest}
        id={task.id}
        data-testid='taskList.item'
        classNames={mx('group col-span-full grid grid-cols-subgrid', className)}
        ref={forwardedRef}
      >
        {ordinal !== undefined && (
          <div className='flex items-center justify-center'>
            <Tag hue={done ? 'green' : error ? 'rose' : 'neutral'} classNames='tabular-nums'>
              {ordinal}
            </Tag>
          </div>
        )}
        {onTaskUpdate ? (
          <IconButton
            classNames={mx('justify-self-center', iconClassNames)}
            variant='ghost'
            density='sm'
            icon={icon}
            iconOnly
            label={done ? t('mark-todo.label') : t('mark-done.label')}
            onClick={handleToggle}
          />
        ) : (
          <span className='grid place-items-center justify-self-center'>
            <Icon icon={icon} classNames={iconClassNames} size={4} />
            <span className='sr-only'>{t(`status-${current.status ?? 'todo'}.label`)}</span>
          </span>
        )}
        <span
          className={mx('flex items-center gap-1 min-w-0', onTaskSelect && 'cursor-pointer')}
          onClick={onTaskSelect ? () => onTaskSelect(task) : undefined}
        >
          <span className='truncate'>{current.title}</span>
        </span>
        {current.assignee ? <TaskListAssignee assignee={current.assignee} /> : <div />}
        <div className='flex items-center gap-1'>
          {blocked && <Tag hue='indigo'>{t('task-blocked.label')}</Tag>}
          {current.priority && current.priority !== 'none' && <Tag hue='neutral'>{current.priority}</Tag>}
        </div>
        {onTaskDelete && (
          <CompactIconButton
            variant='ghost'
            icon='ph--x--regular'
            label={t('delete-task.label')}
            classNames='invisible group-hover:visible'
            onClick={() => onTaskDelete(task)}
          />
        )}
      </Listbox.Item>
    );
  },
);

TaskListItem.displayName = 'TaskList.Item';

// TODO(burdon): Reconcile with `CompactIconButton` from `react-ui-form`.
const CompactIconButton = (props: IconButtonProps) => {
  return (
    <span className='grid size-8 shrink-0 place-items-center'>
      <IconButton variant='ghost' iconOnly density='sm' {...props} />
    </span>
  );
};

//
// Create — the add row; renders nothing unless the root supplies `onTaskCreate`.
//

type TaskListCreateProps = ComposableProps<{ placeholder?: string }>;

const TaskListCreate = composable<HTMLDivElement, { placeholder?: string }>(
  ({ placeholder = 'Add task', ...props }, forwardedRef) => {
    const { onTaskCreate, showOrdinals } = useTaskListContext('TaskList.Create');
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
      <div
        {...rest}
        data-testid='taskList.create'
        className={mx(
          'grid gap-x-2 items-center w-full min-w-0 h-8',
          showOrdinals ? 'grid-cols-[2rem_1rem_1fr]' : 'grid-cols-[1rem_1fr]',
          className,
        )}
        ref={forwardedRef}
      >
        {showOrdinals && <span />}
        <Icon icon='ph--plus--regular' size={4} classNames='justify-self-center text-subdued' />
        <Input.Root>
          <Input.TextInput
            variant='subdued'
            classNames='px-0'
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
