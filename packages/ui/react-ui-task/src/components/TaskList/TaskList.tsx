//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type KeyboardEvent,
  type MouseEvent,
  type PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import {
  Button,
  DxAnchorActivate,
  Icon,
  IconBlock,
  IconButton,
  Input,
  Tag,
  Toolbar,
  composable,
  composableProps,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { Listbox, useListDisclosure } from '@dxos/react-ui-list';
import { MarkdownEditable, type MarkdownEditableController } from '@dxos/react-ui-markdown';
import {
  Menu,
  type MenuAction,
  type MenuItem,
  createMenuAction,
  executeMenuAction,
  fallbackIcon,
} from '@dxos/react-ui-menu';
import { type Actor, Task } from '@dxos/types';
import { hoverableControlItem, mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { type TaskPlacement, subtreeIds } from './hierarchy.ts';
import { STATUS_ORDER, estimateTextStyle, priorityIcon, priorityTextStyle } from './status-icons.ts';
import { TaskTreeContent } from './TaskTreeContent.tsx';
import { type TaskNode, buildTaskForest, flattenVisibleTasks } from './tree-model.ts';

const shortDid = (did: string): string => `${did.slice(0, 12)}…`;

//
// Context — plain Radix context (un-scoped); nesting task lists has no meaning today.
//

const TASK_LIST_NAME = 'TaskList.Root';

type TaskListContextValue = {
  tasks: readonly Task.Task[];
  groupByStatus: boolean;
  showGroupLabels: boolean;
  showOrdinals: boolean;
  showDescription: boolean;
  /** Render each task's estimate beside the priority control. */
  showEstimates: boolean;
  hierarchical: boolean;
  /** Paint the tree's drop bands on every row (development affordance). */
  debug: boolean;
  /** Whether the leading gutter is rendered at all — it holds the ordinal and the drag handle. */
  showGutter: boolean;
  selected?: string;
  /** Whether a branch's sub-tasks are hidden, and the toggle that flips it. */
  isCollapsed: (id: string) => boolean;
  onCollapseToggle: (id: string) => void;
  /** Ids of the task being dragged and its sub-tasks — lifted out of the list for the drag's duration. */
  dragging: ReadonlySet<string>;
  onDraggingChange: (task: Task.Task | undefined) => void;
  onTaskCreate?: (task: Task.Draft) => void;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  getTaskActions?: (task: Task.Task) => MenuItem[];
  /** Selects a task, or clears the selection with `undefined`; defined only when the list is selectable. */
  onTaskSelect?: (task: Task.Task | undefined) => void;
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
};

const [TaskListProvider, useTaskListContext] = createContext<TaskListContextValue>(TASK_LIST_NAME);

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

  //
  // Callbacks. Wiring one is what enables the affordance that calls it — the list never writes.
  //

  /**
   * Trailing menu for a row. One item renders as a plain icon button, several as a `…` menu, none as
   * nothing — so delete is an ordinary contributed action rather than a special case of its own.
   */
  getTaskActions?: (task: Task.Task) => MenuItem[];
  /**
   * Enables `Create`; called with a draft carrying at least the trimmed title.
   */
  onTaskCreate?: (task: Task.Draft) => void;
  /**
   * Enables the row's edit controls. Every mutation is delegated.
   */
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  /**
   * Row click, and `Escape` — which passes `undefined`, since a reader needs a way back out of a
   * selection. Wiring it (or `selected`) makes the list selectable, so the row shows as selected.
   */
  onTaskSelect?: (task: Task.Task | undefined) => void;
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

const TaskListRoot = ({
  children,
  tasks,
  groupByStatus = true,
  debug = false,
  showGroupLabels = true,
  showOrdinals = false,
  showDescription = false,
  showEstimates = false,
  hierarchical = false,
  collapsed,
  selected: selectedProp,
  selectable: selectableProp,
  getTaskActions,
  onTaskCreate,
  onTaskUpdate,
  onTaskSelect,
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
    (task: Task.Task | undefined) => {
      setSelectedState(task?.id);
      onTaskSelect?.(task);
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

  return (
    <TaskListProvider
      tasks={tasks}
      // Not gated on `!hierarchical` any more: the tree expresses a status group as a `group` node,
      // so grouping and hierarchy are a choice rather than mutually exclusive capabilities.
      groupByStatus={groupByStatus}
      showGroupLabels={showGroupLabels}
      showOrdinals={showOrdinals}
      showDescription={showDescription}
      showEstimates={showEstimates}
      hierarchical={hierarchical}
      debug={debug}
      // The handle lives in the ordinal's gutter, so a movable list reserves the track even when it
      // shows no numbers.
      showGutter={showOrdinals || !!onTaskMove}
      isCollapsed={isCollapsed}
      selected={selected}
      dragging={dragging}
      getTaskActions={getTaskActions}
      onDraggingChange={setDraggingTask}
      onCollapseToggle={onCollapseToggle}
      onTaskCreate={onTaskCreate}
      onTaskUpdate={onTaskUpdate}
      onTaskSelect={selectable ? handleSelect : undefined}
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

/**
 * The rows and the create row are separate grids (the create row sits outside the scrolling
 * viewport), so their leading gutters — ordinal, then status — are declared once here: only
 * matching templates keep the `+` under the status control and the input under the titles.
 * Tailwind scans for whole class names, hence four literals rather than a composed prefix. The
 * status gutter is `1.5rem` because that is the width of the `density='sm'` icon button it holds;
 * a narrower track makes the button overflow it and align left instead of centring.
 */
/** Ordinals stop at 99: the gutter is sized for two digits. */
const MAX_ORDINAL = 99;

/**
 * The edit pane's columns, matching the rows' leading gutters. The row's disclosure toggle is
 * cleared with padding rather than a spare column: a column of its own picks up the grid's
 * `gap-x-1`, which put every pane cell 4px right of the row cell it is meant to sit under.
 */
const GRID_COLS = {
  content: 'grid-cols-[1.5rem_1fr_min-content_2rem]',
  contentWithOrdinals: 'grid-cols-[2rem_1.5rem_1fr_min-content_2rem]',
};

/** The disclosure toggle's own width (`w-6`), which the pane reserves but does not fill. */
const TOGGLE_GUTTER = 'ps-6';

type TaskListContentProps = ComposableProps;

const TaskListContent = composable<HTMLUListElement>((props, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const {
    tasks,
    groupByStatus,
    hierarchical,
    selected,
    dragging,
    debug,
    showGroupLabels,
    showOrdinals,
    showDescription,
    showGutter,
    isCollapsed,
    onCollapseToggle,
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
    <TaskTreeContent
      debug={debug}
      hierarchical={hierarchical}
      groupByStatus={grouping}
      tasks={tasks}
      collapsed={collapsed}
      showGutter={showGutter}
      ordinals={showOrdinals ? ordinals : EMPTY_ORDINALS}
      selected={selected}
      showDescription={showDescription}
      renderTrailing={TaskTreeTrailing}
      translationKey={translationKey}
      onCollapseToggle={onCollapseToggle}
      onTaskSelect={onTaskSelect}
      onTaskUpdate={onTaskUpdate}
      onTaskMove={onTaskMove}
    />
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
      className={mx('col-span-full min-h-(--dx-control) flex items-center text-sm text-description', className)}
      ref={forwardedRef}
    >
      <span>{children}</span>
    </div>
  );
});

TaskListGroupLabel.displayName = 'TaskList.GroupLabel';

/**
 * Estimate as its own label rather than a glyph: the sizes are a vocabulary a reader already knows
 * (`XS`…`XL`), and two ordinal ramps side by side would be read as one. Rendered on every row so
 * setting an estimate never depends on discovering a hover affordance, and reading as `–` when
 * unset — a dash says "no size yet" where a blank cell says nothing at all.
 */
const TaskEstimateControl = ({ task }: { task: Task.Task }) => {
  const { t } = useTranslation(translationKey);
  const { onTaskUpdate } = useTaskListContext('TaskList.EstimateControl');
  const estimate = task.estimate;
  const label = estimate ? estimate.toUpperCase() : '–';

  if (!onTaskUpdate) {
    return <IconBlock classNames={estimateTextStyle(estimate)}>{label}</IconBlock>;
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconBlock>
          <Button
            variant='ghost'
            density='sm'
            data-testid='taskList.item.estimate'
            classNames={mx('w-6 px-0 text-xs tabular-nums', estimateTextStyle(estimate))}
            // The row is the selection target; opening the menu must not also select it.
            onClick={(event: MouseEvent) => event.stopPropagation()}
          >
            {label}
          </Button>
        </IconBlock>
      </Menu.Trigger>
      {/* Sourced from the schema's own option table, so the picker offers exactly what the field
          accepts and carries the same hue the form's select paints it with. Clearing is offered
          first; the table has no `none` row because the field is simply absent when unset. */}
      <Menu.Content
        items={Task.EstimateOptions.map(({ id, title }) =>
          createMenuAction(
            `estimate-${id}`,
            // `none` is not an `Estimate`: an unset estimate is the absent property.
            () => onTaskUpdate(task, { estimate: id === 'none' ? null : id }),
            {
              label: title,
              classNames: estimateTextStyle(id),
              checked: (estimate ?? 'none') === id,
            },
          ),
        )}
      />
    </Menu.Root>
  );
};

TaskEstimateControl.displayName = 'TaskList.EstimateControl';

/**
 * Priority as a signal-strength glyph rather than a word: the four levels are ordinal, so a ramp
 * reads at a glance where four differently-worded tags do not. `urgent` breaks the ramp deliberately
 * — it is a different kind of statement from "how much", and a filled mark carries that.
 *
 * The glyph is also the control: it opens a menu to set the level. It renders on every row —
 * including one with no priority, which shows a dot — so setting a priority never depends on
 * discovering a hover affordance.
 */
const TaskPriorityIcon = ({ task }: { task: Task.Task }) => {
  const { t } = useTranslation(translationKey);
  const { onTaskUpdate } = useTaskListContext('TaskList.PriorityIcon');
  const priority = task.priority ?? 'none';
  const icon = priorityIcon(priority);
  const tint = priorityTextStyle(priority);

  if (!onTaskUpdate) {
    // Falls back to the dot rather than rendering nothing: a readonly row still says "no priority"
    // in the same column its neighbours use, so the list reads as one column and not a ragged one.
    return (
      <IconBlock square>
        <Icon icon={icon} classNames={mx('shrink-0', tint)} />
      </IconBlock>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconBlock>
          <IconButton
            variant='ghost'
            icon={icon}
            iconOnly
            label={t('task-priority.label')}
            data-testid='taskList.item.priority'
            // The hue goes on the icon, not the button: the row dims icons through `--icons-color`,
            // which the `Icon` root reads, so a colour set on the button is overridden at rest.
            iconClassNames={tint}
            // The row is the selection target; opening the menu must not also select it.
            onClick={(event) => event.stopPropagation()}
          />
        </IconBlock>
      </Menu.Trigger>
      {/* Sourced from the schema's own option table, so the picker offers exactly what the field
          accepts and carries the same hue the form's select paints it with. */}
      <Menu.Content
        items={Task.PriorityOptions.map(({ id, icon: optionIcon }) =>
          createMenuAction(`priority-${id}`, () => onTaskUpdate(task, { priority: id }), {
            label: t(`priority-${id}.label`),
            icon: optionIcon,
            iconClassNames: priorityTextStyle(id),
            checked: priority === id,
          }),
        )}
      />
    </Menu.Root>
  );
};

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
      {/* Variable-width chips share one cell — an artifact tag has no fixed size, so it cannot own a
          column. Everything after it does, which is what makes those controls line up down the
          list rather than sitting wherever the tags happened to end. */}
      <div className='flex h-8 items-center justify-end gap-1'>
        <TaskListItemArtifacts task={task} />
        {current.assignee && <TaskListAssignee assignee={current.assignee} />}
      </div>
      <div className='flex h-8 items-center justify-center'>{showEstimates && <TaskEstimateControl task={task} />}</div>
      <div className='flex h-8 items-center justify-center'>
        <TaskPriorityIcon task={task} />
      </div>
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
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconBlock>
          <IconButton
            variant='ghost'
            iconOnly
            icon='ph--dots-three-vertical--regular'
            label={t('task-actions.label')}
            data-testid='taskList.item.actions'
            classNames={ROW_ACTION_CLASSNAMES}
            onClick={(event) => event.stopPropagation()}
          />
        </IconBlock>
      </Menu.Trigger>
      <Menu.Content items={actions} />
    </Menu.Root>
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
 * One artifact, as a tag that opens the object's preview card — the row names what the task
 * produced, and the reader wants to see it without leaving the list.
 *
 * Click, not hover or focus: the tag sits inside a listbox option, where a tab stop of its own would
 * split the row into several arrow-key stops, and a hover card would fire while the pointer crosses
 * the row on its way somewhere else.
 */
const ArtifactTag = ({ artifact }: { artifact: Obj.Unknown }) => {
  const tagRef = useRef<HTMLSpanElement>(null);
  const label = Obj.getLabel(artifact) ?? Obj.getTypename(artifact) ?? '';
  const handleClick = useCallback(
    (event: MouseEvent<HTMLSpanElement>) => {
      // The row is an option: without this the click selects the task as well as opening the card.
      event.stopPropagation();
      const trigger = tagRef.current;
      trigger?.dispatchEvent(new DxAnchorActivate({ trigger, dxn: Obj.getURI(artifact), label, kind: 'card' }));
    },
    [artifact, label],
  );

  return (
    <Tag ref={tagRef} hue='amber' role='button' classNames='cursor-pointer' onClick={handleClick}>
      {label}
    </Tag>
  );
};

ArtifactTag.displayName = 'TaskList.ArtifactTag';

//
// Create — the add row; renders nothing unless the root supplies `onTaskCreate`.
//

type TaskListEditProps = ComposableProps<{
  /** Placeholder for the title field when nothing is selected (the create case). */
  placeholder?: string;
  /**
   * Edit a description under the title — the selected task's, or the new task's when creating, so a
   * task can be added with one. Off by default, matching `Root`'s `showDescription`: a markdown
   * field is several rows tall wherever it appears, which a single-line strip has no room for.
   */
  showDescription?: boolean;
  /** Placeholder for the description field. */
  descriptionPlaceholder?: string;
  /**
   * Lay the pane out on the list's own column template, so the title field starts where the rows'
   * titles do and the icon sits under their status controls. Off by default: a pane used away from
   * a list (a dialog, a story) has no columns to line up with.
   */
  grid?: boolean;
}>;

/**
 * The detail half of the list: it edits whichever task is selected, and creates one when none is.
 *
 * Editing lives here rather than in the row because a row is 32px of shared subgrid — a field
 * opening inside it moves everything around it. A pane below the list has room to be a field.
 */
const TaskListEdit = composable<HTMLDivElement, TaskListEditProps>(
  (
    { placeholder = 'Add task', showDescription = false, descriptionPlaceholder = 'Add a description', grid, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const { tasks, selected, onTaskCreate, onTaskUpdate, onTaskSelect, showGutter } =
      useTaskListContext('TaskList.Edit');
    const { className, ...rest } = composableProps(props);

    const task = useMemo(() => tasks.find(({ id }) => id === selected), [tasks, selected]);
    // Subscribe to the selected task so the pane follows a rename made anywhere else.
    const [snapshot] = useObject(task);
    const current = snapshot ?? task;

    const descriptionRef = useRef<MarkdownEditableController>(null);

    // The create row's description, mirrored out of the field. A ref rather than state because the
    // create reads it in the same tick it commits the field, and `useEditable` calls back
    // synchronously — a `setState` would still hold the previous render's text.
    const draftDescription = useRef('');
    // Bumped after a create, to rebuild the held-open editor empty. The field is uncontrolled while
    // creating (there is no task to read from), so clearing it means remounting it.
    const [createEpoch, setCreateEpoch] = useState(0);

    const [draft, setDraft] = useState('');
    // The pane is a view onto whichever task is selected, so switching tasks replaces the text it
    // holds rather than carrying the previous one's across. The description ref is cleared here too:
    // the field remounts empty on the way back to creating, but `commit()` on an already-empty field
    // never calls back — so text abandoned before a selection would otherwise ride along, unseen,
    // into the next task created.
    //
    // State rather than a ref for the previous id (React's adjust-state-on-prop-change pattern): a
    // render React abandons leaves a ref already mutated, so the retry would skip the reset and the
    // pane would keep the previous task's text.
    const [editingId, setEditingId] = useState<string | undefined>(undefined);
    if (editingId !== current?.id) {
      setEditingId(current?.id);
      setDraft(current?.title ?? '');
      draftDescription.current = '';
    }

    const commitTitle = useCallback(() => {
      const title = draft.trim();
      if (task && current) {
        if (title.length > 0 && title !== current.title) {
          onTaskUpdate?.(task, { title });
        }
      } else if (title.length > 0) {
        // Nothing has committed the description yet — it is held open and the reader is in the
        // title — so commit it here, before assembling the draft it belongs to.
        descriptionRef.current?.commit();
        const description = draftDescription.current.trim();
        onTaskCreate?.({ title, ...(description.length > 0 && { description }) });
        setDraft('');
        draftDescription.current = '';
        setCreateEpoch((epoch) => epoch + 1);
      }
    }, [draft, task, current, onTaskCreate, onTaskUpdate]);

    // Blur commits a rename but never a create: leaving the field is not a decision to add a task,
    // and half a title would become one — clicking the list, the thread, or anywhere else would
    // leave a stray behind. Creating takes Enter or Save, which are the deliberate acts.
    const handleTitleBlur = useCallback(() => {
      if (task && current) {
        commitTitle();
      }
    }, [task, current, commitTitle]);

    const handleTitleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          commitTitle();
        }
      },
      [commitTitle],
    );

    // Writes both fields and leaves, as cancelling does — the pane drops back to creating either
    // way, and only what it did with the pending text differs. Creating commits the description
    // itself (it is part of the draft), so this only has to for an edit.
    const handleSave = useCallback(() => {
      commitTitle();
      if (task && current) {
        descriptionRef.current?.commit();
      }
      onTaskSelect?.(undefined);
    }, [commitTitle, task, current, onTaskSelect]);

    // Throws away the pending edit and leaves: the pane drops back to creating, which is the same
    // exit Escape on a row gives. Reverting first, since deselecting unmounts the fields. An
    // abandoned create is cleared rather than reverted — a blur may already have committed text into
    // the field, and reverting would restore exactly that.
    const handleCancel = useCallback(() => {
      if (task && current) {
        descriptionRef.current?.revert();
      } else {
        draftDescription.current = '';
        setCreateEpoch((epoch) => epoch + 1);
      }
      setDraft('');
      onTaskSelect?.(undefined);
    }, [task, current, onTaskSelect]);

    // Nothing to create with and nothing to edit: the pane has no purpose.
    if (!onTaskCreate && !(current && onTaskUpdate)) {
      return null;
    }

    // On the list's template the pane has the rows' columns: the ordinal gutter it leaves empty, the
    // status column takes the icon, and the title column takes the field — which is what puts the
    // caret where the rows' titles start. Off it, the pane keeps a template of its own.
    const titleColumn = grid && showGutter ? 'col-start-3' : 'col-start-2';

    return (
      // One grid, not a row of grids: the title and the description line up column for column, and
      // the toolbar can sit on the title line while coming LAST in the DOM — so Tab runs title →
      // description → buttons rather than stopping at a button on the way to the text.
      <div
        {...rest}
        data-testid='taskList.edit'
        className={mx(
          'grid gap-x-1 w-full min-w-0 shrink-0',
          grid
            ? [showGutter ? GRID_COLS.contentWithOrdinals : GRID_COLS.content, TOGGLE_GUTTER]
            : 'grid-cols-[1.5rem_1fr_min-content]',
          className,
        )}
      >
        <span
          className={mx(
            'flex items-center justify-center h-8',
            // Placed explicitly: with ordinals the pane leaves column 1 empty, and implicit
            // placement would drop the icon into that gutter.
            grid && (showGutter ? 'col-start-2' : 'col-start-1'),
          )}
        >
          <Icon icon={current ? 'ph--pencil-simple--regular' : 'ph--plus--regular'} classNames='text-subdued' />
        </span>
        <Input.Root>
          <Input.TextInput
            variant='subdued'
            classNames={mx('px-0', grid && [titleColumn, 'col-end-[-2]'])}
            data-testid='taskList.edit.title'
            placeholder={current ? t('task-title.placeholder') : placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={handleTitleBlur}
          />
        </Input.Root>
        {showDescription && (current ? onTaskUpdate : onTaskCreate) && (
          <span
            data-testid='taskList.edit.description'
            // Placed explicitly, never by flow: the toolbar is absent until something is typed, so a
            // description left to auto-place would take the cell it vacates and fall into the icon
            // column — a field one word wide.
            className={mx('flex min-w-0 -col-end-2', grid ? titleColumn : 'col-start-2')}
          >
            {/* A description is markdown, so it is edited as markdown. `editing` is held open —
                the pane IS the editor, so there is nothing to click into — and the key remounts
                it per task, since a field held open never re-reads its subject.

                Creating, the field is uncontrolled: there is no task to read a value from, so it
                holds the draft itself until the create collects it. */}
            <MarkdownEditable
              key={current?.id ?? `create-${createEpoch}`}
              ref={descriptionRef}
              classNames='text-sm'
              {...(current && { value: current.description ?? '' })}
              editing
              multiline
              onValueChange={(description) => {
                if (task && current) {
                  onTaskUpdate?.(task, { description });
                } else {
                  draftDescription.current = description;
                }
              }}
              placeholder={descriptionPlaceholder}
              // Held open, so it must not pull focus: selecting a row by keyboard would otherwise
              // land the reader in the description instead of the list.
              autoFocus={false}
            />
          </span>
        )}
        {/* The description is held open with no blur to commit it, so the pane needs to say
            explicitly what happens to the pending text. Both buttons keep focus where it is
            (`preventDefault` on mousedown): the fields commit on blur, so a button that took focus
            would commit before its own handler ran — and Cancel could never mean anything.
            Placed on the title line explicitly; its place in the DOM is what orders Tab.

            Hidden while the add row is untouched: with nothing typed there is nothing to save and
            nothing to cancel, and two dead controls on an empty row read as a form to fill in
            rather than a place to type. */}
        {(current || draft.trim().length > 0) && (
          <Toolbar.Root density='sm' classNames='row-start-1 col-start-[-2] p-0 bg-transparent'>
            {/* Only when editing an existing task: the create row has nothing to set a priority on
                until it is saved. */}
            {task && <TaskPriorityIcon task={task} />}
            <Toolbar.IconButton
              variant='ghost'
              iconOnly
              icon='ph--check--regular'
              data-testid='taskList.edit.save'
              label={t('save-task.label')}
              onClick={handleSave}
              onMouseDown={(event) => event.preventDefault()}
            />
            <Toolbar.IconButton
              variant='ghost'
              iconOnly
              icon='ph--x--regular'
              data-testid='taskList.edit.cancel'
              label={t('cancel-edit.label')}
              onClick={handleCancel}
              onMouseDown={(event) => event.preventDefault()}
            />
          </Toolbar.Root>
        )}
      </div>
    );
  },
);

TaskListEdit.displayName = 'TaskList.Edit';

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

//
// TaskList
//

export const TaskList = {
  Root: TaskListRoot,
  Viewport: TaskListViewport,
  Content: TaskListContent,
  GroupLabel: TaskListGroupLabel,
  Edit: TaskListEdit,
  Assignee: TaskListAssignee,
};

export type {
  TaskListAssigneeProps,
  TaskListContentProps,
  TaskListEditProps,
  TaskListGroupLabelProps,
  TaskListRootProps,
  TaskListViewportProps,
};
