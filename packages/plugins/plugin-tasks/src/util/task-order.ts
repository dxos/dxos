//
// Copyright 2026 DXOS.org
//

// Types only: the package's runtime barrel carries the list's React tree, which this module must not.
import { type TaskGroup } from '@dxos/react-ui-task';
import { type Actor, type Milestone, Task } from '@dxos/types';
import { getStyles } from '@dxos/ui-theme';

import { type TaskSetView } from '#types';

const rank = <T extends string>(values: readonly T[]) => {
  const ranks = new Map(values.map((value, index) => [value, index]));
  return (value: T | undefined): number => (value === undefined ? values.length : (ranks.get(value) ?? values.length));
};

const statusRank = rank(Task.StatusOptions.map(({ id }) => id));
// Most urgent first, so ascending priority reads top-down the way a reader triages.
const priorityRank = rank([...Task.Priority.literals].reverse());
const estimateRank = rank(Task.Estimate.literals);

/** The date of the task's latest history entry, as ms; absent when the task logged nothing. */
const updatedAt = (task: Task.Task): number | undefined => {
  const dates = (task.history ?? []).map((entry) => Date.parse(entry.date)).filter((value) => !Number.isNaN(value));
  return dates.length > 0 ? Math.max(...dates) : undefined;
};

const compareBy: Record<Exclude<TaskSetView.SortField, 'manual'>, (left: Task.Task, right: Task.Task) => number> = {
  status: (left, right) => statusRank(left.status ?? 'todo') - statusRank(right.status ?? 'todo'),
  priority: (left, right) => priorityRank(left.priority) - priorityRank(right.priority),
  estimate: (left, right) => estimateRank(left.estimate) - estimateRank(right.estimate),
  // Object ids are ULIDs, whose leading characters are the creation time — so id order is creation
  // order without depending on a `created` history entry an imported task may not carry.
  created: (left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  updated: (left, right) => (updatedAt(left) ?? 0) - (updatedAt(right) ?? 0),
  title: (left, right) => (left.title ?? '').localeCompare(right.title ?? '', undefined, { sensitivity: 'base' }),
};

/**
 * The tasks reordered by `sort`, ties kept in the input's (the set's canonical) order.
 *
 * Only order changes, never membership or `parentTask`: the tree still nests each sub-task under its
 * parent, so a sort reorders siblings rather than flattening the hierarchy.
 */
export const sortTasks = (tasks: readonly Task.Task[], sort: TaskSetView.Sort | undefined): readonly Task.Task[] => {
  if (!sort || sort.field === 'manual') {
    return tasks;
  }
  const compare = compareBy[sort.field];
  const sign = sort.direction === 'desc' ? -1 : 1;
  const index = new Map(tasks.map((task, position) => [task.id, position]));
  return [...tasks].sort(
    (left, right) => sign * compare(left, right) || (index.get(left.id) ?? 0) - (index.get(right.id) ?? 0),
  );
};

export type GroupTasksOptions = {
  /** The set's milestones in sequence — the order milestone groups render in. */
  milestones?: readonly Milestone.Milestone[];
  /** Namespace of the `group-*` labels (a task with no priority, no assignee, no milestone). */
  ns: string;
};

/**
 * The tasks partitioned by `field`, each group's tasks in the input order (so a sort applies within
 * every group). Groups come in the field's own order — the status table, most urgent priority first,
 * the set's milestone sequence, assignees by name — with the group of tasks that have no value last.
 * Absent for `none`: an ungrouped list has no headers at all.
 */
export const groupTasks = (
  tasks: readonly Task.Task[],
  field: TaskSetView.GroupField,
  { milestones = [], ns }: GroupTasksOptions,
): TaskGroup[] | undefined => {
  switch (field) {
    case 'none':
      return undefined;

    case 'status':
      return Task.StatusOptions.map(({ id, title, icon, color }) => ({
        id: `status-${id}`,
        label: title,
        icon,
        iconClassNames: hue(color),
        // `todo` is the status of a task that carries none, as every row that renders one assumes.
        tasks: tasks.filter((task) => (task.status ?? 'todo') === id),
      }));

    case 'priority':
      return [
        ...[...Task.PriorityOptions].reverse().map(({ id, title, icon, color }) => ({
          id: `priority-${id}`,
          label: title,
          icon,
          iconClassNames: hue(color),
          tasks: tasks.filter((task) => task.priority === id),
        })),
        {
          id: 'priority-none',
          label: groupLabel('group-no-priority.label', ns),
          icon: 'ph--minus--regular',
          tasks: tasks.filter((task) => !task.priority),
        },
      ];

    case 'milestone': {
      const effective = Task.effectiveMilestoneIds(tasks);
      return [
        ...milestones.map((milestone) => ({
          id: `milestone-${milestone.id}`,
          label: milestone.name ?? milestone.id,
          icon: 'ph--flag-banner--regular',
          tasks: tasks.filter((task) => effective.get(task.id) === milestone.id),
        })),
        {
          id: 'milestone-none',
          label: groupLabel('group-no-milestone.label', ns),
          icon: 'ph--tray--regular',
          // A task filed under a milestone the set no longer lists is as unfiled as one with none.
          tasks: tasks.filter((task) => {
            const id = effective.get(task.id);
            return !id || !milestones.some((milestone) => milestone.id === id);
          }),
        },
      ];
    }

    case 'assignee': {
      const byKey = new Map<string, { label: string; agent: boolean; tasks: Task.Task[] }>();
      const unassigned: Task.Task[] = [];
      for (const task of tasks) {
        const assignee = task.assignee;
        const key = assignee && actorKey(assignee);
        if (!assignee || !key) {
          unassigned.push(task);
          continue;
        }
        const entry = byKey.get(key) ?? { label: actorName(assignee), agent: assignee.role === 'assistant', tasks: [] };
        entry.tasks.push(task);
        byKey.set(key, entry);
      }
      return [
        ...[...byKey.entries()]
          .sort(([, left], [, right]) => left.label.localeCompare(right.label))
          .map(([key, { label, agent, tasks }]) => ({
            id: `assignee-${key}`,
            label,
            icon: agent ? 'ph--sparkle--regular' : 'ph--user--regular',
            tasks,
          })),
        {
          id: 'assignee-none',
          label: groupLabel('group-unassigned.label', ns),
          icon: 'ph--user-circle-dashed--regular',
          tasks: unassigned,
        },
      ];
    }
  }
};

/** What identifies an assignee, so two tasks assigned to the same person land in one group. */
const actorKey = (actor: Actor.Actor): string | undefined =>
  Task.refEntityId(actor.contact) ??
  actor.identityDid ??
  actor.email ??
  actor.name ??
  (actor.role === 'assistant' ? 'assistant' : undefined);

/** How an assignee reads in a header: a resolved contact's name, else whatever identifies them. */
const actorName = (actor: Actor.Actor): string => {
  const contact = actor.contact?.isAvailable ? actor.contact.target : undefined;
  return (
    contact?.fullName ??
    actor.name ??
    actor.email ??
    actor.identityDid ??
    (actor.role === 'assistant' ? 'Agent' : (Task.refEntityId(actor.contact) ?? ''))
  );
};

const groupLabel = (key: string, ns: string): TaskGroup['label'] => [key, { ns }];

/** An option's hue as a text colour, as the list's own status and priority controls paint it. */
const hue = (color: string | undefined): string => getStyles(color ?? 'neutral').text;
