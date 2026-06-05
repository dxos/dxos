//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiContext } from '@dxos/assistant';
import { Blueprint, Operation } from '@dxos/compute';
import { Database, Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const QueryBlueprints = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.blueprintManager.queryBlueprints'),
    name: 'Query blueprints',
    description: 'Queries available blueprints.',
    icon: 'ph--blueprint--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Array(Type.getSchema(Blueprint.Blueprint)),
  services: [Registry.Service],
});

export const EnableBlueprints = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.blueprintManager.enableBlueprints'),
    name: 'Enable blueprints',
    description:
      'Enables blueprints in the current conversation by their keys. Only blueprints with agentCanEnable=true can be enabled. Always call [query-blueprints] first to discover available blueprint keys.',
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({
    keys: Schema.Array(Schema.String).annotations({
      description: 'The keys of the blueprints to enable.',
      examples: [['org.dxos.blueprint.memory', 'org.dxos.blueprint.database']],
    }),
  }),
  output: Schema.Struct({
    enabled: Schema.Array(Type.getSchema(Blueprint.Blueprint)),
    rejected: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        reason: Schema.String,
      }),
    ),
  }),
  services: [Registry.Service, Database.Service, AiContext.Service],
});
