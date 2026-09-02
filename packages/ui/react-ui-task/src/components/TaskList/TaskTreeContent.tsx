//
// Copyright 2026 DXOS.org
//

import { extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { useObject } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';
import { type ColumnRenderer, type HeadingRenderer, Tree, isTreeDataFor } from '@dxos/react-ui-list';
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
import { TaskCheckbox, TaskOrdinal, TaskStatusControl } from './TaskRowCells';
import { TASK_TREE_ROOT_ID, type TaskNode, buildTaskForest, buildTaskPaths, createTaskTreeModel } from './tree-model';

/** Columns after the title: assignee, tags and the contributed actions live here. */
/**
 * `[title][chips][estimate][priority][actions]`. Each trailing control owns a column so it lines up
 * down the list; only the chips share one, because an artifact tag has no fixed width.
 */
const GRID_TEMPLATE = '[tree-row-start] minmax(0, 1fr) min-content min-content min-content min-content [tree-row-end]';

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
  /** Paint the drop bands on every row (development affordance). */
  debug?: boolean;
  /** Render status headers with their tasks flat beneath, instead of the hierarchy. */
  groupByStatus?: readonly Task.Status[];
  /** Nest sub-tasks under their parent; off renders one row per task. */
  hierarchical?: boolean;
  tasks: readonly Task.Task[];
  collapsed: ReadonlySet<string>;
  showGutter: boolean;
  ordinals: ReadonlyMap<string, number>;
  selected?: string;
  /** Ids of the checked rows; the gutter renders a checkbox instead of an ordinal once wired. */
  checked?: ReadonlySet<string>;
  translationKey: string;
  /** Render each task's description under its title; rows grow to fit. */
  showDescription?: boolean;
  onCollapseToggle: (id: string) => void;
  onTaskCheck?: (task: Task.Task) => void;
  onTaskSelect?: (task: Task.Task | undefined) => void;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
  renderTrailing?: ColumnRenderer<TaskNode>;
};

export const TaskTreeContent = ({
  debug,
  groupByStatus,
  hierarchical,
  tasks,
  collapsed,
  showGutter,
  ordinals,
  selected,
  checked,
  renderTrailing,
  translationKey,
  showDescription = false,
  onCollapseToggle,
  onTaskCheck,
  onTaskSelect,
  onTaskUpdate,
  onTaskMove,
}: TaskTreeContentProps) => {
  const { t } = useTranslation(translationKey);
  const registry = useContext(RegistryContext);

  // Read at construction only. Keeping `collapsed` out of the memo's dependencies is what makes the
  // model identity stable across a toggle: `Tree` memoizes its walk on the model, so a new model on
  // every collapse rebuilt the collection and the branch never got to run its conceal animation.
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;
  const model = useMemo(
    () => createTaskTreeModel(tasks, { collapsed: collapsedRef.current, groupByStatus, translationKey, hierarchical }),
    [tasks, groupByStatus, translationKey, hierarchical],
  );
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
      <TaskTreeHeading
        node={item}
        {...{ showGutter, ordinals, checked, translationKey, showDescription, onTaskCheck, onTaskUpdate }}
      />
    ),
    [showGutter, ordinals, checked, translationKey, showDescription, onTaskCheck, onTaskUpdate],
  );

  // Restructuring is keyboard-driven, and the machine ignores modified arrows — so the gesture is
  // handled here rather than per row. `Shift` moves the row where an unmodified arrow navigates:
  // up/down reorder among siblings, left/right change depth. The focused row names its task through
  // `data-object-id`, which is what lets one container-level handler serve every depth.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // A reader needs a way back out of a selection, and `Escape` is where they look for it.
      if (event.key === 'Escape' && selected) {
        event.preventDefault();
        onTaskSelect?.(undefined);
        return;
      }

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
    [onTaskMove, tasks, selected, onTaskSelect],
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
      // Scoped to this tree: monitors are global, so the navtree's drags reach here too.
      canMonitor: ({ source }) => isTreeDataFor(source.data, TASK_TREE_ROOT_ID),
      onDrop: ({ location, source }) => {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        // The end strip has no hitbox: it means one thing, which is "last among the roots".
        if ((target.data as { atEnd?: boolean }).atEnd) {
          const dragged = (source.data.item as TaskNode | undefined)?.task;
          if (dragged) {
            onTaskMove(dragged, { parentTask: null, before: undefined });
          }
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
      ariaLabel={t('task-list.label')}
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
      // Dragging past the last row is the obvious way to say "put it last"; without a target there
      // the sticky rows keep the previous instruction and the drop lands somewhere else entirely.
      dropAtEnd
      debug={debug}
      renderHeading={renderHeading}
      renderColumns={renderTrailing}
      onOpenChange={handleOpenChange}
      onSelect={handleSelect}
      onKeyDown={handleKeyDown}
    />
  );
};

/**
 * The gutter cell, status control and title — the row's leading content, beside the tree's own
 * toggle. The gutter holds either the checkbox or the ordinal, never both: they occupy one cell, and
 * a number beside a box reads as two ways to act on the row.
 */
const TaskTreeHeading = ({
  node,
  showGutter,
  ordinals,
  checked,
  translationKey,
  showDescription,
  onTaskCheck,
  onTaskUpdate,
}: {
  node: TaskNode;
  showGutter: boolean;
  ordinals: ReadonlyMap<string, number>;
  checked?: ReadonlySet<string>;
  translationKey: string;
  showDescription: boolean;
  onTaskCheck?: (task: Task.Task) => void;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
}) => {
  const task = node.task;
  // Subscribed per row: the model is rebuilt from the task array, whose identity a property edit
  // does not change, so a rename made anywhere else would leave the row showing its old title.
  // Read through the snapshot; the controls still take the live object, which is what they write to.
  const [snapshot] = useObject(task);
  const current = snapshot ?? task;
  const ordinal = task && ordinals.get(task.id);

  if (!task || !current) {
    return null;
  }

  const description = showDescription ? current.description?.trim() || undefined : undefined;

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
        (onTaskCheck ? (
          <TaskCheckbox task={task} checked={!!checked?.has(task.id)} onCheckedChange={onTaskCheck} />
        ) : ordinal !== undefined ? (
          <TaskOrdinal task={task} ordinal={ordinal} />
        ) : (
          // Holds the gutter track so a numberless row's title still lines up with its neighbours.
          <span />
        ))}
      <TaskStatusControl task={task} onTaskUpdate={onTaskUpdate} />
      <span className='min-w-0 truncate'>{current.title}</span>
      {description && (
        <TaskDescription content={description} classNames={mx(showGutter ? 'col-start-3' : 'col-start-2', 'pb-1')} />
      )}
    </div>
  );
};
