//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import * as McpServer from '@dxos/compute/McpServer';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const QuerySkills = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.querySkills'),
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
    key: DXN.make('org.dxos.operation.assistantToolkit.enableSkills'),
    name: 'Enable skills',
    description:
      'Enables skills in the current conversation by their keys. Only skills with agentCanEnable=true can be enabled. The available keys are already listed in the system prompt, so call this directly rather than querying first.',
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({
    keys: Schema.Array(Schema.String).annotate({
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

export const ConnectMcpServer = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.connectMcpServer'),
    name: 'Connect MCP server',
    description:
      "Connects an MCP server to a skill: checks the server answers and lists its tools, then saves it in the skill's mcpServers (replacing any entry with the same url) and enables the skill in this conversation. The server's tools become callable on your next tool-calling step of this same run. Fails with the server's error, without saving, when the server cannot be reached.",
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({
    skill: Schema.String.annotate({
      description: 'The key of the skill that carries the server (a skill in this space or the registry).',
      examples: ['org.dxos.skill.weatherMcp'],
    }),
    server: McpServer.Spec,
  }),
  output: Schema.Struct({
    skill: Type.getSchema(Skill.Skill),
    tools: Schema.Array(Schema.String).annotate({
      description: 'The tools the server provides, callable from the next tool-calling step.',
    }),
  }),
  services: [Registry.Service, Database.Service, Harness.HarnessService],
});
