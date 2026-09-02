//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import INSTRUCTIONS from './update-tasks.md?raw';

/**
 * LLM-facing checklist entry: items are addressed by title (the checklist is markdown — see
 * `Outline.upsertChecklistItems`); `started` renders unchecked, nuance lives in conversation.
 */
const ChecklistTask = Schema.Struct({
  title: Schema.String.annotate({ description: 'Task title; also the key for updates.' }),
  status: Schema.Literals(['todo', 'started', 'done']),
});

export const UpdateTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.updateTasks'),
    name: 'Update tasks',
    description: INSTRUCTIONS,
    icon: 'ph--check-square-offset--regular',
  },
  input: Schema.Struct({
    tasks: Schema.Array(ChecklistTask),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service],
});

const TaskRefs = Schema.Array(Ref.Ref(Task.Task));

export const AssignTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.assignTasks'),
    name: 'Assign tasks',
    icon: 'ph--list-plus--regular',
    description: trim`
      Puts tasks that already exist elsewhere (a project's task set, another conversation) onto this
      conversation's checklist, or takes them off it.
      Use update-tasks instead to create a task or to change one's status; this tool only changes
      which existing tasks the conversation is working on.
      Removing a task only unassigns it from this conversation — the task itself is not deleted.
      Both arrays take task references and either may be omitted.
    `,
  },
  input: Schema.Struct({
    add: TaskRefs.annotate({ description: 'Existing tasks to add to the checklist.' }).pipe(Schema.optional),
    remove: TaskRefs.annotate({ description: 'Tasks to take off the checklist.' }).pipe(Schema.optional),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service],
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
