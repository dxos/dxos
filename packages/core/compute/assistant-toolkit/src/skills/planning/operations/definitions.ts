//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';

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
