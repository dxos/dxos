//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref, Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { Agent } from '../../../types';

export const AgentRules = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agentWizard.agentRules'),
    name: 'Agent rules',
    description: 'Gets the rules for creating an agent.',
    icon: 'ph--book-open--regular',
  },
  input: Schema.Struct({}),
  output: Schema.String,
});

export const CreateAgent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agentWizard.createAgent'),
    name: 'Create agent',
    description: 'Creates a new agent.',
    icon: 'ph--brain--regular',
  },
  input: Schema.Struct({
    name: Schema.String.annotations({
      description: 'The name of the agent to create.',
    }),
    instructions: Schema.String.annotations({
      description:
        'The goal of the agent. Be specific but not too verbose. The agent will use this as a core objective and set of rules to follow.',
    }),
    skills: Schema.Array(Schema.String).annotations({
      description: 'The skill keys to use for the agent.',
      examples: [['org.dxos.skill.markdown', 'org.dxos.skill.database']],
    }),
    subscriptions: Schema.Array(Ref.Ref(Obj.Unknown)).annotations({
      description: 'The objects to subscribe to for the agent. Can be references to mailboxes.',
    }),
  }),
  output: Type.getSchema(Agent.Agent),
  services: [Registry.Service, Database.Service],
});

export const SyncAutomation = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agent.syncTriggers'),
    name: 'Sync automation',
    description:
      'Compiles the agent automation config (subscriptions, optional cron) into Routines that relay events onto the agent session. Recreates everything, so call with the FULL desired config after any change; enabled is copied from the agent onto every trigger.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotations({
      description: 'The agent whose automation should be synced.',
    }),
    subscriptions: Schema.optional(
      Schema.Array(Ref.Ref(Obj.Unknown)).annotations({
        description: 'The objects to subscribe to (e.g. mailboxes); each compiles to a feed-triggered routine.',
      }),
    ),
    cron: Schema.optional(
      Schema.String.annotations({
        description: 'Cron expression for a scheduled wake routine.',
      }),
    ),
    qualify: Schema.optional(
      Schema.Boolean.annotations({
        description: 'Run the cheap-model relevance filter on subscription events (default true).',
      }),
    ),
  }),
  output: Schema.Void,
  services: [Database.Service],
});
