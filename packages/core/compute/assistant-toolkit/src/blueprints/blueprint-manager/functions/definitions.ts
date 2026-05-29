//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiContext } from '@dxos/assistant';
import { Blueprint, Operation } from '@dxos/compute';
import { Database, Type } from '@dxos/echo';

export const QueryBlueprints = Operation.make({
  meta: {
    key: 'org.dxos.function.blueprint-manager.query-blueprints',
    name: 'Query blueprints',
    description: 'Queries available blueprints.',
    icon: 'ph--blueprint--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Array(Type.getSchema(Blueprint.Blueprint)),
  services: [Blueprint.RegistryService],
});

export const EnableBlueprints = Operation.make({
  meta: {
    key: 'org.dxos.function.blueprint-manager.enable-blueprints',
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
  services: [Blueprint.RegistryService, Database.Service, AiContext.Service],
});

export const UpdateBlueprints = Operation.make({
  meta: {
    key: 'org.dxos.function.blueprint-manager.refresh-blueprints',
    name: 'Refresh blueprints',
    description:
      'Updates the blueprints saved to the database with the latest version from the registry. Sometimes blueprints in the database can become outdated. Use this function to pull in the latest versions.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Void,
  services: [Blueprint.RegistryService, Database.Service],
});
