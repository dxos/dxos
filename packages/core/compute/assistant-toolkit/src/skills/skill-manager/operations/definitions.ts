//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import { Skill, Operation } from '@dxos/compute';
import { Database, Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const QuerySkills = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.skillManager.querySkills'),
    name: 'Query skills',
    description: 'Queries available skills.',
    icon: 'ph--blueprint--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Array(Type.getSchema(Skill.Skill)),
  services: [Registry.Service],
});

export const EnableSkills = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.skillManager.enableSkills'),
    name: 'Enable skills',
    description:
      'Enables skills in the current conversation by their keys. Only skills with agentCanEnable=true can be enabled. Always call [query-skills] first to discover available skill keys.',
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({
    keys: Schema.Array(Schema.String).annotations({
      description: 'The keys of the skills to enable.',
      examples: [['org.dxos.skill.memory', 'org.dxos.skill.database']],
    }),
  }),
  output: Schema.Struct({
    enabled: Schema.Array(Type.getSchema(Skill.Skill)),
    rejected: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        reason: Schema.String,
      }),
    ),
  }),
  services: [Registry.Service, Database.Service, Harness.HarnessService],
});
