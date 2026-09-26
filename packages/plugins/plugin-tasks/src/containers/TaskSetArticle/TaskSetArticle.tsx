//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { useCapabilities, useOperation, useOperationHandler, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface, useDetailNavigation } from '@dxos/app-toolkit/ui';
import { type Database, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { QueryBuilder, parseEnumTerms, writeEnumTerms } from '@dxos/echo-query';
import { useQuery } from '@dxos/echo-react';
import { messageOf } from '@dxos/errors';
import { log } from '@dxos/log';
import { Panel, Switch, Toolbar, useTranslation } from '@dxos/react-ui';
import {
  useArticleKeyboardNavigation,
  useAttention,
  useManagerOptional,
  useSelection,
  useSelectionActions,
  useViewState,
  useViewStateActions,
} from '@dxos/react-ui-attention';
import { type EditorController } from '@dxos/react-ui-editor';
import { createMenuAction } from '@dxos/react-ui-menu';
import {
  type TaskCreateHandler,
  type TaskGroup,
  TaskList,
  type TaskPlacement,
  type TaskSelectModifiers,
} from '@dxos/react-ui-task';
import { Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation, TasksCapabilities, TaskSetView } from '#types';

import { useDescriptionComponents, useMarkdownExtensions, useTaskActions } from '../../hooks/index.ts';
import { ALL_STATUSES, STATUS_TERMS, filterTasks, foldStatuses, groupTasks, sortTasks } from '../../util/index.ts';
import { useAttachFile } from '../TaskArticle/TaskAttachments.tsx';
import { TaskFilter } from './TaskFilter.tsx';
import { TaskGroupMenu, TaskSortMenu } from './TaskViewOptions.tsx';

export type TaskSetArticleProps = AppSurface.ObjectArticleProps<TaskSet.TaskSet> & {
  /**
   * Where a row opens its task. `'plank'` (the default) opens it beside the list, reusing the host's
   * `task` deck level; `'companion'` opens the host's `~task` companion instead, which keeps the
   * host itself in front of the reader. A host offers `'companion'` only where it contributes one.
   */
  detail?: 'plank' | 'companion';
};

/**
 * Every task in a set, rendered as the tree its `tasks` and each task's `subtasks` describe, and
 * restructurable by dragging a row or with `Alt`+arrow while it shows the set's own order. The
 * toolbar can reorder it and group it (by milestone among others). CRUD flows through the
 * {@link TaskOperation} verbs so the article and external agents share one write path: the verbs are
 * what keep the lists and parent edges consistent.
 */
export const TaskSetArticle = ({ role, attendableId, subject: taskSet, detail = 'plank' }: TaskSetArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const filterEditorRef = useRef<EditorController>(null);
  const spaceId = Obj.getDatabase(taskSet)?.spaceId;
  const db = Obj.getDatabase(taskSet);
  const allTasks = useTasks(taskSet);
  // The toolbar's filter, as the mailbox composes its own: the query editor's text is what the
  // reader edits, its parse is what the list is narrowed by. The status menu is a second view over
  // the same text — its choice lives in the text's `status:` terms — so there is one value, persisted
  // per device and per set (see {@link TaskSetView.aspect}).
  const [filterText, setFilterText] = useFilterQuery(taskSet.id, filterEditorRef);
  const { values: statuses, rest } = useMemo(() => parseEnumTerms(filterText, STATUS_TERMS), [filterText]);
  const tags = useTagMap(db);
  // Parsed here rather than taken from the editor's own callback: the parse then re-runs when the
  // tag registry changes (a `#tag` typed before its tag loaded resolves on arrival), and a query
  // that does not parse is a query that matches nothing rather than one that matches everything.
  const filter = useMemo(() => {
    const text = rest.trim();
    if (text.length === 0) {
      return undefined;
    }
    return new QueryBuilder(tags).build(text).filter ?? Filter.nothing();
  }, [rest, tags]);
  // Order and grouping persist beside the query, per device and per set, for the same reason.
  const { sort = TaskSetView.DEFAULT_SORT, group = 'none' } = useViewState(TaskSetView.aspect, taskSet.id);
  const { update: updateView } = useViewStateActions(TaskSetView.aspect, taskSet.id);
  const handleSortChange = useCallback(
    (sort: TaskSetView.Sort) => updateView((view) => ({ ...view, sort })),
    [updateView],
  );
  const handleGroupChange = useCallback(
    (group: TaskSetView.GroupField) => updateView((view) => ({ ...view, group })),
    [updateView],
  );
  const { tasks, groups } = useArrangedTasks(taskSet, allTasks, {
    filter,
    statuses,
    sort,
    group,
    ns: meta.profile.key,
  });
  // Dragging writes the set's own order, so it is offered only while that is the order shown: under a
  // sort the row would not land where it was dropped, and a group header is not a parent.
  const arranged = sort.field !== 'manual' || !!groups;
  // Row order as rendered, so the article's arrow keys walk the rows the reader sees.
  const rows = useMemo(() => (groups ? groups.flatMap((group) => group.tasks) : tasks), [groups, tasks]);
  const handleStatusesChange = useCallback(
    // Rewrites the stored query rather than this render's copy, which can trail fast typing.
    (next: readonly Task.Status[]) => setFilterText((query) => writeEnumTerms(query, STATUS_TERMS, next)),
    [setFilterText],
  );
  const handleClearFilter = useCallback(() => setFilterText(''), [setFilterText]);
  const { checked, onTaskCheck } = useCheckedTasks(taskSet);

  const { invokePromise } = useOperationInvoker();
  // Files dropped on the create pane attach once the task exists: the create answers with the new
  // task's id, and the live object is in the working set by then, since this client wrote it.
  const attachFile = useAttachFile();
  // Reports a failed create, so the pane keeps the draft, and the files left unattached, which the
  // pane keeps rather than dropping.
  const handleCreate = useCallback<TaskCreateHandler>(
    async (props, files = []) => {
      const { data, error } = await invokePromise(
        TaskOperation.CreateTask,
        { taskSet: Ref.make(taskSet), ...props },
        { spaceId },
      );
      if (error || !data) {
        return { error: error ?? new Error('Task was not created.') };
      }
      if (files.length === 0) {
        return;
      }
      const [task] = db?.query(Filter.and(Filter.type(Task.Task), Filter.id(data.task.id))).runSync() ?? [];
      if (!task || !attachFile) {
        return { rejectedFiles: files };
      }
      const rejectedFiles: globalThis.File[] = [];
      for (const file of files) {
        if (!(await attachFile(task, file))) {
          rejectedFiles.push(file);
        }
      }
      return { rejectedFiles };
    },
    [invokePromise, taskSet, spaceId, attachFile, db],
  );

  const handleUpdate = useOperation(
    TaskOperation.UpdateTask,
    (task: Task.Task, props: Task.Edit) => ({ task: Ref.make(task), ...props }),
    { spaceId },
  );

  const handleDelete = useOperation(TaskOperation.DeleteTask, (task: Task.Task) => ({ task: Ref.make(task) }), {
    spaceId,
  });

  // A row opens its task through the shared reading gesture: the companion beside the list where the
  // host contributes one and the viewport has room, a levelled plank otherwise. `attendableId` is
  // the host's node — the project's inside its Tasks tab.
  const currentId = useSelection(attendableId, 'single');
  const openDetail = useDetailNavigation({
    contextId: attendableId,
    getPath: (id) => `${attendableId}/${id}`,
    level: 'task',
    companion: detail === 'companion' ? 'task' : undefined,
  });
  const handleOpen = useCallback(
    (task: Task.Task | undefined, { meta }: TaskSelectModifiers = {}) => openDetail(task?.id, { modified: meta }),
    [openDetail],
  );

  // Held here rather than left to the list, so adding a sub-task can open the branch it lands in, and
  // persisted per device and per set so a collapsed branch stays collapsed across navigation.
  const { collapsed, setCollapsed } = useTaskSetExpanded(taskSet.id);

  // Created untitled and opened at once, so the reader names it in the detail, whose title field
  // takes focus for an untitled task: the list's own create pane has no notion of a parent, and a
  // sub-task created there would land at the root.
  const handleAddSubTask = useCallback(
    async (parent: Task.Task) => {
      if (collapsed.has(parent.id)) {
        const next = new Set(collapsed);
        next.delete(parent.id);
        setCollapsed(next);
      }
      const { data } = await invokePromise(
        TaskOperation.CreateTask,
        { taskSet: Ref.make(taskSet), title: '', parentTask: Ref.make(parent) },
        { spaceId },
      );
      if (data) {
        openDetail(data.task.id);
      }
    },
    [collapsed, setCollapsed, invokePromise, taskSet, spaceId, openDetail],
  );

  // Delete is one item among the contributed ones, so a row has a single trailing affordance
  // whatever any plugin adds to it.
  const contributed = useTaskActions();
  const getTaskActions = useCallback(
    (task: Task.Task) => [
      createMenuAction(`add-sub-task-${task.id}`, () => handleAddSubTask(task), {
        label: t('add-sub-task.label'),
        icon: 'ph--plus--regular',
        testId: 'tasks.task.addSubTask',
      }),
      ...contributed(task),
      createMenuAction(`delete-${task.id}`, () => handleDelete(task), {
        label: t('delete-task.label'),
        icon: 'ph--x--regular',
        testId: 'tasks.task.delete',
      }),
    ],
    [contributed, handleAddSubTask, handleDelete, t],
  );

  // Run synchronously on the drop frame: `MoveTask` peeks its refs and only suspends when one is
  // unloaded, so with the rows already in hand the write commits in the same tick the gesture ends.
  // Going through the invoker instead re-rendered from the model before the write landed and again
  // after it, which is the jump.
  const move = useOperationHandler(
    TaskOperation.MoveTask,
    (task: Task.Task, { parentTask, before }: TaskPlacement) => ({
      task: Ref.make(task),
      taskSet: Ref.make(taskSet),
      parentTask: parentTask ? Ref.make(parentTask) : null,
      ...(before ? { before: Ref.make(before) } : {}),
    }),
  );
  const handleMove = useCallback(
    (task: Task.Task, placement: TaskPlacement) => {
      // A rejected drop (e.g. a parent outside this set) must not throw out of the gesture handler:
      // nothing was written, so the list stays put and the reason is shown instead.
      const exit = Effect.runSyncExit(move(task, placement));
      if (Exit.isFailure(exit)) {
        const error = Cause.squash(exit.cause);
        log.warn('task move rejected', { task: task.id, error });
        void invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/move-task-error`,
          icon: 'ph--warning--regular',
          duration: 5_000,
          title: ['move-task-error.title', { ns: meta.profile.key }],
          description: messageOf(error) ?? String(error),
          closeLabel: ['close.label', { ns: meta.profile.key }],
        });
      }
    },
    [move, invokePromise],
  );

  useArticleKeyboardNavigation({ articleId: attendableId, items: rows, currentId, onSelect: openDetail });

  const descriptionExtensions = useMarkdownExtensions(taskSet);
  const descriptionComponents = useDescriptionComponents();

  const filterRow = (
    <TaskFilter
      db={db}
      tags={tags}
      value={filterText}
      statuses={statuses ?? ALL_STATUSES}
      onChange={setFilterText}
      onStatusesChange={handleStatusesChange}
      onClear={handleClearFilter}
      editorRef={filterEditorRef}
    >
      <TaskSortMenu value={sort} onChange={handleSortChange} />
      <TaskGroupMenu value={group} onChange={handleGroupChange} />
    </TaskFilter>
  );

  const content = (
    <TaskList.Root
      tasks={tasks}
      groups={groups}
      hierarchical
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      selectable
      showDescription
      descriptionComponents={descriptionComponents}
      showEstimates
      checked={checked}
      getTaskActions={getTaskActions}
      onTaskCheck={onTaskCheck}
      selected={currentId}
      onTaskCreate={handleCreate}
      onTaskUpdate={handleUpdate}
      onTaskMove={arranged ? undefined : handleMove}
      onTaskSelect={handleOpen}
    >
      <TaskList.Viewport>
        <TaskList.Content />
      </TaskList.Viewport>
      {/* Create-only: the detail is the task the row opens, so the pane stays the add row rather
          than turning into an editor the moment a row is selected. Full width, edge to edge — it is
          the foot of the list, not a card floating in a gutter, so it lines up with the rows. */}
      <div className='px-trim-md'>
        <TaskList.Editor
          createOnly
          showDescription
          // Only where a plugin can store the file, as the task's own article decides.
          acceptFiles={!!attachFile}
          descriptionExtensions={descriptionExtensions}
          // Bordered on three sides, open at the foot: the pane meets the panel's own edge there,
          // and a fourth line would double it. `mx-trim-md` reproduces the old wrapper div's outer
          // inset as a margin — `px-trim-md` would instead be merged (tailwind-merge) with the
          // existing `p-2`'s horizontal component and silently dropped.
          classNames='bg-input-surface border-x border-t border-separator rounded-t-md p-2'
          placeholder={t('task-create.placeholder')}
        />
      </div>
    </TaskList.Root>
  );

  return (
    <Switch.Root
      on={role}
      fallback={
        <Panel.Root role={role}>
          <Panel.Toolbar asChild>
            <Toolbar.Root disabled={!hasAttention}>{filterRow}</Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content>{content}</Panel.Content>
        </Panel.Root>
      }
    >
      {/* Embedded as a section (e.g., the ProjectArticle Tasks section): the host owns scroll and
          chrome, so render the bare list under its own filter row — a nested Panel/scroll root would
          collapse width, but the filter has to come along or the host's copy of the list has none. */}
      <Switch.Match when={AppSurface.Section.role}>
        <div className='flex flex-col dx-grow'>
          <Toolbar.Root>{filterRow}</Toolbar.Root>
          {content}
        </div>
      </Switch.Match>
    </Switch.Root>
  );
};

TaskSetArticle.displayName = 'TaskSetArticle';

/**
 * Which branches are open, held in {@link TaskSetView.aspect} as task id → open. The list speaks in
 * collapsed ids, so a change is written as the ids that entered (closed) or left (opened) the set,
 * and every other entry is kept as it was.
 */
const useTaskSetExpanded = (contextId: string) => {
  const { expanded } = useViewState(TaskSetView.aspect, contextId);
  const { update } = useViewStateActions(TaskSetView.aspect, contextId);
  const collapsed = useMemo<ReadonlySet<string>>(
    () =>
      new Set(
        Object.entries(expanded ?? {})
          .filter(([, open]) => !open)
          .map(([id]) => id),
      ),
    [expanded],
  );
  const setCollapsed = useCallback(
    (next: ReadonlySet<string>) =>
      update((view) => {
        const map = { ...view.expanded };
        for (const id of next) {
          map[id] = false;
        }
        // Read from the stored map rather than the render's set, so two changes before a render compose.
        for (const [id, open] of Object.entries(view.expanded ?? {})) {
          if (!open && !next.has(id)) {
            map[id] = true;
          }
        }
        return { ...view, expanded: map };
      }),
    [update],
  );

  return { collapsed, setCollapsed };
};

/**
 * The set's filter query, held in {@link TaskSetView.aspect} and mirrored into the query editor.
 *
 * The editor takes its text once, as `initialValue`, so a write that did not come from typing — the
 * status menu, clear, another view of the same set, another tab — is pushed into it here. Pushed from
 * the subscription rather than from a render effect: the subscription fires as the value is written,
 * when the editor already holds whatever was just typed, whereas an effect can run for a render that
 * trails fast typing and rewrite the document back to older text.
 */
const useFilterQuery = (
  contextId: string,
  editorRef: RefObject<EditorController | null>,
): [string, (query: string | ((query: string) => string)) => void] => {
  const manager = useManagerOptional();
  const { query } = useViewState(TaskSetView.aspect, contextId);
  const { update } = useViewStateActions(TaskSetView.aspect, contextId);
  useEffect(
    () =>
      manager?.subscribe(TaskSetView.aspect, contextId, ({ query }) => {
        const editor = editorRef.current;
        if (editor && editor.getText() !== query) {
          editor.setText(query);
        }
      }),
    [manager, contextId, editorRef],
  );

  // A status choice stored as its own field, before the query carried it, is written into the query
  // once and the field dropped, so upgrading keeps what the reader had hidden.
  useEffect(() => {
    update(({ statuses, ...view }) =>
      statuses === undefined ? view : { ...view, query: foldStatuses(view.query, statuses) },
    );
  }, [update]);

  // Unchanged text keeps the same value, so the editor echoing a pushed text back is not a write.
  const setQuery = useCallback(
    (next: string | ((query: string) => string)) =>
      update((view) => {
        const query = typeof next === 'function' ? next(view.query) : next;
        return view.query === query ? view : { ...view, query };
      }),
    [update],
  );
  return [query, setQuery];
};

/**
 * The checked rows, as the multi-selection `react-ui-attention` holds for this set.
 *
 * Keyed by the task set's object id, not by the attendable: two task lists on one deck would
 * otherwise share a selection. The set lives in view state rather than in the article because the
 * host's toolbar reads it too — neither the rows nor the toolbar owns it.
 *
 * Offered only when a plugin contributes a {@link TasksCapabilities.TaskAction}: the checkbox marks
 * which rows an action will act on, so with nothing to act on it is an affordance that does nothing.
 */
const useCheckedTasks = (taskSet: TaskSet.TaskSet) => {
  const actions = useCapabilities(TasksCapabilities.TaskAction);
  const ids = useSelection(taskSet.id, 'multi');
  const { toggle } = useSelectionActions(taskSet.id);
  const checked = useMemo(() => new Set(ids), [ids]);
  const handleTaskCheck = useCallback((task: Task.Task) => toggle(task.id), [toggle]);

  return actions.length > 0
    ? { checked, onTaskCheck: handleTaskCheck }
    : { checked: undefined, onTaskCheck: undefined };
};

/**
 * The set's whole tree via transitive `childOf` — every task's ECHO parent is its holder, the set or a
 * parent task — in tree pre-order: roots in `tasks` order, each followed by its `subtasks`. The query
 * re-emits on membership changes only, never on a member's edit — `TaskList` rows subscribe themselves.
 */
const useTasks = (taskSet: TaskSet.TaskSet): readonly Task.Task[] => {
  const atom = useMemo(() => {
    const query = Obj.getDatabase(taskSet)?.query(Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)));
    return Atom.make((get): readonly Task.Task[] => {
      const tasks: readonly Task.Task[] = query ? get(query.atom) : [];
      // Subscribes each list that orders the tree; a move always rewrites one of them.
      tasks.forEach((task) => get(Obj.atomProperty(task, 'subtasks')));
      return Task.orderTree(tasks, get(Obj.atomProperty(taskSet, 'tasks')) ?? []);
    });
  }, [taskSet]);

  return useAtomValue(atom);
};

type ArrangeOptions = {
  filter: Filter.Any | undefined;
  statuses: readonly Task.Status[] | undefined;
  sort: TaskSetView.Sort;
  group: TaskSetView.GroupField;
  /** Namespace of the group labels for tasks with no value. */
  ns: string;
};

/**
 * The tasks the toolbar keeps (see `filterTasks`), in the order it asks for, and partitioned into
 * its groups. Read through atoms so an edit re-runs all three: a title edited in a row can change
 * whether it matches, and a priority changed in a row moves it under a priority sort or grouping.
 */
const useArrangedTasks = (
  taskSet: TaskSet.TaskSet,
  tasks: readonly Task.Task[],
  { filter, statuses, sort, group, ns }: ArrangeOptions,
): { tasks: readonly Task.Task[]; groups?: TaskGroup[] } => {
  // A set, so the match is a lookup per task rather than a scan of the status list, and one the
  // atom below can depend on by identity.
  const statusSet = useMemo(() => statuses && new Set(statuses), [statuses]);
  const atom = useMemo(
    () =>
      Atom.make((get): { tasks: readonly Task.Task[]; groups?: TaskGroup[] } => {
        // Subscribed per task, so an edit that changes whether a row matches re-runs the filter
        // without a whole-list subscription.
        // The whole object, not the fields the text search reads: a filter can name any property
        // (`status:`, `priority:`) or the task's tags, and a property-level subscription would miss
        // every term but the ones listed here.
        tasks.forEach((task) => get(Obj.atom(task)));
        const sorted = sortTasks(filterTasks(tasks, { filter, statuses: statusSet }), sort);
        if (group === 'none') {
          return { tasks: sorted };
        }
        // The set's milestone sequence orders the milestone groups.
        get(Obj.atomProperty(taskSet, 'milestones'));
        const milestones = group === 'milestone' ? TaskSet.resolveMilestones(taskSet) : [];
        return { tasks: sorted, groups: groupTasks(sorted, group, { milestones, ns }) };
      }),
    [taskSet, tasks, filter, statusSet, sort, group, ns],
  );

  return useAtomValue(atom);
};

/** Tag registry keyed by the `Tag` object's uri — the id space `#tag` terms and `meta.tags` share. */
const useTagMap = (db: Database.Database | undefined): Tag.Map => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  return useMemo(
    () =>
      tags.reduce<Tag.Map>((acc, tag) => {
        acc[Obj.getURI(tag).toString()] = tag;
        return acc;
      }, {}),
    [tags],
  );
};
