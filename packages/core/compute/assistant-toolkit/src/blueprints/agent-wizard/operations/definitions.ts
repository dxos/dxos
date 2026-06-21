//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
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
    blueprints: Schema.Array(Schema.String).annotations({
      description: 'The blueprint keys to use for the agent.',
      examples: [['org.dxos.blueprint.markdown', 'org.dxos.blueprint.database']],
    }),
    subscriptions: Schema.Array(Ref.Ref(Obj.Unknown)).annotations({
      description: 'The objects to subscribe to for the agent. Can be references to mailboxes.',
    }),
  }),
  output: Type.getSchema(Agent.Agent),
  services: [Registry.Service, Database.Service],
});

export const SyncTriggers = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agent.syncTriggers'),
    name: 'Sync triggers',
    description:
      'Synchronizes triggers with the agent: subscriptions, cron, filter-events, and enabled (copied to every trigger). Call after editing those fields.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotations({
      description: 'The agent whose triggers should be synced.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});
