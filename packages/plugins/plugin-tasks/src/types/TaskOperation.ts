//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
// Person is referenced in Actor.Actor's inferred type (via the contact ref); importing it lets
// the compiler name the operation types portably (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Actor, type Person, Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Linear-shaped task verbs (MILESTONE-5.md §7.2). Verbs enforce what models get wrong with raw
 * object CRUD: defaults (`status: 'todo'`), parent-edge containment, schema-checked patches.
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
    taskSet: Ref.Ref(TaskSet.TaskSet).annotations({
      description: 'The task set (container) the task files into.',
    }),
    title: Schema.String,
    description: Schema.optional(Schema.String),
    priority: Schema.optional(Schema.Literal('none', 'low', 'medium', 'high', 'urgent')),
    assignee: Schema.optional(Actor.Actor),
    /** Parent task for a sub-task; when set, the task is parented to it instead of the task set. */
    parent: Schema.optional(Ref.Ref(Task.Task)),
  }),
  // JSON snapshot, not a live object: the handler may run on a remote host (edge
  // operation-service) where only serializable values cross the wire — same contract as
  // `database.objectCreate`.
  output: Schema.Struct({
    task: Schema.Unknown,
  }),
}).pipe(Operation.mcpTool({ name: 'taskCreate', safety: 'write', aspect: 'tasks' }));

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
    status: Schema.optional(Schema.Literal('todo', 'in-progress', 'done', 'failed', 'cancelled')),
    priority: Schema.optional(Schema.Literal('none', 'low', 'medium', 'high', 'urgent')),
    estimate: Schema.optional(Schema.Number),
    assignee: Schema.optional(Actor.Actor),
  }),
  // JSON snapshot, not a live object: the handler may run on a remote host (edge
  // operation-service) where only serializable values cross the wire — same contract as
  // `database.objectCreate`.
  output: Schema.Struct({
    task: Schema.Unknown,
  }),
}).pipe(Operation.mcpTool({ name: 'taskUpdate', safety: 'write', aspect: 'tasks' }));

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
}).pipe(Operation.mcpTool({ name: 'taskComplete', safety: 'write', aspect: 'tasks' }));

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
}).pipe(Operation.mcpTool({ name: 'taskAssign', safety: 'write', aspect: 'tasks' }));

/** Opaque forward cursor; currently an encoded offset, so the wire shape survives a key-cursor swap. */
export const TaskCursor = Schema.String;

export const ListTasks = Operation.make({
  meta: {
    key: makeKey('taskList'),
    name: 'List Tasks',
    description:
      "List tasks in a task set (or a project's task sets), newest first. Filter by status or assignee; page with `after`/`limit`.",
    icon: 'ph--list-checks--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    /** Container to list. Exactly one of `taskSet` / `project` — a project lists across its task sets. */
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
    project: Schema.optional(Ref.Ref(Obj.Unknown)).annotations({
      description: 'Project whose task sets are listed (org.dxos.type.project).',
    }),
    status: Schema.optional(Schema.Literal('todo', 'in-progress', 'done', 'failed', 'cancelled')),
    /** Matches the assignee by DID, email, or display name — whichever the actor carries. */
    assignee: Schema.optional(Schema.String),
    /** Include sub-tasks (children of tasks); by default only root tasks of the container. */
    includeSubtasks: Schema.optional(Schema.Boolean),
    after: Schema.optional(TaskCursor),
    limit: Schema.optional(Schema.Number).annotations({ description: 'Page size (default 50, max 200).' }),
  }),
  // JSON snapshots, not live objects — see the create/update verbs above.
  output: Schema.Struct({
    tasks: Schema.Array(Schema.Unknown),
    /** Present when more results remain; pass back as `after`. */
    nextCursor: Schema.optional(TaskCursor),
  }),
}).pipe(Operation.mcpTool({ name: 'taskList', safety: 'read', aspect: 'tasks' }));
