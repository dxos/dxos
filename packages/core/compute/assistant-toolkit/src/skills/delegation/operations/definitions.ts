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
      Delegate a unit of work to a sub-agent.
      Promotes the titled checklist item to a durable started task assigned to an agent, so
      the supervisor spawns a background sub-agent. Creates the checklist item if absent.
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
