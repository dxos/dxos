//
// Copyright 2026 DXOS.org
//

import { extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { Icon, IconButton, Tag, useTranslation } from '@dxos/react-ui';
import { type ColumnRenderer, type HeadingRenderer, Tree, isTreeData } from '@dxos/react-ui-list';
import { Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import {
  type TaskDropIntent,
  type TaskPlacement,
  resolveIndent,
  resolveNudge,
  resolveOutdent,
  resolveReparent,
  resolveTaskPlacement,
} from './hierarchy';
import { TaskDescription } from './TaskDescription';
import { TASK_TREE_ROOT_ID, type TaskNode, buildTaskForest, buildTaskPaths, createTaskTreeModel } from './tree-model';

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
  /** Render each task's description under its title; rows grow to fit. */
  showDescriptions?: boolean;
  onCollapseToggle: (id: string) => void;
  onTaskSelect?: (task: Task.Task | undefined) => void;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
  renderTrailing?: ColumnRenderer<TaskNode>;
  /** Paint the drop bands on every row (development affordance). */
  debug?: boolean;
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
  showDescriptions = false,
  onCollapseToggle,
  onTaskSelect,
  onTaskUpdate,
  onTaskMove,
  renderTrailing,
  debug,
}: TaskTreeContentProps) => {
  const registry = useContext(RegistryContext);

  // Read at construction only. Keeping `collapsed` out of the memo's dependencies is what makes the
  // model identity stable across a toggle: `Tree` memoizes its walk on the model, so a new model on
  // every collapse rebuilt the collection and the branch never got to run its conceal animation.
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;
  const model = useMemo(() => createTaskTreeModel(tasks, { collapsed: collapsedRef.current }), [tasks]);
  const paths = useMemo(() => buildTaskPaths(buildTaskForest(tasks)), [tasks]);

  // Selection is owned by `TaskList.Root`, so it is driven into the model rather than held there —
  // otherwise selecting a task elsewhere (or clearing it from the edit pane) leaves the tree's own
  // current state stale.
  const previousSelected = useRef<string | undefined>(undefined);
  useEffect(() => {
    const setCurrent = (id: string | undefined, current: boolean) => {
      const path = id && paths.get(id);
      if (!path) {
        return;
      }
      const atom = model.stateAtom(path);
      registry.set(atom, { ...registry.get(atom), current });
    };

    if (previousSelected.current !== selected) {
      setCurrent(previousSelected.current, false);
      previousSelected.current = selected;
    }
    setCurrent(selected, true);
  }, [selected, model, paths, registry]);

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
    ({ item }) => (
      <TaskTreeHeading node={item} {...{ showGutter, ordinals, translationKey, showDescriptions, onTaskUpdate }} />
    ),
    [showGutter, ordinals, translationKey, showDescriptions, onTaskUpdate],
  );

  // Restructuring is keyboard-driven, and the machine ignores modified arrows — so the gesture is
  // handled here rather than per row. `Shift` moves the row where an unmodified arrow navigates:
  // up/down reorder among siblings, left/right change depth. The focused row names its task through
  // `data-object-id`, which is what lets one container-level handler serve every depth.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onTaskMove || !event.shiftKey) {
        return;
      }
      const id = (event.target as HTMLElement | null)
        ?.closest<HTMLElement>('[data-object-id]')
        ?.getAttribute('data-object-id');
      const task = id ? tasks.find((task) => task.id === id) : undefined;
      if (!task) {
        return;
      }
      const placement = (() => {
        switch (event.key) {
          case 'ArrowRight':
            return resolveIndent(tasks, task);
          case 'ArrowLeft':
            return resolveOutdent(tasks, task);
          case 'ArrowUp':
            return resolveNudge(tasks, task, 'up');
          case 'ArrowDown':
            return resolveNudge(tasks, task, 'down');
          default:
            return undefined;
        }
      })();
      if (placement) {
        event.preventDefault();
        event.stopPropagation();
        onTaskMove(task, placement);
      }
    },
    [onTaskMove, tasks],
  );

  // The drop half of the gesture. `Tree` publishes each row as a pragmatic-dnd draggable carrying
  // `TreeData`; the placement is resolved here because only the list knows the task set the move is
  // relative to. Same shape as the navtree's monitor, which is the established consumer of this
  // contract.
  useEffect(() => {
    if (!onTaskMove) {
      return;
    }

    return monitorForElements({
      canMonitor: ({ source }) => isTreeData(source.data),
      onDrop: ({ location, source }) => {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const instruction = extractInstruction(target.data);
        if (!instruction || instruction.type === 'instruction-blocked') {
          return;
        }

        // The synthetic root has no task, so a drop onto it (or from it) is not a move.
        const sourceTask = (source.data.item as TaskNode | undefined)?.task;
        const targetTask = (target.data.item as TaskNode | undefined)?.task;
        if (!sourceTask || !targetTask) {
          return;
        }

        // The hitbox's instruction is taken as given: dropping onto a row makes the task its child,
        // and the reorder zones at the row's edges are what place it before or after instead.
        // `reparent` is the shallow band under a last child, and is the only way out of a subtree
        // for a drop past its final row — without it the task can only ever join that subtree.
        const placement =
          instruction.type === 'reparent'
            ? // `desiredLevel` is absolute, so the number of ancestors to climb is the drop in depth.
              resolveReparent(tasks, sourceTask, targetTask, instruction.currentLevel - instruction.desiredLevel)
            : resolveTaskPlacement({
                tasks,
                source: sourceTask,
                target: targetTask,
                intent: instruction.type as TaskDropIntent,
              });
        if (placement) {
          onTaskMove(sourceTask, placement);
        }
      },
    });
  }, [tasks, onTaskMove]);

  return (
    <Tree<TaskNode>
      id={TASK_TREE_ROOT_ID}
      model={model}
      gridTemplateColumns={GRID_TEMPLATE}
      classNames='w-full min-w-0'
      draggable={!!onTaskMove}
      // Any task can gain a sub-task, so a childless peer is still a drop target — without this the
      // hitbox offers no make-child zone on one, and so no drop indicator either.
      leavesAcceptChildren
      // The highlight is what tells the reader where they are; a tree that only highlights (rather
      // than navigating on select) wants it to travel with the arrows.
      selectionFollowsFocus
      // A task list's "below" already means after the row and its sub-tasks, so every row offers
      // it — the alternative is the reparent slivers, which cannot be aimed at.
      dropBelowExpanded
      debug={debug}
      renderHeading={renderHeading}
      renderColumns={renderTrailing}
      onOpenChange={handleOpenChange}
      onSelect={handleSelect}
      onKeyDown={handleKeyDown}
    />
  );
};

/** Ordinal, status control and title — the row's leading content, beside the tree's own toggle. */
const TaskTreeHeading = ({
  node,
  showGutter,
  ordinals,
  translationKey,
  showDescriptions,
  onTaskUpdate,
}: {
  node: TaskNode;
  showGutter: boolean;
  ordinals: ReadonlyMap<string, number>;
  translationKey: string;
  showDescriptions: boolean;
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

  const description = showDescriptions ? task.description?.trim() || undefined : undefined;

  return (
    // A grid rather than a flex row so the description can start in the title's own column: it has
    // to clear the ordinal and the status control, or it reads as belonging to the row above.
    <div
      className={mx(
        'grid min-w-0 grow items-center gap-x-1',
        // The title band is one control tall whether or not a description follows. Left to size
        // itself, a described row's tracks exactly fill the row and the title sits flush to its
        // top, while an undescribed row has slack to centre in — so the two titles disagreed by a
        // few pixels down the list.
        'grid-rows-[var(--dx-control)_auto]',
        showGutter ? 'grid-cols-[auto_auto_minmax(0,1fr)]' : 'grid-cols-[auto_minmax(0,1fr)]',
      )}
    >
      {showGutter &&
        (ordinal !== undefined ? (
          <Tag hue={done ? 'green' : error ? 'rose' : 'neutral'} classNames='tabular-nums'>
            {ordinal}
          </Tag>
        ) : (
          // Holds the gutter track so a numberless row's title still lines up with its neighbours.
          <span />
        ))}
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
      {description && (
        <TaskDescription content={description} classNames={mx(showGutter ? 'col-start-3' : 'col-start-2', 'pb-1')} />
      )}
    </div>
  );
};
