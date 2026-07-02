//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { Plan } from '../../../types';
import INSTRUCTIONS from './update-tasks.md?raw';

// Omit `delegated` and `agentPid` from the LLM-facing schema: these are set by the
// delegation tool / runtime, never by ordinary planning, and keeping them out leaves the tool
// schema unchanged.
const SimpleTask = Plan.Task.omit('delegated', 'agentPid');

export const UpdateTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.planning.updateTasks'),
    name: 'Update tasks',
    description: INSTRUCTIONS,
    icon: 'ph--check-square-offset--regular',
  },
  input: Schema.Struct({
    tasks: Schema.Array(SimpleTask),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service],
});

export const PlanReminder = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.planning.planReminder'),
    name: 'Plan reminder',
    description: 'Reminds the agent to continue when its plan still has incomplete tasks.',
  },
  input: Schema.Struct({}),
  output: Schema.Void,
  services: [Harness.HarnessService, Database.Service, AiService.AiService],
});
