//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { useCapabilities, useOperation, useOperationHandler, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface, useDetailNavigation } from '@dxos/app-toolkit/ui';
import { type Database, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useQuery } from '@dxos/echo-react';
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
import { type TaskCreateHandler, TaskList, type TaskPlacement, type TaskSelectModifiers } from '@dxos/react-ui-task';
import { Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation, TasksCapabilities, TaskSetView } from '#types';

import { useDescriptionComponents, useMarkdownExtensions, useTaskActions } from '../../hooks/index.ts';
import { filterTasks } from '../../util/index.ts';
import { useAttachFile } from '../TaskArticle/TaskAttachments.tsx';
import { TaskFilter } from './TaskFilter.tsx';
import { ALL_STATUSES } from './TaskStatusFilter.tsx';

export type TaskSetArticleProps = AppSurface.ObjectArticleProps<TaskSet.TaskSet> & {
  /**
   * Where a row opens its task. `'plank'` (the default) opens it beside the list, reusing the host's
   * `task` deck level; `'companion'` opens the host's `~task` companion instead, which keeps the
   * host itself in front of the reader. A host offers `'companion'` only where it contributes one.
   */
  detail?: 'plank' | 'companion';
};

/**
 * Every task in a set, rendered as the sub-task tree the flat `tasks` array plus `parentTask`
 * describe, and restructurable by dragging a row or with `Alt`+arrow. Milestone grouping is
 * deliberately not rendered yet (see TASKS.md). CRUD flows through the
 * {@link TaskOperation} verbs so the article and external agents share one write path: the verbs
 * are what keep the array, the refs and `parentTask` consistent.
 */
export const TaskSetArticle = ({ role, attendableId, subject: taskSet, detail = 'plank' }: TaskSetArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const filterEditorRef = useRef<EditorController>(null);
  const spaceId = Obj.getDatabase(taskSet)?.spaceId;
  const db = Obj.getDatabase(taskSet);
  const allTasks = useTasks(taskSet);
  // The toolbar's filter, as the mailbox composes its own: the query editor's text is what the
  // reader edits, its parse is what the list is narrowed by. The text and the statuses the ledger
  // shows are persisted per device and per set (see {@link TaskSetView.aspect}).
  const { filterText, setFilterText, statuses, setStatuses } = useTaskSetFilter(taskSet.id, filterEditorRef);
  const tags = useTagMap(db);
  // Parsed here rather than taken from the editor's own callback: the parse then re-runs when the
  // tag registry changes (a `#tag` typed before its tag loaded resolves on arrival), and a query
  // that does not parse is a query that matches nothing rather than one that matches everything.
  const filter = useMemo(() => {
    const text = filterText.trim();
    if (text.length === 0) {
      return undefined;
    }
    return new QueryBuilder(tags).build(text).filter ?? Filter.nothing();
  }, [filterText, tags]);
  const tasks = useFilteredTasks(allTasks, filter, statuses);
  // Clears both terms: a reader who hid a status and typed a query asked one question of the list,
  // and clearing half of it leaves rows missing with nothing in the toolbar saying why.
  const handleClearFilter = useCallback(() => {
    setFilterText('');
    setStatuses(ALL_STATUSES);
  }, [setFilterText, setStatuses]);
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
      Effect.runSync(move(task, placement));
    },
    [move],
  );

  useArticleKeyboardNavigation({ articleId: attendableId, items: tasks, currentId, onSelect: openDetail });

  const descriptionExtensions = useMarkdownExtensions(taskSet);
  const descriptionComponents = useDescriptionComponents();

  const filterRow = (
    <TaskFilter
      db={db}
      tags={tags}
      value={filterText}
      statuses={statuses}
      onChange={setFilterText}
      onStatusesChange={setStatuses}
      onClear={handleClearFilter}
      editorRef={filterEditorRef}
    />
  );

  const content = (
    <TaskList.Root
      tasks={tasks}
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
      onTaskMove={handleMove}
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
 * The set's filter, held in {@link TaskSetView.aspect} and mirrored into the query editor.
 *
 * The editor takes its text once, on mount, so a write that did not come from typing — clear,
 * another view of the same set, another tab — is pushed into it here. Pushed from the subscription
 * rather than from a render effect: the subscription fires as the value is written, when the editor
 * already holds whatever was just typed, whereas an effect can run for a render that trails fast
 * typing and rewrite the document back to older text.
 */
const useTaskSetFilter = (contextId: string, editorRef: RefObject<EditorController | null>) => {
  const manager = useManagerOptional();
  const { query, statuses } = useViewState(TaskSetView.aspect, contextId);
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

  // Unchanged text keeps the same value, so the editor echoing a pushed text back is not a write.
  const setFilterText = useCallback(
    (query: string) => update((view) => (view.query === query ? view : { ...view, query })),
    [update],
  );
  // Every status is stored as none, so the unfiltered list holds nothing a new status would miss.
  const setStatuses = useCallback(
    (next: readonly Task.Status[]) =>
      update(({ statuses: _statuses, ...view }) =>
        next.length === ALL_STATUSES.length ? view : { ...view, statuses: [...next] },
      ),
    [update],
  );

  return { filterText: query, setFilterText, statuses: statuses ?? ALL_STATUSES, setStatuses };
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
 * The set's tasks via `childOf` — membership is the ECHO parent edge, and transitive tolerates
 * legacy sub-tasks still parented to their parent task. The query re-emits on membership changes
 * only, never on a member's edit — `TaskList` rows subscribe themselves.
 */
const useTasks = (taskSet: TaskSet.TaskSet): readonly Task.Task[] => {
  const atom = useMemo(() => {
    const query = Obj.getDatabase(taskSet)?.query(Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)));
    return Atom.make((get): readonly Task.Task[] => {
      const tasks: readonly Task.Task[] = query ? get(query.atom) : [];
      // Subscribes each member's `parentTask` (the set's array does not carry hierarchy)
      // and orders by the set's canonical array.
      tasks.forEach((task) => get(Obj.atomProperty(task, 'parentTask')));
      return Task.orderTasks(tasks, get(Obj.atomProperty(taskSet, 'tasks')) ?? []);
    });
  }, [taskSet]);

  return useAtomValue(atom);
};

/**
 * The tasks whose title or description contains `filter` (case-insensitive), with the ancestors
 * of every match kept so a matching sub-task still hangs off its branch. Empty filter: every task.
 * Read through atoms so a title edited in a row re-runs the match.
 */
const useFilteredTasks = (
  tasks: readonly Task.Task[],
  filter: Filter.Any | undefined,
  statuses: readonly Task.Status[],
): readonly Task.Task[] => {
  // A set, so the match is a lookup per task rather than a scan of the status list, and one the
  // atom below can depend on by identity.
  const statusSet = useMemo(() => new Set(statuses), [statuses]);
  const atom = useMemo(
    () =>
      Atom.make((get): readonly Task.Task[] => {
        // Subscribed per task, so an edit that changes whether a row matches re-runs the filter
        // without a whole-list subscription.
        // The whole object, not the fields the text search reads: a filter can name any property
        // (`status:`, `priority:`) or the task's tags, and a property-level subscription would miss
        // every term but the ones listed here.
        tasks.forEach((task) => get(Obj.atom(task)));
        return filterTasks(tasks, { filter, statuses: statusSet });
      }),
    [tasks, filter, statusSet],
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
