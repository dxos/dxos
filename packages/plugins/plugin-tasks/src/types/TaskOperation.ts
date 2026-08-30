//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Format, Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
// Person is referenced in Actor.Actor's inferred type (via the contact ref); importing it lets
// the compiler name the operation types portably (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Actor, Milestone, type Person, Task, TaskSet } from '@dxos/types';

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

/**
 * Files a task into a set's `tasks` array — the membership-and-order record, which a generic object
 * create leaves untouched — and rejects a milestone or parent belonging to another set.
 */
export const CreateTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.create'),
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
    priority: Schema.optional(Task.Priority),
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
    task: Type.getSchema(Task.Task),
  }),
}).pipe(Operation.mutation('write'));

/**
 * The only writer that may re-parent a task: a generic object update cannot reject a cycle or a
 * cross-set parent, nor move the lifecycle edge that decides what the task cascades with.
 */
export const UpdateTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.update'),
    name: 'Update Task',
    description: 'Patch task fields: title, description, status, priority, estimate, assignee. Null clears a field.',
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
    title: Schema.optional(Schema.String),
    // `null` clears an optional field, matching `Task.Edit` — without it the operation can set an
    // assignee but never remove one.
    description: Schema.optional(Schema.NullOr(Schema.String)),
    status: Schema.optional(Task.Status),
    priority: Schema.optional(Schema.NullOr(Task.Priority)),
    estimate: Schema.optional(Schema.NullOr(Schema.Number)),
    assignee: Schema.optional(Schema.NullOr(Actor.Actor)),
    /** Re-file under a milestone; `null` moves the task to the backlog. */
    milestone: Schema.optional(Schema.NullOr(Ref.Ref(Milestone.Milestone))),
    /** Re-parent as a sub-task; `null` promotes the task to a root of its set. */
    parentTask: Schema.optional(Schema.NullOr(Ref.Ref(Task.Task))),
  }),
  // JSON snapshot, not a live object: the handler may run on a remote host (edge
  // operation-service) where only serializable values cross the wire — same contract as
  // `database.objectCreate`.
  output: Schema.Struct({
    task: Type.getSchema(Task.Task),
  }),
}).pipe(Operation.mutation('write'));

export const TaskRestorePoint = Schema.Struct({
  entries: Schema.Array(
    Schema.Struct({
      task: Type.getSchema(Task.Task),
      index: Schema.optional(Schema.Number).annotate({
        description: "Position the task held in the set's `tasks` array; absent when it belonged to no set.",
      }),
    }),
  ).annotate({
    description: 'The deleted task and every sub-task that went with it.',
  }),
  taskSet: Schema.optional(Type.getSchema(TaskSet.TaskSet)).annotate({
    description: 'The set the tasks were filed in, when they were in one.',
  }),
});

export type TaskRestorePoint = Schema.Schema.Type<typeof TaskRestorePoint>;

/**
 * Removes a task and its sub-tasks. `Database.remove` cascades along the parent edge, but the set's
 * `tasks` array is a separate membership record, so a generic delete leaves the whole subtree's
 * entries dangling behind it.
 */
export const DeleteTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.delete'),
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
    restore: TaskRestorePoint,
  }),
}).pipe(Operation.mutation('destructive'));

export const RestoreTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.restore'),
    name: 'Restore Tasks',
    description: 'Restore deleted tasks and their sub-tasks to their task set.',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: TaskRestorePoint,
  output: Schema.Void,
}).pipe(Operation.mutation('write'));

/**
 * Repositions a task within its set's `tasks` array. There is no sort key to patch — the array
 * order is the order — so ordering is unreachable from a generic object update.
 *
 * Re-parenting is part of the same verb because a drop in the tree is both at once: doing it as
 * `UpdateTask` then `MoveTask` leaves a window where the task hangs at the end of its new parent
 * before the position lands, and costs two undo entries for one gesture.
 */
export const MoveTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.move'),
    name: 'Move Task',
    description: 'Reposition a task within its task set, optionally re-parenting it — array order is the task order.',
    icon: 'ph--arrows-down-up--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
    /** Insert immediately before this task; omit to move to the end. */
    before: Schema.optional(Ref.Ref(Task.Task)),
    /** Re-parent as a sub-task; `null` promotes the task to a root of its set (as `UpdateTask`). */
    parentTask: Schema.optional(Schema.NullOr(Ref.Ref(Task.Task))),
  }),
  output: Schema.Struct({
    task: Type.getSchema(Task.Task),
  }),
}).pipe(Operation.mutation('write'));

/** Opaque forward cursor; currently an encoded offset, so the wire shape survives a key-cursor swap. */
export const TaskCursor = Schema.String;

/**
 * Reads a set's tasks in order, which a generic query cannot: order lives in the `tasks` array,
 * root-vs-subtask is derived from the parent refs, and a task's effective milestone is inherited up
 * the parent chain rather than stored. Also filters by an assignee's DID, email or name.
 */
export const ListTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.list'),
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
    status: Schema.optional(Task.Status),
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
    tasks: Schema.Array(Type.getSchema(Task.Task)),
    /** Present when more results remain; pass back as `after`. */
    nextCursor: Schema.optional(TaskCursor),
  }),
}).pipe(Operation.mutation('none'));

//
// Milestones. A milestone is an ordered span of work within a task set; it carries no status of
// its own, so `milestoneList` reports progress derived from the tasks filed under it.
//

/**
 * Appends to the set's `milestones` array, which is both the membership record and the sequence
 * `milestoneMove` reorders — neither reachable from a generic object create.
 */
export const CreateMilestone = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.createMilestone'),
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
    milestone: Type.getSchema(Milestone.Milestone),
  }),
}).pipe(Operation.mutation('write'));

/**
 * Removes a milestone and releases its tasks to the backlog, matching Linear and GitHub. A generic
 * delete would leave both the set's `milestones` entry and every task's `milestone` ref behind.
 */
export const DeleteMilestone = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.deleteMilestone'),
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

/**
 * Repositions a milestone within its set's `milestones` array, which is the milestone sequence —
 * order is the array, not a field a generic update could patch.
 */
export const MoveMilestone = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.moveMilestone'),
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
    milestone: Type.getSchema(Milestone.Milestone),
  }),
}).pipe(Operation.mutation('write'));

/**
 * Lists a set's milestones in sequence with progress. A milestone stores no status: `done`/`total`
 * are counted from the tasks filed under it, so a generic query returns neither.
 */
export const ListMilestones = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.listMilestone'),
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
