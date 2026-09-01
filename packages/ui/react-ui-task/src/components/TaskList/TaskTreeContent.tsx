//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useCallback, useContext, useMemo, useRef } from 'react';

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
  const registry = useContext(RegistryContext);

  // Read at construction only. Keeping `collapsed` out of the memo's dependencies is what makes the
  // model identity stable across a toggle: `Tree` memoizes its walk on the model, so a new model on
  // every collapse rebuilt the collection and the branch never got to run its conceal animation.
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;
  const model = useMemo(() => createTaskTreeModel(tasks, { collapsed: collapsedRef.current }), [tasks]);

  // Written into the model rather than left to a rebuild, so the tree keeps its identity through the
  // disclosure animation, and mirrored onto the list's own collapsed set, which survives the model
  // being rebuilt when the task array changes. Collapse is keyed by id, which is unambiguous here:
  // a task has one parent, so it appears at exactly one path.
  const handleOpenChange = useCallback(
    ({ item, path, open }: { item: TaskNode; path: string[]; open: boolean }) => {
      const atom = model.stateAtom(path);
      registry.set(atom, { ...registry.get(atom), open });
      if (open === collapsedRef.current.has(item.id)) {
        onCollapseToggle(item.id);
      }
    },
    [model, registry, onCollapseToggle],
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
