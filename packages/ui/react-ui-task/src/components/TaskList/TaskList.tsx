//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';

import { Tag as EchoTag, Filter, Obj, type Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import {
  DxAnchorActivate,
  Icon,
  IconBlock,
  IconButton,
  Tag,
  composable,
  composableProps,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { useCardHover } from '@dxos/react-ui-card';
import { Listbox, useListDisclosure } from '@dxos/react-ui-list';
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
import { type TaskNode, buildTaskForest, flattenVisibleTasks } from './tree-model.ts';
import { useAssigneeDisplay } from './useAssigneeDisplay.ts';

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
   * Render the set as the tree it stores (`Task.parentTask`), not as status groups — the two are
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
 * Creates a task from the pane's draft. May resolve to the files it could not attach, which the pane
 * then keeps so they are not lost; anything else means every file was taken.
 */
export type TaskCreateHandler = (
  task: Task.Draft,
  files?: readonly File[],
) => void | readonly File[] | Promise<void | readonly File[]>;

const TaskListRoot = ({
  children,
  tasks,
  groupByStatus = true,
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
    () => buildGridTemplate({ toggle: hierarchical, showGutter, showEstimates, hasActions: !!getTaskActions }),
    [hierarchical, showGutter, showEstimates, getTaskActions],
  );

  return (
    <TaskListProvider
      tasks={tasks}
      gridTemplateColumns={gridTemplateColumns}
      // Not gated on `!hierarchical` any more: the tree expresses a status group as a `group` node,
      // so grouping and hierarchy are a choice rather than mutually exclusive capabilities.
      groupByStatus={groupByStatus}
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

type TaskListViewportProps = ComposableProps;

const TaskListViewport = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  return (
    <Listbox.Viewport {...rest} classNames={mx('dx-shrink', className)} ref={forwardedRef}>
      {children}
    </Listbox.Viewport>
  );
});

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
    toggle && [undefined, 'var(--dx-control)'],
    showGutter && ['gutter', 'var(--dx-control)'],
    ['status', 'var(--dx-control)'],
    ['title', 'minmax(0, 1fr)'],
    // Capped so a long session name truncates rather than squeezing the title to nothing.
    ['assignee', 'fit-content(40%)'],
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
  const collapsed = useMemo(() => new Set(tasks.map((task) => task.id).filter(isCollapsed)), [tasks, isCollapsed]);

  // Grouping and hierarchy are alternatives: a status group holds its tasks flat, because a
  // sub-task's status need not match its parent's.
  const grouping = !hierarchical && groupByStatus && showGroupLabels ? STATUS_ORDER : undefined;

  // Numbered down the list as rendered, 1..N. Flat either way: an ordinal names a task ("run 3"),
  // where a `1.2.1` path would renumber a whole branch.
  const ordinals = useMemo(() => {
    const ordered = grouping
      ? grouping.flatMap((status) => tasks.filter((task) => (task.status ?? 'todo') === status))
      : hierarchical
        ? flattenVisibleTasks(buildTaskForest(tasks), collapsed)
        : tasks;
    // A dragged row and its sub-tasks are hidden rather than unmounted, so they are still in
    // `ordered` — numbering them would leave gaps in the column the reader can actually see.
    const visible = dragging.size > 0 ? ordered.filter((task) => !dragging.has(task.id)) : ordered;
    // Past 99 the number outgrows the gutter, so it is dropped rather than shrunk.
    return new Map(visible.flatMap((task, index) => (index < MAX_ORDINAL ? [[task.id, index + 1] as const] : [])));
  }, [tasks, collapsed, grouping, hierarchical, dragging]);

  // One path: every mode renders through `Tree`. A flat list is a tree of depth one, and a status
  // group is a `group` node the machine splices out of its own topology.
  return (
    <TaskTreeNode
      descriptionComponents={descriptionComponents}
      debug={debug}
      hierarchical={hierarchical}
      groupByStatus={grouping}
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
      {/* Direct children of the row's grid. The tags and artifacts take a line of their own under the
          title and above the description: on the title line they competed with it for width, and a
          long artifact tag truncated the one thing a reader scans the list for. `empty:hidden` keeps
          a row with no chips from holding an empty line. The assignee stays on the title line, where
          "who has it" is read with the title. */}
      <div
        data-testid='taskList.item.chips'
        className='col-[title] row-start-2 flex min-w-0 flex-wrap items-center gap-1 pb-1 empty:hidden'
      >
        <TaskTags task={task} assignee={false} />
      </div>
      <div className='col-[assignee] row-start-1 flex h-(--dx-control) min-w-0 items-center justify-end ps-1 *:truncate'>
        {current.assignee && <TaskListAssignee assignee={current.assignee} />}
      </div>
      {/* The controls flow into the `estimate`, `priority` and `actions` tracks in this order —
          `buildGridTemplate` declares a track only when its option is on, and the matching cell is
          omitted on the same condition, so the two never drift. */}
      {showEstimates && <TaskEstimateControl task={task} />}
      <TaskPriorityIcon task={task} />
      <TaskListItemActions task={task} />
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
const TaskListItemArtifacts = ({ task }: { task: Task.Task }) => {
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
  // Without a database — a story, a preview — the refs were made from objects already in hand, so
  // their targets resolve synchronously and the row still shows what the task produced.
  const artifacts = db ? queried : (task.artifacts ?? []).flatMap((ref) => (ref.target ? [ref.target] : []));

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
 *
 * Bare chips with no layout of their own, so a host decides how they run — the row scrolls them on
 * one line inside its chip cell, a detail pane wraps them into a flow under the title. Rendering the
 * same set in both is the point: a reader who learned the row's chips reads the pane's without
 * learning anything new.
 */
export const TaskTags = ({
  task,
  assignee = true,
}: {
  task: Task.Task;
  /** Off where the host places the assignee itself — the list row keeps it on the title line. */
  assignee?: boolean;
}) => {
  // The object, not the prop: an assignee set from elsewhere must reach the chips without the host
  // re-rendering, which is what a row's snapshot gives it and a pane's subject does not.
  const [snapshot] = useObject(task);
  const current = snapshot ?? task;
  return (
    <>
      <TaskListItemTags task={task} tags={Obj.getMeta(task).tags} />
      <TaskListItemArtifacts task={task} />
      {assignee && current?.assignee && <TaskListAssignee assignee={current.assignee} />}
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
 * One artifact, as a tag that opens the object's preview card — the row names what the task
 * produced, and the reader wants to see it without leaving the list.
 *
 * Click, not hover or focus: the tag sits inside a listbox option, where a tab stop of its own would
 * split the row into several arrow-key stops, and a hover card would fire while the pointer crosses
 * the row on its way somewhere else.
 *
 * A {@link PullRequest.PullRequest} renders as its `#number` pill — the form a PR link takes in
 * markdown — so a row reads the same as the text that references it.
 */
const ArtifactTag = ({ artifact }: { artifact: Obj.Unknown }) => {
  const tagRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = Obj.getLabel(artifact) ?? Obj.getTypename(artifact) ?? '';
  // Keyed on the URI string, not the object: the live query re-identifies the artifact on every
  // tick, and the callback should not change with it.
  const uri = Obj.getURI(artifact);
  const openCard = useCallback(() => {
    const trigger = tagRef.current ?? buttonRef.current;
    trigger?.dispatchEvent(new DxAnchorActivate({ trigger, eid: uri, label, kind: 'card' }));
  }, [uri, label]);
  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      // The row is an option: without this the click selects the task as well as opening the card.
      event.stopPropagation();
      openCard();
    },
    [openCard],
  );

  if (PullRequest.instanceOf(artifact)) {
    return (
      <IconButton
        ref={buttonRef}
        variant='tag'
        density='sm'
        // The anchor chip's outlined look (`.dx-tag--anchor`), so the pill matches a PR link in a description.
        classNames='bg-input-surface text-base-fg font-normal ring-inset ring ring-neutral-border hover:bg-hover-surface hover:ring-info-border'
        icon='ph--git-pull-request--regular'
        iconClassNames={pullRequestStateStyle[artifact.state]}
        label={`#${artifact.number}`}
        // No tab stop of its own, for the same reason the plain tag has none.
        tabIndex={-1}
        noTooltip
        onClick={handleClick}
      />
    );
  }

  return (
    <Tag ref={tagRef} hue='amber' classNames='cursor-pointer' onClick={handleClick}>
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

type TaskListAssigneeProps = { assignee: Actor.Actor };

const TaskListAssignee = composable<HTMLSpanElement, TaskListAssigneeProps>(({ assignee }, _forwardedRef) => {
  const tagRef = useRef<HTMLSpanElement>(null);
  const { label, icon, agent, session: harness } = useAssigneeDisplay(assignee);
  const [session] = useObject(assignee.subject);

  // Hover, not click, because the session is context for the row rather than a place to navigate to:
  // the reader wants to know which run owns the task while their eye is already on it. The grace
  // period is what keeps that from firing as the pointer crosses the row on its way elsewhere —
  // the objection recorded on `ArtifactTag`, which opens a destination and so stays on click.
  const openCard = useCallback(() => {
    const trigger = tagRef.current;
    if (!trigger || !session) {
      return;
    }
    trigger.dispatchEvent(
      new DxAnchorActivate({
        trigger,
        eid: Obj.getURI(session).toString(),
        label: label ?? '',
        kind: 'card',
        // Without this the popover falls back to the type's placeholder ("New item"), since a
        // session's label prop is its title and the harness reports none.
        title: harness?.title ?? label,
      }),
    );
  }, [session, harness, label]);
  const { start: startHover, cancel: cancelHover } = useCardHover(openCard, !!session);

  if (!label && !agent) {
    return null;
  }

  return (
    <Tag
      ref={tagRef}
      hue={agent ? 'purple' : 'indigo'}
      data-testid='taskList.item.assignee'
      // Focus as well as hover: the card is the only place the row says which run owns the task, so
      // a pointer-only trigger puts that out of reach of a keyboard or a touch device.
      tabIndex={session ? 0 : undefined}
      onPointerEnter={startHover}
      onPointerLeave={cancelHover}
      onFocus={startHover}
      onBlur={cancelHover}
      classNames={session && 'cursor-help'}
    >
      {agent && <Icon icon={icon} size={3} classNames='inline-block me-1' />}
      {label}
    </Tag>
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
