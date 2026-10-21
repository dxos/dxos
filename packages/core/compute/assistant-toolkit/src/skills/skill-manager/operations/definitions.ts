//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const QuerySkills = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.querySkills'),
    name: 'Query skills',
    description: 'Queries available skills.',
    icon: 'ph--student--regular',
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

const McpConnection = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  connectorId: Schema.optional(Schema.String),
  enabled: Schema.Boolean.annotate({ description: 'Whether this conversation connects its MCP server.' }),
});

export const QueryMcpConnections = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.queryMcpConnections'),
    name: 'Query MCP connections',
    description:
      "Lists the space's connections and whether this conversation connects each one's MCP server. Connections are on unless the conversation turned them off.",
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Array(McpConnection),
  services: [Database.Service, Harness.HarnessService],
});

export const SetMcpConnection = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.setMcpConnection'),
    name: 'Set MCP connection',
    description:
      "Turns a connection's MCP server on or off for this conversation. Its tools appear or disappear on the next turn.",
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({
    id: Schema.String.annotate({ description: 'The connection id, as listed by the query.' }),
    enabled: Schema.Boolean,
  }),
  output: McpConnection,
  services: [Database.Service, Harness.HarnessService],
});

export const AddMcpConnection = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.addMcpConnection'),
    name: 'Add MCP connection',
    description:
      "Adds an MCP server to the space as a connection, with no credential or with an API key. It is on in this conversation, so its tools appear on the next turn. A server that needs sign-in can't be added this way: ask the user to connect it.",
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({
    url: Schema.String.annotate({
      description: "The server's MCP endpoint.",
      examples: ['https://mcp.example.com/mcp'],
    }),
    name: Schema.optional(Schema.String).annotate({ description: 'Defaults to the URL host.' }),
    protocol: Schema.optional(Schema.Literals(['http', 'sse'])).annotate({
      description: 'Streamable HTTP unless the server only speaks the deprecated SSE transport.',
    }),
    key: Schema.optional(Schema.String).annotate({
      description:
        'An API key the server takes as a Bearer token. It is stored in the space, readable by every member.',
    }),
  }),
  output: Schema.Struct({
    ...McpConnection.fields,
    tools: Schema.optional(Schema.Array(Schema.String)).annotate({ description: 'The tools the server listed.' }),
    problem: Schema.optional(Schema.String).annotate({
      description: 'Why the server could not be reached just now; the connection is still added.',
    }),
  }),
  services: [Database.Service],
});
