//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Ref, Type } from '@dxos/echo';
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
    taskSet: Type.getSchema(TaskSet.TaskSet).annotations({
      description: 'The task set (container) the task files into.',
    }),
    title: Schema.String,
    description: Schema.optional(Schema.String),
    priority: Schema.optional(Schema.Literal('none', 'low', 'medium', 'high', 'urgent')),
    assignee: Schema.optional(Actor.Actor),
    /** Parent task for a sub-task; when set, the task is parented to it instead of the task set. */
    parent: Schema.optional(Ref.Ref(Task.Task)),
  }),
  output: Schema.Struct({
    task: Type.getSchema(Task.Task),
  }),
});

export const UpdateTask = Operation.make({
  meta: {
    key: makeKey('taskUpdate'),
    name: 'Update Task',
    description: 'Patch task fields: title, description, status, priority, estimate, assignee.',
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Type.getSchema(Task.Task),
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    status: Schema.optional(Schema.Literal('todo', 'in-progress', 'done', 'failed', 'cancelled')),
    priority: Schema.optional(Schema.Literal('none', 'low', 'medium', 'high', 'urgent')),
    estimate: Schema.optional(Schema.Number),
    assignee: Schema.optional(Actor.Actor),
  }),
  output: Schema.Struct({
    task: Type.getSchema(Task.Task),
  }),
});

export const CompleteTask = Operation.make({
  meta: {
    key: makeKey('taskComplete'),
    name: 'Complete Task',
    description: 'Mark a task done — the 90% action as one verb.',
    icon: 'ph--check--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Type.getSchema(Task.Task),
  }),
  output: Schema.Struct({
    task: Type.getSchema(Task.Task),
  }),
});

export const AssignTask = Operation.make({
  meta: {
    key: makeKey('taskAssign'),
    name: 'Assign Task',
    description: 'Assign a task to a person (contact/email/name) or an agent (role assistant + DID).',
    icon: 'ph--user-circle--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Type.getSchema(Task.Task),
    assignee: Actor.Actor,
  }),
  output: Schema.Struct({
    task: Type.getSchema(Task.Task),
  }),
});
