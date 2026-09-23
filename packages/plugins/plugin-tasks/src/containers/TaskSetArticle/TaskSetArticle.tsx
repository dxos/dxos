//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperation, useOperationHandler, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Database, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Panel, Switch, Toolbar, useTranslation } from '@dxos/react-ui';
import {
  useArticleKeyboardNavigation,
  useAttention,
  useSelection,
  useSelectionActions,
} from '@dxos/react-ui-attention';
import { type EditorController } from '@dxos/react-ui-editor';
import { createMenuAction } from '@dxos/react-ui-menu';
import { TaskList, type TaskPlacement, type TaskSelectModifiers } from '@dxos/react-ui-task';
import { Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation, TasksCapabilities } from '#types';

import { useDescriptionComponents, useMarkdownExtensions, useTaskActions } from '../../hooks/index.ts';
import { filterTasks } from '../../util/index.ts';
import { TaskFilter } from './TaskFilter.tsx';

export type TaskSetArticleProps = AppSurface.ObjectArticleProps<TaskSet.TaskSet>;

/**
 * Every task in a set, rendered as the sub-task tree the flat `tasks` array plus `parentTask`
 * describe, and restructurable by dragging a row or with `Alt`+arrow. Milestone grouping is
 * deliberately not rendered yet (see TASKS.md). CRUD flows through the
 * {@link TaskOperation} verbs so the article and external agents share one write path: the verbs
 * are what keep the array, the refs and `parentTask` consistent.
 */
export const TaskSetArticle = ({ role, attendableId, subject: taskSet }: TaskSetArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const filterEditorRef = useRef<EditorController>(null);
  const spaceId = Obj.getDatabase(taskSet)?.spaceId;
  const db = Obj.getDatabase(taskSet);
  const allTasks = useTasks(taskSet);
  // The toolbar's filter, as the mailbox composes its own: the query editor's text is what the
  // reader edits, its parse is what the list is narrowed by. Held per mount — a filter is a glance,
  // not a property of the set.
  const [filterText, setFilterText] = useState('');
  const [filter, setFilter] = useState<Filter.Any | undefined>(undefined);
  const tags = useTagMap(db);
  const tasks = useFilteredTasks(allTasks, filter);
  const handleClearFilter = useCallback(() => {
    filterEditorRef.current?.setText('');
    setFilterText('');
    setFilter(undefined);
  }, []);
  const { checked, onTaskCheck } = useCheckedTasks(taskSet);

  const handleCreate = useOperation(
    TaskOperation.CreateTask,
    (props: Task.Draft) => ({ taskSet: Ref.make(taskSet), ...props }),
    { spaceId },
  );

  const handleUpdate = useOperation(
    TaskOperation.UpdateTask,
    (task: Task.Task, props: Task.Edit) => ({ task: Ref.make(task), ...props }),
    { spaceId },
  );

  const handleDelete = useOperation(TaskOperation.DeleteTask, (task: Task.Task) => ({ task: Ref.make(task) }), {
    spaceId,
  });

  // Delete is one item among the contributed ones, so a row has a single trailing affordance
  // whatever any plugin adds to it.
  const contributed = useTaskActions();
  const getTaskActions = useCallback(
    (task: Task.Task) => [
      ...contributed(task),
      createMenuAction(`delete-${task.id}`, () => handleDelete(task), {
        label: t('delete-task.label'),
        icon: 'ph--x--regular',
        testId: 'tasks.task.delete',
      }),
    ],
    [contributed, handleDelete, t],
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

  // A row opens the task as its own plank, the way a mailbox row opens its message: the `task` rung
  // of the host's deck chain names the plank, so reading down the list reuses one plank rather than
  // stacking one per click. `attendableId` is the host's node — the project's inside its Tasks tab.
  const { invokePromise } = useOperationInvoker();
  const currentId = useSelection(attendableId, 'single');
  const handleOpen = useCallback(
    (task: Task.Task | undefined, { meta }: TaskSelectModifiers = {}) => {
      if (!task) {
        return;
      }

      void invokePromise(LayoutOperation.Select, {
        contextId: attendableId,
        subject: { mode: 'single', id: task.id },
      });
      // Meta/ctrl click asks for a plank of its own, so it opens without a level and keeps whatever
      // is already there.
      void invokePromise(LayoutOperation.Open, {
        subject: [`${attendableId}/${task.id}`],
        ...(meta ? {} : { root: attendableId, level: 'task' }),
        pivotId: attendableId,
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [attendableId, invokePromise],
  );

  const handleNavigate = useCallback(
    (taskId: string) => handleOpen(tasks.find(({ id }) => id === taskId)),
    [tasks, handleOpen],
  );

  useArticleKeyboardNavigation({ articleId: attendableId, items: tasks, currentId, onSelect: handleNavigate });

  const descriptionExtensions = useMarkdownExtensions(taskSet);
  const descriptionComponents = useDescriptionComponents();

  const filterRow = (
    <TaskFilter
      db={db}
      tags={tags}
      value={filterText}
      onChange={setFilterText}
      onFilterChange={setFilter}
      onClear={handleClearFilter}
      editorRef={filterEditorRef}
    />
  );

  const content = (
    <TaskList.Root
      tasks={tasks}
      hierarchical
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
        <TaskList.Content classNames='dx-document border' />
      </TaskList.Viewport>
      <div className='p-2 pt-0'>
        {/* Create-only: the detail is the task plank a row opens, so the pane stays the add row
            rather than turning into an editor the moment a row is selected. */}
        <TaskList.Edit
          createOnly
          showDescription
          descriptionExtensions={descriptionExtensions}
          classNames='dx-document bg-input-surface border border-separator rounded-md p-2'
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
const useFilteredTasks = (tasks: readonly Task.Task[], filter: Filter.Any | undefined): readonly Task.Task[] => {
  const atom = useMemo(
    () =>
      Atom.make((get): readonly Task.Task[] => {
        // Subscribed per task, so an edit that changes whether a row matches re-runs the filter
        // without a whole-list subscription.
        tasks.forEach((task) => {
          get(Obj.atomProperty(task, 'title'));
          get(Obj.atomProperty(task, 'description'));
          get(Obj.atomProperty(task, 'status'));
        });
        return filterTasks(tasks, filter);
      }),
    [tasks, filter],
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
