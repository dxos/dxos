//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService, GenericToolkit } from '@dxos/ai';
import { AiContextService } from '@dxos/assistant';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { QueueService, TracingService, TriggerEvent } from '@dxos/functions';
import { Trace } from '@dxos/functions';
import { Operation, OperationRegistry } from '@dxos/operation';

import { Agent } from '../../../types';

export const AgentWorker = Operation.make({
  meta: {
    key: 'org.dxos.function.agent.worker',
    name: 'Agent Worker',
    description: 'Agentic worker that drives the agent autonomously.',
  },
  input: Schema.Struct({
    agent: Schema.suspend(() => Ref.Ref(Agent.Agent)),
    prompt: Schema.optional(Schema.String),
    event: Schema.optional(TriggerEvent.TriggerEvent),
  }),
  output: Schema.Void,
  services: [
    AiService.AiService,
    Database.Service,
    QueueService,
    Feed.FeedService,
    OperationRegistry.Service,
    // @deprecated TracingService kept for backward compat with tool handlers.
    TracingService,
    Trace.TraceService,
    GenericToolkit.GenericToolkitProvider,
  ],
});

export const Qualifier = Operation.make({
  meta: {
    key: 'org.dxos.function.agent.qualifier',
    name: 'Agent Qualifier',
    description:
      'Qualifier that determines if the event is relevant to the agent. Puts the data into the input queue of the agent.',
  },
  input: Schema.Struct({
    agent: Schema.suspend(() => Ref.Ref(Agent.Agent)),
    event: TriggerEvent.TriggerEvent,
  }),
  output: Schema.Void,
  services: [AiService.AiService, Database.Service],
});

export const GetContext = Operation.make({
  meta: {
    key: 'org.dxos.function.agent.get-context',
    name: 'Get Agent Context',
    description: 'Get the context of an agent.',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    spec: Schema.String,
    plan: Schema.String,
    artifacts: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        type: Schema.optional(Schema.String),
        dxn: Schema.optional(Schema.String),
      }),
    ),
  }),
  services: [AiContextService, Database.Service],
});

export const AddArtifact = Operation.make({
  meta: {
    key: 'org.dxos.function.agent.add-artifact',
    name: 'Add artifact',
    description: 'Adds a new artifact.',
  },
  input: Schema.Struct({
    name: Schema.String.annotations({
      description: 'The name of the artifact to add.',
    }),
    artifact: Ref.Ref(Obj.Unknown).annotations({
      description: 'The artifact to add. Do NOT guess or try to generate the ID.',
    }),
  }),
  output: Schema.Void,
  services: [AiContextService, Database.Service],
});
