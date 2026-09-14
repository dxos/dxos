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
import { trim } from '@dxos/util';

import INSTRUCTIONS from './update-tasks.md?raw';

/**
 * LLM-facing checklist entry: items are addressed by title (the checklist is markdown — see
 * `Outline.upsertChecklistItems`); `started` renders unchecked, nuance lives in conversation.
 */
// TODO(burdon): Reconcile with Task.
const SimpleTask = Schema.Struct({
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
    tasks: Schema.Array(SimpleTask),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service, Trace.TraceService],
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

export const AskQuestion = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.askQuestion'),
    name: 'Ask question',
    icon: 'ph--question--regular',
    description: trim`
      Ask the user a question you cannot answer yourself, and stop on it.
      Every question is about one task on the checklist, named by its exact title: the task is put in
      'blocked' and the question filed on it, so the person answering can see what it holds up.
      Offer the likely answers in "options" when you have them — the reader may still type their own,
      so never phrase the question as if the list were exhaustive.
      Ask only what you genuinely cannot decide: a question costs the user a round trip, and a
      blocked task stays blocked until they take it.
      You are not resumed by waiting: finish this turn after asking. When the answer lands you are
      sent a message naming the question, and you read it back with the get-objects tool.
    `,
  },
  input: Schema.Struct({
    task: Schema.String.annotate({
      description: 'Exact title of the checklist task this question blocks.',
    }),
    question: Schema.String.annotate({ description: 'The question, as put to the user.' }),
    context: Schema.optional(
      Schema.String.annotate({ description: 'Why you are asking — what you are blocked on, in a sentence or two.' }),
    ),
    options: Schema.optional(
      Schema.Array(
        Schema.Struct({
          title: Schema.String.annotate({ description: 'The answer, as the reader will see it on the button.' }),
          description: Schema.optional(Schema.String.annotate({ description: 'What choosing it means.' })),
        }),
      ).annotate({ description: 'Suggested answers. Omit when you have no plausible candidates.' }),
    ),
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
