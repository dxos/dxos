//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { Tag as EchoTag, Filter, Obj, type Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import {
  Icon,
  IconBlock,
  IconButton,
  Tag,
  Tooltip,
  composable,
  composableProps,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { Listbox, TREE_BLOCK, useListDisclosure } from '@dxos/react-ui-list';
import { ActionMenu, type MenuAction, type MenuItem, executeMenuAction, fallbackIcon } from '@dxos/react-ui-menu';
import { type Actor, PullRequest, Task } from '@dxos/types';
import { hoverableControlItem, mx, toHue } from '@dxos/ui-theme';
import { type ComposableProps, type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { type TaskPlacement, subtreeIds } from './hierarchy.ts';
import { STATUS_ORDER } from './status-icons.ts';
import { type TaskDescriptionProps } from './TaskDescription.tsx';
import { TaskListProvider, useTaskListContext } from './TaskListContext.ts';
import { TaskListEditor, type TaskListEditorProps } from './TaskListEditor.tsx';
import { TaskEstimateControl, TaskPriorityIcon } from './TaskRowCells.tsx';
import { type TaskSelectModifiers, TaskTreeNode } from './TaskTreeNode.tsx';
import {
  type TaskGroup,
  type TaskNode,
  buildTaskForest,
  buildTaskGroups,
  flattenVisibleTasks,
  taskGroupNodeId,
} from './tree-model.ts';
import { useAssigneeDisplay } from './useAssigneeDisplay.ts';
import { usePreviewAnchor } from './usePreviewAnchor.ts';

/** Shared empty set, so a list with nothing in flight does not allocate one per render. */
const EMPTY_IDS: ReadonlySet<string> = new Set<string>();

/** Shared empty map, for a tree rendered without the ordinal gutter. */
const EMPTY_ORDINALS: ReadonlyMap<string, number> = new Map<string, number>();

//
// Root — headless context provider. Renders no DOM.
//

type TaskListRootProps = PropsWithChildren<{
  tasks: readonly Task.Task[];

  //
  // Structure.
  //

  /**
   * Group rows into status sections (Linear order); flat list otherwise.
   */
  groupByStatus?: boolean;
  /**
   * Partition the rows under collapsible group headers, each with its count — the host decides the
   * partition (by status, priority, assignee, milestone…) and the order, of groups and within each.
   * Supersedes `groupByStatus`. With `hierarchical`, sub-tasks still nest under a parent in the same
   * group. A group's collapsed state lives in `collapsed` beside the branches', under the group's
   * node id (`taskGroupNodeId`).
   */
  groups?: readonly TaskGroup[];
  /**
   * Render the set as the tree it stores (`Task.subtasks`), not as status groups — the two are
   * mutually exclusive, since a tree regrouped by status is no longer a tree.
   */
  hierarchical?: boolean;
  /**
   * Ids of the branches whose sub-tasks are hidden (controlled). Collapsed rather than expanded
   * ids, because a branch is open by default: tracking the expanded set would render a task's new
   * first sub-task hidden, the moment adding it made its parent a branch. Per viewer and per list —
   * a collapsed branch is not a property of the work — so this is state, not stored on the object.
   */
  collapsed?: ReadonlySet<string>;

  //
  // Selection.
  //

  /**
   * Selected task id (controlled); omit to let the list track the last row clicked.
   */
  selected?: string;
  /**
   * Makes the list selectable without a controlled `selected` or an `onTaskSelect` — for a host
   * whose selection consumers (e.g. `Edit`) live inside the list's own context.
   */
  selectable?: boolean;
  /**
   * Ids of the checked rows (controlled, and only meaningful with `onTaskCheck`). Deliberately
   * separate from `selected`: the current row is where the reader is, the checked set is what an
   * action will act on, and a row is routinely both.
   */
  checked?: ReadonlySet<string>;

  //
  // What a row shows.
  //

  /** Paint the tree's drop bands on every row (development affordance). */
  debug?: boolean;
  /** Render the status heading above each group; grouping order is kept either way. */
  showGroupLabels?: boolean;
  /** Number rows 1..N down the list as rendered, so tasks can be referenced by ordinal. */
  showOrdinals?: boolean;
  /** Render each task's estimate beside the priority control. Off by default. */
  showEstimates?: boolean;
  /**
   * Render each task's description under its title; rows grow to fit. Off by default, so a
   * single-line list (e.g. the chat strip) keeps one row per task.
   */
  showDescription?: boolean;
  /** Renderers for a row's description beyond its own — a host's link anchor, say. */
  descriptionComponents?: TaskDescriptionProps['components'];

  //
  // Callbacks. Wiring one is what enables the affordance that calls it — the list never writes.
  //

  /**
   * Trailing menu for a row. One item renders as a plain icon button, several as a `…` menu, none as
   * nothing — so delete is an ordinary contributed action rather than a special case of its own.
   */
  getTaskActions?: (task: Task.Task) => MenuItem[];
  /**
   * Enables `Create`; called with a draft carrying at least the trimmed title, and the files dropped
   * on the create pane (`Editor`'s `acceptFiles`) for the host to store and attach once it exists.
   */
  onTaskCreate?: TaskCreateHandler;
  /**
   * Enables the row's edit controls. Every mutation is delegated.
   */
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  /**
   * Row click, and `Escape` — which passes `undefined`, since a reader needs a way back out of a
   * selection. Wiring it (or `selected`) makes the list selectable, so the row shows as selected.
   */
  onTaskSelect?: (task: Task.Task | undefined, modifiers?: TaskSelectModifiers) => void;
  /**
   * Enables the gutter checkbox, called with the row toggled. The host owns the set — this list is
   * embedded in surfaces whose toolbars read the same selection — so nothing is tracked here.
   */
  onTaskCheck?: (task: Task.Task) => void;
  /**
   * Enables restructuring by drag and by keyboard; called with the one move the gesture means.
   * `MoveTask` takes exactly this pair, so a drop is a single mutation rather than a re-parent
   * followed by a reposition.
   */
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
  /**
   * Enables collapsing/expanding a task's sub-tasks; called with the new set of collapsed ids.
   */
  onCollapsedChange?: (collapsed: ReadonlySet<string>) => void;
}>;

/**
 * What a create came to. `error` means no task was created, so the pane keeps the whole draft;
 * `rejectedFiles` are files the task was created without, which the pane keeps to retry. Nothing
 * (or neither field) means the task and every file were taken.
 */
export type TaskCreateResult = { error?: unknown; rejectedFiles?: readonly File[] };

/** Creates a task from the pane's draft; see {@link TaskCreateResult} for what it may report back. */
export type TaskCreateHandler = (
  task: Task.Draft,
  files?: readonly File[],
) => void | TaskCreateResult | Promise<void | TaskCreateResult>;

const TaskListRoot = ({
  children,
  tasks,
  groupByStatus = true,
  groups,
  debug = false,
  showGroupLabels = true,
  showOrdinals = false,
  showDescription = false,
  descriptionComponents,
  showEstimates = false,
  hierarchical = false,
  collapsed,
  selected: selectedProp,
  selectable: selectableProp,
  checked = EMPTY_IDS,
  getTaskActions,
  onTaskCreate,
  onTaskUpdate,
  onTaskSelect,
  onTaskCheck,
  onTaskMove,
  onCollapsedChange,
}: TaskListRootProps) => {
  // Uncontrolled by default: a host that only wants the click callback still gets the selected
  // styling, and one that owns the selection passes `selected`.
  const [selectedState, setSelectedState] = useState<string | undefined>(selectedProp);
  const selected = selectedProp ?? selectedState;
  const selectable = selectableProp ?? (!!onTaskSelect || selectedProp !== undefined);

  const handleValueChange = useCallback(
    (id: string) => {
      setSelectedState(id);
      const task = tasks.find((task) => task.id === id);
      if (task) {
        onTaskSelect?.(task);
      }
    },
    [tasks, onTaskSelect],
  );

  // Passing `undefined` clears the selection — what `Escape` on a row and the edit pane's buttons do.
  const handleSelect = useCallback(
    (task: Task.Task | undefined, modifiers?: TaskSelectModifiers) => {
      setSelectedState(task?.id);
      onTaskSelect?.(task, modifiers);
    },
    [onTaskSelect],
  );

  // The hook owns the controlled/uncontrolled Set state machine; its trigger/panel ids are not
  // used, because a sub-task is a sibling row in the same grid rather than a region the toggle
  // could point `aria-controls` at — `aria-expanded` on the row carries the disclosure instead.
  const disclosure = useListDisclosure({
    mode: 'multi',
    ...(collapsed !== undefined || onCollapsedChange ? { value: collapsed } : {}),
    defaultValue: new Set<string>(),
    onValueChange: onCollapsedChange,
  });
  const isCollapsed = useCallback((id: string) => disclosure.bind(id).expanded, [disclosure]);
  const onCollapseToggle = useCallback((id: string) => disclosure.bind(id).toggle(), [disclosure]);

  // A dragged task leaves the list while it is in flight — it is in the reader's hand, shown in the
  // drag preview — so the rows close up over the gap it came from. Its sub-tasks go with it: they
  // travel with their parent and are part of the same preview.
  const [draggingTask, setDraggingTask] = useState<Task.Task>();
  const dragging = useMemo(() => (draggingTask ? subtreeIds(tasks, draggingTask) : EMPTY_IDS), [tasks, draggingTask]);

  // The checkbox shares the ordinal's gutter, so a checkable list reserves the track even when it
  // shows no numbers. A movable one does not: the whole row is the drag source, and a track held
  // for a handle that no longer exists only pushed every title one square right.
  const showGutter = showOrdinals || !!onTaskCheck;
  const gridTemplateColumns = useMemo(
    () =>
      buildGridTemplate({
        toggle: hierarchical || !!groups,
        showGutter,
        showEstimates,
        hasActions: !!getTaskActions,
      }),
    [hierarchical, groups, showGutter, showEstimates, getTaskActions],
  );

  return (
    <TaskListProvider
      tasks={tasks}
      gridTemplateColumns={gridTemplateColumns}
      // Not gated on `!hierarchical` any more: the tree expresses a status group as a `group` node,
      // so grouping and hierarchy are a choice rather than mutually exclusive capabilities.
      groupByStatus={groupByStatus}
      groups={groups}
      showGroupLabels={showGroupLabels}
      showOrdinals={showOrdinals}
      showDescription={showDescription}
      descriptionComponents={descriptionComponents}
      showEstimates={showEstimates}
      hierarchical={hierarchical}
      debug={debug}
      showGutter={showGutter}
      isCollapsed={isCollapsed}
      selected={selected}
      checked={checked}
      dragging={dragging}
      getTaskActions={getTaskActions}
      onDraggingChange={setDraggingTask}
      onCollapseToggle={onCollapseToggle}
      onTaskCreate={onTaskCreate}
      onTaskUpdate={onTaskUpdate}
      onTaskSelect={selectable ? handleSelect : undefined}
      onTaskCheck={onTaskCheck}
      onTaskMove={onTaskMove}
    >
      {/* Both roots are headless, so the pair renders no DOM of its own. */}
      <Listbox.Root {...(selectable ? { value: selected, onValueChange: handleValueChange } : {})}>
        {children}
      </Listbox.Root>
    </TaskListProvider>
  );
};

TaskListRoot.displayName = 'TaskList.Root';

//
// Viewport — the scrolling region (the listbox's own viewport). `Create` sits outside it, so the
// add row stays pinned while the rows scroll.
//

type TaskListViewportProps = ComposableProps<{
  /** Caps the height at exactly this many rows, so a longer list scrolls without showing a partial row. */
  rows?: number;
}>;

const TaskListViewport = composable<HTMLDivElement, TaskListViewportProps>(
  ({ children, rows: rowsProp, ...props }, forwardedRef) => {
    const { className, style, ...rest } = composableProps(props);
    // Whole rows only: a fractional count would cut through the next row.
    const rows = rowsProp === undefined ? undefined : Math.max(Math.floor(rowsProp), 0);
    return (
      <Listbox.Viewport
        {...rest}
        classNames={mx('dx-shrink', className)}
        // Each row is one control tall (the rail-item square every cell holds), and the tree's grid
        // puts a `gap-0.5` (0.125rem) between rows; without the gaps the last row is cut short.
        style={
          rows === undefined
            ? style
            : { ...style, maxHeight: `calc(${rows} * var(--dx-control) + ${Math.max(rows - 1, 0)} * 0.125rem)` }
        }
        ref={forwardedRef}
      >
        {children}
      </Listbox.Viewport>
    );
  },
);

TaskListViewport.displayName = 'TaskList.Viewport';

//
// Content — the rows, grouped by status when the root says so.
//

/** Ordinals stop at 99: the gutter is sized for two digits. */
const MAX_ORDINAL = 99;

/**
 * One column template per list, built from its options and shared by the tree's rows and the edit
 * pane (the create row sits outside the scrolling viewport, in a grid of its own), so the pane's
 * icon sits under the rows' status controls and its field starts where their titles do.
 *
 * Every fixed track is one control — the rail-item square each cell's `IconBlock` holds — and a
 * track exists only when its option is on, so a cell is never rendered into a track that is not
 * there and no track is held empty. Cells flow into the tracks in DOM order; the names are for the
 * pane and the description, which place themselves.
 */
type GridTrack = readonly [name: string | undefined, size: string, endName?: string];

const buildGridTemplate = ({
  toggle,
  showGutter,
  showEstimates,
  hasActions,
}: {
  /** A hierarchical list has branches to disclose; a flat one holds no square for a chevron. */
  toggle: boolean;
  showGutter: boolean;
  showEstimates: boolean;
  hasActions: boolean;
}): string => {
  const candidates: (GridTrack | false)[] = [
    // The tree's block, which each level also indents by, so a guide lands under its branch's chevron.
    toggle && [undefined, TREE_BLOCK],
    showGutter && ['gutter', 'var(--dx-control)'],
    ['status', 'var(--dx-control)'],
    ['title', 'minmax(0, 1fr)'],
    // Sized by its content: a row with no pull request holds no width for one.
    ['artifacts', 'auto'],
    ['assignee', 'var(--dx-control)'],
    showEstimates && ['estimate', 'var(--dx-control)'],
    ['priority', 'var(--dx-control)'],
    hasActions && ['actions', 'var(--dx-control)'],
  ];

  const tracks = candidates.filter((track): track is GridTrack => !!track);

  // A line carries all its names in one bracket: `[tree-row-start] [status]` with no track between
  // is invalid and silently drops the whole declaration, which is what happens the moment the
  // toggle track is omitted — so the first track's name joins the row's own.
  return tracks
    .map(([name, size], index) => {
      // A track's `endName` belongs to the line that follows it, which is the same line the next
      // track's own name sits on — so it is emitted here rather than by the track that declares it.
      const names = [index === 0 && 'tree-row-start', tracks[index - 1]?.[2], name].filter(Boolean).join(' ');
      return `${names ? `[${names}] ` : ''}${size}`;
    })
    .concat(`[${['tree-row-end', tracks.at(-1)?.[2]].filter(Boolean).join(' ')}]`)
    .join(' ');
};

/**
 * `classNames` only, and no ref: the part renders no element of its own — it is the tree, and
 * `Tree` takes a class list and forwards no ref. A wider `ComposableProps` would accept props the
 * tree has nowhere to put, which is how the class list came to be dropped silently.
 */
type TaskListContentProps = ThemedClassName<{}>;

const TaskListContent = ({ classNames }: TaskListContentProps) => {
  const {
    tasks,
    groupByStatus,
    groups,
    hierarchical,
    selected,
    checked,
    dragging,
    debug,
    showGroupLabels,
    showOrdinals,
    showDescription,
    descriptionComponents,
    showGutter,
    gridTemplateColumns,
    isCollapsed,
    onCollapseToggle,
    onTaskCheck,
    onTaskSelect,
    onTaskUpdate,
    onTaskMove,
  } = useTaskListContext('TaskList.Content');
  // Collapsed ids live in `Root`; read through the callback so a flip still recomputes.
  // A group's header collapses like a branch, so its node id joins the tasks' in the same set.
  const collapsed = useMemo(
    () =>
      new Set(
        [...tasks.map((task) => task.id), ...(groups ?? []).map((group) => taskGroupNodeId(group))].filter(isCollapsed),
      ),
    [tasks, groups, isCollapsed],
  );

  // Grouping and hierarchy are alternatives: a status group holds its tasks flat, because a
  // sub-task's status need not match its parent's.
  const grouping = !groups && !hierarchical && groupByStatus && showGroupLabels ? STATUS_ORDER : undefined;

  // Numbered down the list as rendered, 1..N. Flat either way: an ordinal names a task ("run 3"),
  // where a `1.2.1` path would renumber a whole branch.
  const ordinals = useMemo(() => {
    const ordered = groups
      ? flattenVisibleTasks(buildTaskGroups(groups, hierarchical), collapsed)
      : grouping
        ? grouping.flatMap((status) => tasks.filter((task) => (task.status ?? 'todo') === status))
        : hierarchical
          ? flattenVisibleTasks(buildTaskForest(tasks), collapsed)
          : tasks;
    // A dragged row and its sub-tasks are hidden rather than unmounted, so they are still in
    // `ordered` — numbering them would leave gaps in the column the reader can actually see.
    const visible = dragging.size > 0 ? ordered.filter((task) => !dragging.has(task.id)) : ordered;
    // Past 99 the number outgrows the gutter, so it is dropped rather than shrunk.
    return new Map(visible.flatMap((task, index) => (index < MAX_ORDINAL ? [[task.id, index + 1] as const] : [])));
  }, [tasks, collapsed, groups, grouping, hierarchical, dragging]);

  // One path: every mode renders through `Tree`. A flat list is a tree of depth one, and a status
  // group is a `group` node the machine splices out of its own topology.
  return (
    <TaskTreeNode
      descriptionComponents={descriptionComponents}
      debug={debug}
      hierarchical={hierarchical}
      groupByStatus={grouping}
      groups={groups}
      tasks={tasks}
      collapsed={collapsed}
      showGutter={showGutter}
      gridTemplateColumns={gridTemplateColumns}
      ordinals={showOrdinals ? ordinals : EMPTY_ORDINALS}
      selected={selected}
      checked={checked}
      showDescription={showDescription}
      renderTrailing={TaskTreeTrailing}
      translationKey={translationKey}
      onCollapseToggle={onCollapseToggle}
      onTaskCheck={onTaskCheck}
      onTaskSelect={onTaskSelect}
      onTaskUpdate={onTaskUpdate}
      onTaskMove={onTaskMove}
      // Flattened here rather than in the tree: `ThemedClassName` admits nested arrays and nulls,
      // and `Tree` takes a plain list.
      classNames={mx(classNames)}
    />
  );
};

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
      className={mx('col-span-full min-h-(--dx-control) flex items-center text-sm text-description', className)}
      ref={forwardedRef}
    >
      <span>{children}</span>
    </div>
  );
});

TaskListGroupLabel.displayName = 'TaskList.GroupLabel';

/** Trailing cells of a tree row — the same content the flat row puts after its title. */
const TaskTreeTrailing = ({ item }: { item: TaskNode }) => {
  const { t } = useTranslation(translationKey);
  const { showEstimates } = useTaskListContext('TaskList.TreeTrailing');
  const task = item.task;
  // Subscribed for the same reason as the heading: priority, estimate and assignee are property
  // edits, which do not change the task array the model is built from.
  const [snapshot] = useObject(task);
  const current = snapshot ?? task;
  if (!task || !current) {
    return null;
  }

  return (
    <>
      {/* On the title line, beside who has the task: the pull request is what the row is scanned for
          once work is under way, and on a line of its own it pushed the description down. */}
      <div className='col-[artifacts] row-start-1 flex items-center gap-1 ps-1' data-testid='taskList.item.artifacts'>
        <TaskListItemArtifacts task={task} filter={(artifact) => PullRequest.instanceOf(artifact)} />
      </div>
      <div className='col-[assignee] row-start-1 grid place-items-center'>
        {current.assignee && <TaskListAssignee assignee={current.assignee} iconOnly />}
      </div>
      {showEstimates && <TaskEstimateControl task={task} />}
      <TaskPriorityIcon task={task} />
      <TaskListItemActions task={task} />

      {/* TODO(burdon): Update TaskTreeNode to render second line. */}
      <div className='col-[title] row-start-2 flex items-center empty:hidden' data-testid='taskList.item.chips'>
        <TaskListItemTags task={task} tags={Obj.getMeta(task).tags} />
      </div>
    </>
  );
};

//
// Item actions — the trailing cell of a row.
//

// The row drives `--controls-opacity` on hover, focus and selection, so its controls reveal
// together. The previous `group-hover/row:visible` named a group that only the flat row declared —
// once rows became tree rows nothing matched it and the actions stayed hidden even on hover.
const ROW_ACTION_CLASSNAMES = hoverableControlItem;

const isMenuAction = (item: MenuItem): item is MenuAction => 'data' in item && typeof item.data === 'function';

/**
 * A row's contributed actions. One is a plain button — a `…` menu hiding a single item costs a click
 * to discover nothing — and several collapse into the overflow menu, matching the nav tree's rows.
 */
const TaskListItemActions = ({ task }: { task: Task.Task }) => {
  const { t } = useTranslation(translationKey);
  const { getTaskActions } = useTaskListContext('TaskList.ItemActions');
  const actions = useMemo(() => getTaskActions?.(task) ?? [], [getTaskActions, task]);

  if (actions.length === 0) {
    return null;
  }

  const [only] = actions;
  if (actions.length === 1 && isMenuAction(only)) {
    return (
      <IconBlock>
        <IconButton
          variant='ghost'
          iconOnly
          icon={only.properties?.icon ?? fallbackIcon}
          label={toLocalizedString(only.properties?.label, t)}
          data-testid={only.properties?.testId}
          classNames={ROW_ACTION_CLASSNAMES}
          onClick={(event) => {
            // The row is the selection target; running its action must not also select it.
            event.stopPropagation();
            void executeMenuAction(only);
          }}
        />
      </IconBlock>
    );
  }

  return (
    <IconBlock>
      {/* The button is the trigger, not the block: the button stops the click so the row is not selected
          too, and a trigger above it would never receive it. The block still gives every control in
          the row one rail-item square. */}
      <ActionMenu deferUntilOpen actions={actions}>
        <IconButton
          variant='ghost'
          iconOnly
          icon='ph--dots-three-vertical--regular'
          label={t('task-actions.label')}
          data-testid='taskList.item.actions'
          classNames={ROW_ACTION_CLASSNAMES}
          onClick={(event) => event.stopPropagation()}
        />
      </ActionMenu>
    </IconBlock>
  );
};

TaskListItemActions.displayName = 'TaskList.ItemActions';

/**
 * What a task produced, one tag each. Queried rather than read off `ref.target`: on a cold load the
 * targets are not in memory yet, and a sync read would leave the row permanently empty.
 */
const TaskListItemArtifacts = ({ task, filter }: { task: Task.Task; filter?: (obj: Obj.Unknown) => boolean }) => {
  const db = Obj.getDatabase(task);
  const ids = useMemo(
    () =>
      (task.artifacts ?? []).flatMap((ref) => {
        const id = Task.refEntityId(ref);
        return id ? [id] : [];
      }),
    [task.artifacts],
  );
  const queried = useQuery(ids.length > 0 ? db : undefined, Filter.id(...ids));
  // Without a database — a story, a preview — the refs were made from objects already in hand,
  // so their targets resolve synchronously and the row still shows what the task produced.
  const resolved = db ? queried : (task.artifacts ?? []).flatMap((ref) => (ref.target ? [ref.target] : []));
  const artifacts = filter ? resolved.filter(filter) : resolved;

  return (
    <>
      {artifacts.map((artifact) => (
        <ArtifactTag key={artifact.id} artifact={artifact} />
      ))}
    </>
  );
};

TaskListItemArtifacts.displayName = 'TaskList.ItemArtifacts';

/**
 * Everything a task carries as a chip: its tags, what it produced, and who has it.
 */
export const TaskTags = ({ task }: { task: Task.Task }) => {
  return (
    <>
      <TaskListItemTags task={task} tags={Obj.getMeta(task).tags} />
      <TaskListItemArtifacts task={task} filter={(artifact) => PullRequest.instanceOf(artifact)} />
    </>
  );
};

TaskTags.displayName = 'TaskList.Tags';

/**
 * The task's tags, as chips in the same cell as its artifacts and assignee. Queried by id for the
 * reason artifacts are: a tag's target is not in memory on a cold load.
 */
const TaskListItemTags = ({ task, tags }: { task: Task.Task; tags: readonly Ref.Ref<EchoTag.Tag>[] }) => {
  const db = Obj.getDatabase(task);
  const ids = useMemo(
    () =>
      tags.flatMap((ref) => {
        const id = Task.refEntityId(ref);
        return id ? [id] : [];
      }),
    [tags],
  );
  const queried = useQuery(ids.length > 0 ? db : undefined, Filter.id(...ids));
  const resolved = db ? queried : tags.flatMap((ref) => (ref.target ? [ref.target] : []));
  const labelled = useMemo(
    () => resolved.filter((object) => Obj.instanceOf(EchoTag.Tag, object)).sort(EchoTag.sortTags),
    [resolved],
  );

  return (
    <>
      {labelled.map((tag) => (
        <Tag key={tag.id} hue={toHue(tag.hue)} data-testid='taskList.item.tag'>
          {tag.label}
        </Tag>
      ))}
    </>
  );
};

TaskListItemTags.displayName = 'TaskList.ItemTags';

/**
 * One artifact, as a tag: hovering shows the object's card and clicking opens the object. The tag
 * takes no tab stop of its own, since inside a listbox option it would split the row into several
 * arrow-key stops.
 *
 * A {@link PullRequest.PullRequest} renders as its `#number` pill — the form a PR link takes in
 * markdown — so a row reads the same as the text that references it.
 */
const ArtifactTag = ({ artifact }: { artifact: Obj.Unknown }) => {
  const label = Obj.getLabel(artifact) ?? Obj.getTypename(artifact) ?? '';
  const anchor = usePreviewAnchor({ eid: Obj.getURI(artifact).toString(), label });

  if (PullRequest.instanceOf(artifact)) {
    return (
      <IconButton
        {...anchor}
        variant='tag'
        density='sm'
        // The anchor chip's outlined look (`.dx-tag--anchor`), so the pill matches a PR link in a description.
        classNames='bg-input-surface text-base-fg font-normal ring-inset ring ring-neutral-border hover:bg-hover-surface hover:ring-info-border'
        icon='ph--git-pull-request--regular'
        iconClassNames={pullRequestStateStyle[artifact.state]}
        label={`#${artifact.number}`}
        tabIndex={-1}
        noTooltip
      />
    );
  }

  return (
    <Tag {...anchor} hue='amber' classNames='cursor-pointer'>
      {label}
    </Tag>
  );
};

ArtifactTag.displayName = 'TaskList.ArtifactTag';

/** GitHub's own state colours, so the icon reads as open, merged or closed at a glance. */
const pullRequestStateStyle: Record<PullRequest.State, string> = {
  open: 'text-green-500',
  merged: 'text-violet-500',
  closed: 'text-red-500',
  draft: 'text-description',
};

//
// Assignee — actor-aware chip, named and marked by `useAssigneeDisplay` so it agrees with the
// properties row.
//

type TaskListAssigneeProps = {
  assignee: Actor.Actor;
  /** Shows the glyph alone, naming the assignee on hover — for a row where the name crowds the title. */
  iconOnly?: boolean;
};

const TaskListAssignee = composable<HTMLSpanElement, TaskListAssigneeProps>(({ assignee, iconOnly }, _forwardedRef) => {
  const { label, icon, agent, session: harness } = useAssigneeDisplay(assignee);
  const [session] = useObject(assignee.subject);
  const anchor = usePreviewAnchor({
    eid: session && Obj.getURI(session).toString(),
    label: label ?? '',
    // Without this the card falls back to the type's placeholder ("New item"), since a session's
    // label prop is its title and the harness reports none.
    title: harness?.title ?? label,
  });

  if (!label && !agent) {
    return null;
  }

  const tag = (
    <Tag
      hue={agent ? 'purple' : 'indigo'}
      data-testid='taskList.item.assignee'
      // A button when there is a session to open, so the keyboard reaches it as the pointer does.
      {...(session && { ...anchor, role: 'button', tabIndex: 0 })}
      classNames={session && 'cursor-pointer'}
    >
      {(agent || iconOnly) && <Icon icon={icon} size={3} classNames={mx('inline-block', !iconOnly && 'me-1')} />}
      {iconOnly ? <span className='sr-only'>{label}</span> : label}
    </Tag>
  );

  // A session shows its card on hover, which already names the run; a tooltip would stack on it.
  return iconOnly && !session && label ? (
    <Tooltip.Trigger asChild content={label}>
      {tag}
    </Tooltip.Trigger>
  ) : (
    tag
  );
});

TaskListAssignee.displayName = 'TaskList.Assignee';

//
// TaskList
//

export const TaskList = {
  Root: TaskListRoot,
  Viewport: TaskListViewport,
  Content: TaskListContent,
  GroupLabel: TaskListGroupLabel,
  Assignee: TaskListAssignee,
  Editor: TaskListEditor,
};

export type {
  TaskListAssigneeProps,
  TaskListContentProps,
  TaskListEditorProps,
  TaskListGroupLabelProps,
  TaskListRootProps,
  TaskListViewportProps,
};
