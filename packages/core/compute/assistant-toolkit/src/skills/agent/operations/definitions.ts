//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import { Operation, Trace, TriggerEvent } from '@dxos/compute';
import { AgentService } from '@dxos/compute/AgentService';
import { Database, Ref, Registry } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { Agent, Chat } from '../../../types';

/** @deprecated Replaced by {@link Relay} + the durable session (PLAN.md phase C); deleted with phase D. */
export const AgentWorker = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agent.worker'),
    name: 'Agent Worker',
    description: 'Agentic worker that drives the agent autonomously.',
    icon: 'ph--brain--regular',
  },
  input: Schema.Struct({
    agent: Schema.suspend(() => Ref.Ref(Agent.Agent)),
    /** The chat to run in (phase-B inversion); falls back to the legacy `agent.chat` when absent. */
    chat: Schema.optional(Schema.suspend(() => Ref.Ref(Chat.Chat))),
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

export const Relay = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agent.relay'),
    name: 'Agent Relay',
    description: 'Qualifies a subscription event with a cheap model and forwards it onto the durable agent session.',
    icon: 'ph--funnel--regular',
  },
  input: Schema.Struct({
    /** The chat whose durable session receives the event (carries feed, instructions, and agent). */
    chat: Schema.suspend(() => Ref.Ref(Chat.Chat)),
    event: Schema.optional(TriggerEvent.TriggerEvent),
    /** Synthetic wake prompt (e.g. a cron tick) delivered instead of an event payload. */
    prompt: Schema.optional(Schema.String),
    /** Skip the cheap-model relevance check (default: qualify when an event is present). */
    qualify: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
  services: [AiService.AiService, Database.Service, AgentService],
});

/** @deprecated Replaced by {@link Relay} (plugin-projects PLAN.md phase C); deleted with phase D. */
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
    /** The chat whose plan contextualizes qualification (phase-B inversion); falls back to `agent.chat`. */
    chat: Schema.optional(Schema.suspend(() => Ref.Ref(Chat.Chat))),
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
  services: [Harness.HarnessService, Database.Service],
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
  services: [Harness.HarnessService, Database.Service],
});
