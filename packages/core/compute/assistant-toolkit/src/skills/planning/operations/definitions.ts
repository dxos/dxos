//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Task } from '@dxos/types';

import INSTRUCTIONS from './update-tasks.md?raw';

/**
 * One edit to the conversation's tasks. Flat rather than a union of create/update shapes: a union
 * renders as `anyOf`, which some providers handle poorly, so the handler enforces the combinations.
 */
// TODO(burdon): Reconcile with Task.
const TaskChange = Schema.Struct({
  task: Ref.Ref(Task.Task)
    .annotate({ description: 'The existing task to change, as the ref on its checklist line. Omit with `create`.' })
    .pipe(Schema.optional),
  create: Schema.Boolean.annotate({
    description: 'Create a new task on this checklist, assigned to you. Requires `title`; omit `task`.',
  }).pipe(Schema.optional),
  assign: Schema.Boolean.annotate({
    description: 'Put the task on this checklist and make you its assignee.',
  }).pipe(Schema.optional),
  unassign: Schema.Boolean.annotate({
    description: 'Take the task off this checklist and clear its assignee. Never deletes the task.',
  }).pipe(Schema.optional),
  title: Schema.String.annotate({ description: 'The new task title, or a rename of an existing task.' }).pipe(
    Schema.optional,
  ),
  status: Schema.Literals(['todo', 'started', 'done'])
    .annotate({ description: '`started` also assigns the task to you.' })
    .pipe(Schema.optional),
});

export type TaskChange = Schema.Schema.Type<typeof TaskChange>;

export const UpdateTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.updateTasks'),
    name: 'Update tasks',
    description: INSTRUCTIONS,
    icon: 'ph--check-square-offset--regular',
  },
  input: Schema.Struct({
    changes: Schema.Array(TaskChange),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service, Trace.TraceService],
});

export const PlanReminder = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.planReminder'),
    name: 'Plan reminder',
    description: 'Reminds the agent to continue when its plan still has incomplete tasks.',
  },
  input: Schema.Struct({}),
  output: Schema.Void,
  services: [Harness.HarnessService, Database.Service, AiService.AiService],
});
