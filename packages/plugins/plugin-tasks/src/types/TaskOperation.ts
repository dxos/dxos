//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Format, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
// Person is referenced in Actor.Actor's inferred type (via the contact ref); importing it lets
// the compiler name the operation types portably (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Actor, Milestone, type Person, Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Linear-shaped task verbs (MILESTONE-5.md §7.2). Verbs enforce what models get wrong with raw
 * object CRUD: defaults (`status: 'todo'`), set membership, schema-checked patches.
 *
 * They are the single write path because the invariants span objects: a task's entry in
 * `TaskSet.tasks` and its lifecycle parent edge must move together, a milestone must belong to the
 * task's own set, and deleting either has to sweep the refs left behind.
 *
 * Subjects are refs, not live objects, so the verbs are invocable from a remote host (the edge
 * operation-service projects them as MCP tools) where only the reference crosses the wire.
 */

export const CreateTask = Operation.make({
  meta: {
    key: makeKey('taskCreate'),
    name: 'Create Task',
    description: 'Create a task in a task set. Defaults status to todo.',
    icon: 'ph--check-circle--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    taskSet: Ref.Ref(TaskSet.TaskSet).annotate({
      description: 'The task set (container) the task files into.',
    }),
    title: Schema.String,
    description: Schema.optional(Schema.String),
    priority: Schema.optional(Schema.Literals(['none', 'low', 'medium', 'high', 'urgent'])),
    assignee: Schema.optional(Actor.Actor),
    /** Parent task for a sub-task; the task still joins the set's flat `tasks` array. */
    parentTask: Schema.optional(Ref.Ref(Task.Task)),
    /** Milestone to file the task under; omit for the backlog. Must belong to the same task set. */
    milestone: Schema.optional(Ref.Ref(Milestone.Milestone)),
  }),
  // JSON snapshot, not a live object: the handler may run on a remote host (edge
  // operation-service) where only serializable values cross the wire — same contract as
  // `database.objectCreate`.
  output: Schema.Struct({
    task: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

export const UpdateTask = Operation.make({
  meta: {
    key: makeKey('taskUpdate'),
    name: 'Update Task',
    description: 'Patch task fields: title, description, status, priority, estimate, assignee.',
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    status: Schema.optional(Schema.Literals(['todo', 'in-progress', 'done', 'failed', 'cancelled'])),
    priority: Schema.optional(Schema.Literals(['none', 'low', 'medium', 'high', 'urgent'])),
    estimate: Schema.optional(Schema.Number),
    assignee: Schema.optional(Actor.Actor),
    /** Re-file under a milestone; `null` moves the task to the backlog. */
    milestone: Schema.optional(Schema.NullOr(Ref.Ref(Milestone.Milestone))),
    /** Re-parent as a sub-task; `null` promotes the task to a root of its set. */
    parentTask: Schema.optional(Schema.NullOr(Ref.Ref(Task.Task))),
  }),
  // JSON snapshot, not a live object: the handler may run on a remote host (edge
  // operation-service) where only serializable values cross the wire — same contract as
  // `database.objectCreate`.
  output: Schema.Struct({
    task: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

export const CompleteTask = Operation.make({
  meta: {
    key: makeKey('taskComplete'),
    name: 'Complete Task',
    description: 'Mark a task done — the 90% action as one verb.',
    icon: 'ph--check--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
  }),
  // JSON snapshot, not a live object: the handler may run on a remote host (edge
  // operation-service) where only serializable values cross the wire — same contract as
  // `database.objectCreate`.
  output: Schema.Struct({
    task: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

export const AssignTask = Operation.make({
  meta: {
    key: makeKey('taskAssign'),
    name: 'Assign Task',
    description: 'Assign a task to a person (contact/email/name) or an agent (role assistant + DID).',
    icon: 'ph--user-circle--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
    assignee: Actor.Actor,
  }),
  // JSON snapshot, not a live object: the handler may run on a remote host (edge
  // operation-service) where only serializable values cross the wire — same contract as
  // `database.objectCreate`.
  output: Schema.Struct({
    task: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

export const DeleteTask = Operation.make({
  meta: {
    key: makeKey('taskDelete'),
    name: 'Delete Task',
    description: 'Delete a task and its sub-tasks, removing them from the task set.',
    icon: 'ph--trash--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
  }),
  output: Schema.Struct({
    /** Ids of the deleted task and every sub-task that went with it. */
    deleted: Schema.Array(Schema.String),
  }),
}).pipe(Operation.mutation('destructive'));

export const MoveTask = Operation.make({
  meta: {
    key: makeKey('taskMove'),
    name: 'Move Task',
    description: 'Reposition a task within its task set — array order is the task order.',
    icon: 'ph--arrows-down-up--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
    /** Insert immediately before this task; omit to move to the end. */
    before: Schema.optional(Ref.Ref(Task.Task)),
  }),
  output: Schema.Struct({
    task: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

/** Opaque forward cursor; currently an encoded offset, so the wire shape survives a key-cursor swap. */
export const TaskCursor = Schema.String;

export const ListTasks = Operation.make({
  meta: {
    key: makeKey('taskList'),
    name: 'List Tasks',
    description:
      "List tasks in a task set (or a project's task set), in set order. Filter by status, assignee, or milestone; page with `after`/`limit`.",
    icon: 'ph--list-checks--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    /** Container to list. Exactly one of `taskSet` / `project` — a project lists its own task set. */
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
    project: Schema.optional(Ref.Ref(Obj.Unknown)).annotate({
      description: 'Project whose task set is listed (org.dxos.type.project).',
    }),
    status: Schema.optional(Schema.Literals(['todo', 'in-progress', 'done', 'failed', 'cancelled'])),
    /** Matches the assignee by DID, email, or display name — whichever the actor carries. */
    assignee: Schema.optional(Schema.String),
    /** Only tasks under this milestone (inherited by sub-tasks from their nearest ancestor). */
    milestone: Schema.optional(Ref.Ref(Milestone.Milestone)),
    /** Include sub-tasks; by default only root tasks of the set. */
    includeSubtasks: Schema.optional(Schema.Boolean),
    after: Schema.optional(TaskCursor),
    limit: Schema.optional(Schema.Number).annotate({ description: 'Page size (default 50, max 200).' }),
  }),
  // JSON snapshots, not live objects — see the create/update verbs above.
  output: Schema.Struct({
    tasks: Schema.Array(Schema.Unknown),
    /** Present when more results remain; pass back as `after`. */
    nextCursor: Schema.optional(TaskCursor),
  }),
}).pipe(Operation.mutation('none'));

//
// Milestones. A milestone is an ordered span of work within a task set; it carries no status of
// its own, so `milestoneList` reports progress derived from the tasks filed under it.
//

export const CreateMilestone = Operation.make({
  meta: {
    key: makeKey('milestoneCreate'),
    name: 'Create Milestone',
    description: 'Create a milestone in a task set, appended to the milestone sequence.',
    icon: 'ph--flag-banner--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    taskSet: Ref.Ref(TaskSet.TaskSet),
    name: Schema.String,
    /** What done means for this milestone. */
    description: Schema.optional(Schema.String),
    targetDate: Schema.optional(Format.DateOnly).annotate({ description: 'Target date as YYYY-MM-DD.' }),
  }),
  output: Schema.Struct({
    milestone: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

export const UpdateMilestone = Operation.make({
  meta: {
    key: makeKey('milestoneUpdate'),
    name: 'Update Milestone',
    description: 'Patch milestone fields: name, description, target date.',
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    milestone: Ref.Ref(Milestone.Milestone),
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    targetDate: Schema.optional(Schema.NullOr(Format.DateOnly)).annotate({
      description: 'Target date as YYYY-MM-DD; null clears it.',
    }),
  }),
  output: Schema.Struct({
    milestone: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

export const DeleteMilestone = Operation.make({
  meta: {
    key: makeKey('milestoneDelete'),
    name: 'Delete Milestone',
    description: 'Delete a milestone. Its tasks are kept and fall back to the backlog.',
    icon: 'ph--trash--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    milestone: Ref.Ref(Milestone.Milestone),
  }),
  output: Schema.Struct({
    /** Number of tasks that fell back to the backlog. */
    releasedTasks: Schema.Number,
  }),
}).pipe(Operation.mutation('destructive'));

export const MoveMilestone = Operation.make({
  meta: {
    key: makeKey('milestoneMove'),
    name: 'Move Milestone',
    description: 'Reposition a milestone within its task set — array order is the milestone sequence.',
    icon: 'ph--arrows-down-up--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    milestone: Ref.Ref(Milestone.Milestone),
    /** Insert immediately before this milestone; omit to move to the end. */
    before: Schema.optional(Ref.Ref(Milestone.Milestone)),
  }),
  output: Schema.Struct({
    milestone: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

export const ListMilestones = Operation.make({
  meta: {
    key: makeKey('milestoneList'),
    name: 'List Milestones',
    description: "List a task set's milestones in sequence, with progress derived from their tasks.",
    icon: 'ph--flag-banner--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
    project: Schema.optional(Ref.Ref(Obj.Unknown)).annotate({
      description: 'Project whose task set is listed (org.dxos.type.project).',
    }),
  }),
  output: Schema.Struct({
    milestones: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        description: Schema.optional(Schema.String),
        targetDate: Schema.optional(Format.DateOnly),
        /** Tasks owed (cancelled ones excluded) and how many are done — a milestone stores no status. */
        total: Schema.Number,
        done: Schema.Number,
      }),
    ),
  }),
}).pipe(Operation.mutation('none'));
