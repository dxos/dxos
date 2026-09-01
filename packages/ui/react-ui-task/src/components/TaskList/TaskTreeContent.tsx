//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Icon, IconButton, Tag, useTranslation } from '@dxos/react-ui';
import { type ColumnRenderer, type HeadingRenderer, Tree } from '@dxos/react-ui-list';
import { Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { TASK_TREE_ROOT_ID, type TaskNode, createTaskTreeModel } from './tree-model';

/**
 * The hierarchical list rendered as a `Tree`, so the machine owns disclosure, roving focus and the
 * APG keymap instead of the row re-deriving `aria-level`/`posinset`/`setsize` by hand.
 *
 * The row's cell order changes as a consequence: `Tree` renders `[toggle][heading][columns]`, so the
 * disclosure control leads the row where the flat list put it after the ordinal and status control.
 * Everything else keeps its column.
 *
 * `Alt+Arrow` restructuring survives untouched — zag ignores modified arrows, verified against the
 * tree's own story, so indent/outdent/nudge still reach the row handler.
 */
export type TaskTreeContentProps = {
  tasks: readonly Task.Task[];
  collapsed: ReadonlySet<string>;
  showGutter: boolean;
  ordinals: ReadonlyMap<string, number>;
  selected?: string;
  translationKey: string;
  onCollapseToggle: (id: string) => void;
  onTaskSelect?: (task: Task.Task | undefined) => void;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  renderTrailing?: ColumnRenderer<TaskNode>;
};

/** Columns after the title: assignee, tags and the contributed actions live here. */
const GRID_TEMPLATE = '[tree-row-start] minmax(0, 1fr) min-content min-content [tree-row-end]';

export const TaskTreeContent = ({
  tasks,
  collapsed,
  showGutter,
  ordinals,
  selected,
  translationKey,
  onCollapseToggle,
  onTaskSelect,
  onTaskUpdate,
  renderTrailing,
}: TaskTreeContentProps) => {
  // Rebuilt whenever the set changes: tasks are live ECHO objects, so the model cannot own the
  // collapsed state — it is seeded from `collapsed`, which the list holds.
  const model = useMemo(() => createTaskTreeModel(tasks, { collapsed }), [tasks, collapsed]);

  // Toggling `collapsed` rebuilds the model, whose `isOpen` seeds from it — so the list's own state
  // stays the single source and the model needs no separate write. Collapse is keyed by id, which is
  // unambiguous here: a task has one parent, so it appears at exactly one path.
  const handleOpenChange = useCallback(
    ({ item, open }: { item: TaskNode; open: boolean }) => {
      if (open === collapsed.has(item.id)) {
        onCollapseToggle(item.id);
      }
    },
    [collapsed, onCollapseToggle],
  );

  const handleSelect = useCallback(
    ({ item }: { item: TaskNode }) => item.task && onTaskSelect?.(item.task),
    [onTaskSelect],
  );

  const renderHeading: HeadingRenderer<TaskNode> = useCallback(
    ({ item }) => <TaskTreeHeading node={item} {...{ showGutter, ordinals, translationKey, onTaskUpdate }} />,
    [showGutter, ordinals, translationKey, onTaskUpdate],
  );

  return (
    <Tree<TaskNode>
      id={TASK_TREE_ROOT_ID}
      model={model}
      gridTemplateColumns={GRID_TEMPLATE}
      classNames='w-full min-w-0'
      renderHeading={renderHeading}
      renderColumns={renderTrailing}
      onOpenChange={handleOpenChange}
      onSelect={handleSelect}
    />
  );
};

/** Ordinal, status control and title — the row's leading content, beside the tree's own toggle. */
const TaskTreeHeading = ({
  node,
  showGutter,
  ordinals,
  translationKey,
  onTaskUpdate,
}: {
  node: TaskNode;
  showGutter: boolean;
  ordinals: ReadonlyMap<string, number>;
  translationKey: string;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
}) => {
  const { t } = useTranslation(translationKey);
  const task = node.task;
  const status = task?.status ?? 'todo';
  const done = status === 'done';
  const error = status === 'failed' || status === 'cancelled';
  const ordinal = task && ordinals.get(task.id);

  const handleToggle = useCallback(
    () => task && onTaskUpdate?.(task, { status: done ? 'todo' : 'done' }),
    [onTaskUpdate, task, done],
  );

  if (!task) {
    return null;
  }

  const icon = done ? 'ph--check-circle--regular' : error ? 'ph--x-circle--regular' : 'ph--circle--regular';
  const iconClassNames = done ? 'text-success-text' : error ? 'text-error-text' : 'text-subdued';

  return (
    <div className='flex min-w-0 grow items-center gap-1'>
      {showGutter && ordinal !== undefined && (
        <Tag hue={done ? 'green' : error ? 'rose' : 'neutral'} classNames='tabular-nums'>
          {ordinal}
        </Tag>
      )}
      {onTaskUpdate ? (
        <IconButton
          classNames={mx('shrink-0', iconClassNames)}
          variant='ghost'
          density='sm'
          icon={icon}
          iconOnly
          label={done ? t('mark-todo.label') : t('mark-done.label')}
          onClick={(event) => {
            // The row is the selection target; the status control must not also select it.
            event.stopPropagation();
            handleToggle();
          }}
        />
      ) : (
        <span className='grid h-8 shrink-0 place-items-center'>
          <Icon icon={icon} classNames={iconClassNames} size={4} />
          <span className='sr-only'>{t(`status-${status}.label`)}</span>
        </span>
      )}
      <span className='min-w-0 truncate'>{task.title}</span>
    </div>
  );
};
