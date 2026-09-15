//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { AgentService } from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { Database, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const Relay = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.relay'),
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

export const GetContext = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.getContext'),
    name: 'Get Agent Context',
    description: 'Get the context of an agent.',
    icon: 'ph--info--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    instructions: Schema.String,
    checklist: Schema.String,
  }),
  services: [Harness.HarnessService, Database.Service],
});

export const SyncAutomation = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.syncTriggers'),
    name: 'Sync automation',
    description:
      'Compiles the agent automation config (subscriptions, optional cron) into Routines that relay events onto the agent session. Recreates everything, so call with the FULL desired config after any change; enabled is copied from the agent onto every trigger.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    agent: Schema.suspend(() => Ref.Ref(Agent.Agent)).annotate({
      description: 'The agent whose automation should be synced.',
    }),
    subscriptions: Schema.optional(
      Schema.Array(Ref.Ref(Obj.Unknown)).annotate({
        description: 'The objects to subscribe to (e.g. mailboxes); each compiles to a feed-triggered routine.',
      }),
    ),
    cron: Schema.optional(
      Schema.String.annotate({
        description: 'Cron expression for a scheduled wake routine.',
      }),
    ),
    qualify: Schema.optional(
      Schema.Boolean.annotate({
        description: 'Run the cheap-model relevance filter on subscription events (default true).',
      }),
    ),
  }),
  output: Schema.Void,
  services: [Database.Service],
});
