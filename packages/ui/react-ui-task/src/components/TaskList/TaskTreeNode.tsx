//
// Copyright 2026 DXOS.org
//

import { extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { SystemIconButton, useTranslation } from '@dxos/react-ui';
import { type ColumnRenderer, type HeadingRenderer, Tree, isTreeDataFor } from '@dxos/react-ui-list';
import { Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { TaskQuestion } from '../TaskQuestion/TaskQuestion.tsx';
import {
  type TaskDropIntent,
  type TaskPlacement,
  resolveIndent,
  resolveNudge,
  resolveOutdent,
  resolveReparent,
  resolveTaskPlacement,
} from './hierarchy.ts';
import { TaskDescription, type TaskDescriptionProps } from './TaskDescription.tsx';
import { TaskCheckbox, TaskOrdinal, TaskStatusControl } from './TaskRowCells.tsx';
import {
  TASK_TREE_ROOT_ID,
  type TaskNode,
  buildTaskForest,
  buildTaskPaths,
  createTaskTreeModel,
} from './tree-model.ts';

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
/**
 * How a row was activated, so a host can tell a plain click from a modified one — e.g. opening the
 * task in a plank of its own rather than reusing the one the list reads into.
 */
export type TaskSelectModifiers = { meta?: boolean };

export type TaskTreeNodeProps = {
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
  /** Renderers for the description beyond the row's own. */
  descriptionComponents?: TaskDescriptionProps['components'];
  /** Render the questions in each task's history under its title. */
  showQuestions?: boolean;
  onCollapseToggle: (id: string) => void;
  onTaskCheck?: (task: Task.Task) => void;
  onTaskSelect?: (task: Task.Task | undefined, modifiers?: TaskSelectModifiers) => void;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
  /** The list's column template — the tree's rows and the edit pane lay out on the same tracks. */
  gridTemplateColumns: string;
  /** Class list from `TaskList.Content`, merged onto the tree's own. */
  classNames?: string | (string | undefined)[];
  renderTrailing?: ColumnRenderer<TaskNode>;
};

export const TaskTreeNode = ({
  debug,
  groupByStatus,
  hierarchical,
  tasks,
  collapsed,
  showGutter,
  ordinals,
  selected,
  checked,
  gridTemplateColumns,
  classNames,
  renderTrailing,
  translationKey,
  showDescription = false,
  descriptionComponents,
  showQuestions = false,
  onCollapseToggle,
  onTaskCheck,
  onTaskSelect,
  onTaskUpdate,
  onTaskMove,
}: TaskTreeNodeProps) => {
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

  // `meta` rides along so a host can distinguish a plain activation (read into the pane the list
  // reads into) from a modified one (open in its own plank), the way the nav tree does.
  const handleSelect = useCallback(
    ({ item, meta }: { item: TaskNode; meta?: boolean }) => item.task && onTaskSelect?.(item.task, { meta }),
    [onTaskSelect],
  );

  const renderHeading: HeadingRenderer<TaskNode> = useCallback(
    ({ item }) => (
      <TaskTreeHeading
        node={item}
        {...{
          showGutter,
          ordinals,
          checked,
          translationKey,
          showDescription,
          descriptionComponents,
          showQuestions,
          onTaskCheck,
          onTaskUpdate,
        }}
      />
    ),
    [
      showGutter,
      ordinals,
      checked,
      translationKey,
      showDescription,
      descriptionComponents,
      showQuestions,
      onTaskCheck,
      onTaskUpdate,
    ],
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
      gridTemplateColumns={gridTemplateColumns}
      classNames={mx('w-full min-w-0', classNames)}
      draggable={!!onTaskMove}
      // A flat list is a tree of depth one: no branch will ever need disclosing, so the template
      // carries no toggle track and the first cell is the gutter or the status control.
      toggle={!!hierarchical}
      // Any task can gain a sub-task, so a childless peer is still a drop target — without this the
      // hitbox offers no make-child zone on one, and so no drop indicator either.
      leavesAcceptChildren
      // Deliberately NOT `selectionFollowsFocus`: selecting a task opens its detail (a companion, or
      // a plank), so arrows that selected as they travelled would open every row the reader passes
      // on the way to the one they want. The arrows move focus — the row is painted where focus
      // lands — and `Enter` commits it.
      // Dragging past the last row is the obvious way to say "put it last"; without a target there
      // the sticky rows keep the previous instruction and the drop lands somewhere else entirely.
      dropAtEnd
      // A task list is the long list in this app — a project's backlog runs to hundreds of rows,
      // each carrying a title, a description, four controls and a subscription, and a reader sees
      // twenty of them. Applies to the flat list; a hierarchical one has branches to disclose and
      // renders whole.
      virtualize
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
  descriptionComponents,
  showQuestions,
  onTaskCheck,
  onTaskUpdate,
}: {
  node: TaskNode;
  showGutter: boolean;
  ordinals: ReadonlyMap<string, number>;
  checked?: ReadonlySet<string>;
  translationKey: string;
  showDescription: boolean;
  descriptionComponents?: TaskDescriptionProps['components'];
  showQuestions: boolean;
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
  // Read off the snapshot, so an answer given anywhere else lands in the row as it is written.
  const questions = showQuestions ? Task.getQuestions(current.history) : [];

  return (
    // Cells, not a container: they are direct children of the tree row's subgrid and take the
    // tracks the list's template names, so the row is one grid and the pane lays out on the same
    // tracks by name rather than by re-declaring their widths.
    <>
      {showGutter &&
        (onTaskCheck ? (
          <TaskCheckbox
            task={task}
            checked={!!checked?.has(task.id)}
            classNames='col-[gutter]'
            onCheckedChange={onTaskCheck}
          />
        ) : ordinal !== undefined ? (
          <TaskOrdinal task={task} ordinal={ordinal} classNames='col-[gutter]' />
        ) : (
          // Holds the gutter track so a numberless row's title still lines up with its neighbours.
          <span className='col-[gutter]' />
        ))}
      <TaskStatusControl task={task} classNames='col-[status]' onTaskUpdate={onTaskUpdate} />
      <div className='inline-flex min-w-0 items-center gap-2 col-[title] self-center'>
        <SystemIconButton.Clipboard
          classNames='font-mono'
          density='sm'
          variant='tag'
          hue='emerald'
          label={Obj.getMnemonic(current)}
          iconEnd
          onCopy={() => '@' + Obj.getMnemonic(current)}
          data-testid='taskList.item.mnemonic'
        />
        <span data-testid='taskList.item.title' className='truncate'>
          {current.title}
        </span>
      </div>
      {/* The row's second line, running under the title and its chips only: it has to clear the
          ordinal and the status control, or it reads as belonging to the row above, and it must stop
          short of the trailing controls so it does not run beneath the estimate, priority and menu. */}
      {(description || questions.length > 0) && (
        <div className='col-[title/chips-end] row-start-2 flex min-w-0 flex-col gap-2 pb-1'>
          {description && <TaskDescription content={description} components={descriptionComponents} />}
          {questions.map((thread) => (
            <TaskQuestion
              key={thread.question.id}
              thread={thread}
              // One line each: answering takes the room of the detail pane, which a click on the
              // row opens.
              compact
            />
          ))}
        </div>
      )}
    </>
  );
};
