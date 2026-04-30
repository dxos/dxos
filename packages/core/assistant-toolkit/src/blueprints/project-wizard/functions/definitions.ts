//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Blueprint } from '@dxos/compute';
import { QueueService } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';

import { Agent } from '../../../types';

export const AgentRules = Operation.make({
  meta: {
    key: 'org.dxos.function.agent-wizard.agent-rules',
    name: 'Agent rules',
    description: 'Gets the rules for creating an agent.',
  },
  input: Schema.Struct({}),
  output: Schema.String,
});

export const CreateAgent = Operation.make({
  meta: {
    key: 'org.dxos.function.agent-wizard.create-agent',
    name: 'Create agent',
    description: 'Creates a new agent.',
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
  output: Agent.Agent,
  services: [Blueprint.RegistryService, Database.Service, QueueService, Feed.FeedService],
});

export const SyncTriggers = Operation.make({
  meta: {
    key: 'org.dxos.function.agent.sync-triggers',
    name: 'Sync triggers',
    description:
      'Synchronizes triggers in the database with the agent subscriptions. Call this after editing the subscriptions array.',
  },
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotations({
      description: 'The agent whose triggers should be synced.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});
