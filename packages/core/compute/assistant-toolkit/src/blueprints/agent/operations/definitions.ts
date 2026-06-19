//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import { AiContext } from '@dxos/assistant';
import { Trace, TriggerEvent, Operation } from '@dxos/compute';
import { Database, Ref, Registry } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { Agent } from '../../../types';

export const AgentWorker = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agent.worker'),
    name: 'Agent Worker',
    description: 'Agentic worker that drives the agent autonomously.',
    icon: 'ph--brain--regular',
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
    Registry.Service,
    Trace.TraceService,
    OpaqueToolkit.OpaqueToolkitProvider,
  ],
});

export const Qualifier = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agent.qualifier'),
    name: 'Agent Qualifier',
    description:
      'Qualifier that determines if the event is relevant to the agent. Puts the data into the input queue of the agent.',
    icon: 'ph--funnel--regular',
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
    key: DXN.make('org.dxos.function.agent.getContext'),
    name: 'Get Agent Context',
    description: 'Get the context of an agent.',
    icon: 'ph--info--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    instructions: Schema.String,
    plan: Schema.String,
    artifacts: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        type: Schema.optional(Schema.String),
        dxn: Schema.optional(Schema.String),
      }),
    ),
  }),
  services: [AiContext.Service, Database.Service],
});

export const AddArtifact = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agent.addArtifact'),
    name: 'Add artifact',
    description: 'Adds a new artifact.',
    icon: 'ph--plus--regular',
  },
  input: Schema.Struct({
    name: Schema.String.annotations({
      description: 'The name of the artifact to add.',
    }),
    artifact: Schema.String.annotations({
      description:
        'The id of the artifact to add, exactly as returned by the tool that created it. Do NOT guess or generate the id.',
    }),
  }),
  output: Schema.Void,
  services: [AiContext.Service, Database.Service],
});
