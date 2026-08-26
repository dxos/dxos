//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const DelegateTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.delegateTask'),
    name: 'Delegate task',
    description: trim`
      Delegate a NEW unit of work to a sub-agent.
      Creates a durable task assigned to an agent; the supervisor spawns a background sub-agent
      for it and reports the result back to the conversation. To delegate tasks that already
      exist on the checklist, use delegate-tasks instead.
    `,
    icon: 'ph--share-network--regular',
  },
  input: Schema.Struct({
    title: Schema.String.annotate({
      description: 'Title of the work to delegate (matched against the checklist, created if new).',
    }),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service],
});

export const DelegateTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.delegateTasks'),
    name: 'Delegate tasks',
    description: trim`
      Delegate one or more EXISTING tasks from the conversation's checklist to background
      sub-agents. Select tasks by their checklist ordinal (1-based number) or exact title.
      Each selected task is assigned to an agent; the supervisor spawns one sub-agent per task
      once the task's dependencies are done, and reports each result back to the conversation.
    `,
    icon: 'ph--share-network--regular',
  },
  input: Schema.Struct({
    tasks: Schema.Array(Schema.Union([Schema.Number, Schema.String])).annotate({
      description: 'Tasks to delegate: 1-based checklist ordinals and/or exact titles.',
    }),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service],
});
