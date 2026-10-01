//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { type FC, type KeyboardEvent, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { useObject } from '@dxos/echo-react';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tree, type TreeDropEvent, type TreeNode, type TreeSelectEvent } from '@dxos/react-ui-list';
import { Next } from '@dxos/react-ui/next';
import { type Task } from '@dxos/types';

import {
  type TaskPlacement,
  resolveIndent,
  resolveNudge,
  resolveOutdent,
  resolveReparent,
  resolveTaskPlacement,
} from './hierarchy.ts';
import { TaskDescription, type TaskDescriptionProps } from './TaskDescription.tsx';
import { TaskCheckbox, TaskMnemonic, TaskOrdinal, TaskStatusControl } from './TaskRowCells.tsx';
import {
  TASK_TREE_ROOT_ID,
  type TaskGroup,
  type TaskGroupHeader,
  type TaskNode,
  buildTaskPaths,
  buildTaskTree,
  createTaskTreeModel,
} from './tree-model.ts';

/**
 * The task list rendered as a Next `Tree`, so the machine owns disclosure, roving focus and the APG keymap. A row's
 * cells lay out on the Root's `columns` in DOM order: the disclosure (when the list can disclose), then the gutter,
 * status and title, then the trailing cells; the chips and the description are placed on the row's later lines.
 *
 * `Shift+Arrow` and `Tab` restructuring reach the consumer's key handler before the machine's, which ignores modified
 * arrows anyway; a taken key keeps focus on the moved row as it remounts under its new path.
 */

/**
 * How a row was activated, so a host can tell a plain click from a modified one — e.g. opening the
 * task in a plank of its own rather than reusing the one the list reads into.
 */
export type TaskSelectModifiers = { meta?: boolean };

/** The trailing cells of a task row (artifacts, assignee, estimate, priority, actions, chips). */
export type TaskTrailingRenderer = FC<{ item: TaskNode }>;

export type TaskTreeNodeProps = {
  /** Render status headers with their tasks flat beneath, instead of the hierarchy. */
  groupByStatus?: readonly Task.Status[];
  /** Host-defined groups, rendered as collapsible headers with counts (see {@link TaskGroup}). */
  groups?: readonly TaskGroup[];
  /** Nest sub-tasks under their parent; off renders one row per task. */
  hierarchical?: boolean;
  tasks: readonly Task.Task[];
  collapsed: ReadonlySet<string>;
  /** Whether rows lead with a disclosure cell: a flat list has no branch to disclose. */
  toggle: boolean;
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
  onCollapseToggle: (id: string) => void;
  onTaskCheck?: (task: Task.Task) => void;
  onTaskSelect?: (task: Task.Task | undefined, modifiers?: TaskSelectModifiers) => void;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
  /** The rows' column template (see `buildGridTemplate`); the edit pane lays out on the same tracks. */
  columns: string;
  renderTrailing?: TaskTrailingRenderer;
};

export const TaskTreeNode = ({
  groupByStatus,
  groups,
  hierarchical,
  tasks,
  collapsed,
  toggle,
  showGutter,
  ordinals,
  selected,
  checked,
  columns,
  renderTrailing: Trailing,
  translationKey,
  showDescription = false,
  descriptionComponents,
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
    () =>
      createTaskTreeModel(tasks, {
        collapsed: collapsedRef.current,
        groups,
        groupByStatus,
        translationKey,
        hierarchical,
      }),
    [tasks, groups, groupByStatus, translationKey, hierarchical],
  );
  // From the forest the model renders, so a grouped task's path runs through its group's header.
  const paths = useMemo(
    () => buildTaskPaths(buildTaskTree(tasks, { groups, groupByStatus, hierarchical })),
    [tasks, groups, groupByStatus, hierarchical],
  );

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

  // A list without a selection handler highlights nothing, and a group header is never selected —
  // activating one discloses it instead.
  const canSelect = useCallback(({ item }: { item: TaskNode }) => !!onTaskSelect && !!item.task, [onTaskSelect]);

  // `meta` rides along so a host can distinguish a plain activation (read into the pane the list
  // reads into) from a modified one (open in its own plank), the way the nav tree does.
  const handleSelect = useCallback(
    ({ item, meta }: TreeSelectEvent<TaskNode>) => item.task && onTaskSelect?.(item.task, { meta }),
    [onTaskSelect],
  );

  // Restructuring is keyboard-driven: `Shift` moves the row where an unmodified arrow navigates —
  // up/down reorder among siblings, left/right change depth — and `Tab`/`Shift+Tab` change depth
  // too, as in an outliner. The focused row names its task through `data-object-id`, which is what
  // lets one tree-level handler serve every depth.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // A reader needs a way back out of a selection, and `Escape` is where they look for it.
      if (event.key === 'Escape' && selected) {
        event.preventDefault();
        onTaskSelect?.(undefined);
        return;
      }

      const tab = event.key === 'Tab';
      if (!onTaskMove || !(event.shiftKey || tab)) {
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : undefined;
      const row = target?.closest<HTMLElement>('[data-object-id]');
      // `Tab` only from the row itself: from a control inside it, `Tab` is how focus reaches the
      // next control, and taking it there would strand the reader in the row.
      if (!row || (tab && row !== target)) {
        return;
      }
      const id = row.getAttribute('data-object-id');
      const task = id ? tasks.find((task) => task.id === id) : undefined;
      if (!task) {
        return;
      }
      const placement = (() => {
        switch (event.key) {
          case 'Tab':
            return event.shiftKey ? resolveOutdent(tasks, task) : resolveIndent(tasks, task);
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
      // A key that moves nothing is left alone — for `Tab`, so focus can still leave the list
      // rather than being trapped on a row that cannot indent.
      if (placement) {
        event.preventDefault();
        event.stopPropagation();
        onTaskMove(task, placement);
      }
    },
    [onTaskMove, tasks, selected, onTaskSelect],
  );

  // The drop half of the gesture; the placement is resolved here because only the list knows the
  // task set the move is relative to. The source is looked up by id, since the drag payload's item
  // is untyped.
  const handleDrop = useCallback(
    ({ instruction, source, item, atEnd }: TreeDropEvent<TaskNode>) => {
      const sourceTask = tasks.find((task) => task.id === source.id);
      if (!onTaskMove || !sourceTask) {
        return;
      }

      // The end strip means one thing, which is "last among the roots".
      if (atEnd) {
        onTaskMove(sourceTask, { parentTask: null, before: undefined });
        return;
      }

      // The synthetic root and the group headers have no task, so a drop onto one is not a move.
      const targetTask = item.task;
      if (!targetTask || instruction.type === 'instruction-blocked') {
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
          : resolveTaskPlacement({ tasks, source: sourceTask, target: targetTask, intent: instruction.type });
      if (placement) {
        onTaskMove(sourceTask, placement);
      }
    },
    [tasks, onTaskMove],
  );

  const renderRow = useCallback(
    (node: TreeNode<TaskNode>) => {
      const header = node.item?.group;
      if (node.group || !node.item) {
        return <Tree.Item node={node} />;
      }
      if (header) {
        return (
          <Tree.Item node={node}>
            <Tree.ItemIndicator />
            <TaskGroupHeading group={header} translationKey={translationKey} />
          </Tree.Item>
        );
      }

      return (
        <Tree.Item node={node}>
          {toggle && <Tree.ItemIndicator />}
          <TaskRowHeading
            node={node.item}
            {...{
              showGutter,
              ordinals,
              checked,
              translationKey,
              showDescription,
              descriptionComponents,
              onTaskCheck,
              onTaskUpdate,
            }}
          />
          {Trailing && <Trailing item={node.item} />}
        </Tree.Item>
      );
    },
    [
      toggle,
      showGutter,
      ordinals,
      checked,
      translationKey,
      showDescription,
      descriptionComponents,
      onTaskCheck,
      onTaskUpdate,
      Trailing,
    ],
  );

  return (
    <Tree.Root<TaskNode>
      id={TASK_TREE_ROOT_ID}
      model={model}
      columns={columns}
      // Chips and the description sit on the row's later lines, so a row grows to fit them and the
      // rows are not windowed at a fixed pitch.
      multiline
      virtual='variable'
      draggable={!!onTaskMove}
      // Any task can gain a sub-task, so a childless peer is still a drop target — without this the
      // hitbox offers no make-child zone on one, and so no drop indicator either.
      leavesAcceptChildren
      // Dragging past the last row is the obvious way to say "put it last"; without a target there
      // the sticky rows keep the previous instruction and the drop lands somewhere else entirely.
      dropAtEnd
      indentGuides
      // Deliberately NOT `selectionFollowsFocus`: selecting a task opens its detail (a companion, or
      // a plank), so arrows that selected as they travelled would open every row the reader passes
      // on the way to the one they want. The arrows move focus and `Enter` commits it.
      canSelect={canSelect}
      onOpenChange={handleOpenChange}
      onSelect={handleSelect}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
    >
      <Tree.Label srOnly>{t('task-list.label')}</Tree.Label>
      <Tree.Content>{renderRow}</Tree.Content>
    </Tree.Root>
  );
};

type TaskRowHeadingProps = {
  node: TaskNode;
  showGutter: boolean;
  ordinals: ReadonlyMap<string, number>;
  checked?: ReadonlySet<string>;
  translationKey: string;
  showDescription: boolean;
  descriptionComponents?: TaskDescriptionProps['components'];
  onTaskCheck?: (task: Task.Task) => void;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
};

/**
 * The gutter cell, status control and title — the row's leading cells, after the tree's own
 * disclosure. The gutter holds either the checkbox or the ordinal, never both: they occupy one cell,
 * and a number beside a box reads as two ways to act on the row.
 */
const TaskRowHeading = ({
  node,
  showGutter,
  ordinals,
  checked,
  translationKey,
  showDescription,
  descriptionComponents,
  onTaskCheck,
  onTaskUpdate,
}: TaskRowHeadingProps) => {
  const { t } = useTranslation(translationKey);
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
    // Cells, not a container: they are direct children of the tree row's grid and flow into its
    // tracks in order, so the pane, which names the same tracks, lines up with them.
    <>
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
      <div className='inline-flex min-w-0 items-center gap-2'>
        {/* The live task, not the snapshot: only the live object knows its space, which the copied URI names. */}
        <TaskMnemonic task={task} />
        {/* The placeholder is drawn by CSS so the element's text stays the title itself. */}
        <span
          data-testid='taskList.item.title'
          data-placeholder={t('task-title.placeholder')}
          className='truncate empty:before:text-placeholder empty:before:content-[attr(data-placeholder)]'
        >
          {current.title}
        </span>
      </div>
      {/* Under the title and the chips line (line 2, which collapses when the task has no chips): it
          clears the ordinal and the status control, or it reads as belonging to the row above, and
          stops short of the trailing controls so it does not run beneath them. What the task says,
          and nothing the log recorded — the detail pane a click opens has the room for that. */}
      {description && (
        <div className='col-[title/assignee] row-start-3 flex min-w-0 flex-col gap-2 pb-1'>
          <TaskDescription content={description} components={descriptionComponents} />
        </div>
      )}
    </>
  );
};

/**
 * A group's header: its icon, label and how many tasks it holds, spanning the row from after the
 * disclosure up to the trailing controls. The count is of the group's tasks, sub-tasks included, so
 * it matches what expanding shows.
 */
const TaskGroupHeading = ({ group, translationKey }: { group: TaskGroupHeader; translationKey: string }) => {
  const { t } = useTranslation(translationKey);
  return (
    <div className='col-[2/assignee] flex min-w-0 items-center gap-2' data-testid='taskList.group.header'>
      {group.icon && <Next.Icon icon={group.icon} size='md' classNames={group.iconClassNames} />}
      <span className='truncate font-medium'>{toLocalizedString(group.label, t)}</span>
      <span className='text-sm text-description' data-testid='taskList.group.count'>
        {group.count}
      </span>
    </div>
  );
};
