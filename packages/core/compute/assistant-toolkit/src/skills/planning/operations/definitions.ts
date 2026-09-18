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
 * One edit to the conversation's tasks. Flat rather than a union of create/update shapes: a union
 * renders as `anyOf`, which some providers handle poorly, so the handler enforces the combinations.
 */
const TaskChange = Schema.Struct({
  task: Ref.Ref(Task.Task)
    .annotate({
      description:
        'The existing task to change: the `echo://` URI inside the link on its checklist line, as a plain string. Omit with `create`.',
    })
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

export const AskQuestion = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.askQuestion'),
    name: 'Ask question',
    icon: 'ph--question--regular',
    description: trim`
      Ask the user a question you cannot answer yourself, and stop that task on it.
      Prefer asking to guessing: an assumption the checklist then carries as fact costs more than
      the round trip does.
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
