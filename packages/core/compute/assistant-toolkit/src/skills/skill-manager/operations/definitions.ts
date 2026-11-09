//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

/** An operation of a skill, as the lookups below describe it. */
const ListedOperation = Schema.Struct({
  key: Schema.String.annotate({ description: 'The operation key.' }),
  tool: Schema.String.annotate({ description: 'Its tool name.' }),
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  skill: Schema.String.annotate({ description: 'Key of the skill that provides it.' }),
  enabled: Schema.Boolean.annotate({
    description: 'Whether its skill is enabled in this conversation, so it can be used now.',
  }),
  input: Schema.optional(Schema.String).annotate({
    description: 'Its input, e.g. `{ title: string, owner?: Ref<org.dxos.type.person> }`; given when looked up by key.',
  }),
});

export interface ListedOperation extends Schema.Schema.Type<typeof ListedOperation> {}

/** A skill, as `query-skills` describes it. */
const ListedSkill = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  enabled: Schema.Boolean.annotate({ description: 'Whether the skill is enabled in this conversation.' }),
  agentCanEnable: Schema.Boolean.annotate({ description: 'Whether `enable-skills` may enable it.' }),
  instructions: Schema.optional(Schema.String).annotate({
    description: "The skill's instructions; given when looked up by key.",
  }),
  operations: Schema.optional(Schema.Array(ListedOperation)).annotate({
    description: 'Its operations; given when looked up by key.',
  }),
});

export interface ListedSkill extends Schema.Schema.Type<typeof ListedSkill> {}

/** A registered type, as `query-types` describes it. */
const ListedType = Schema.Struct({
  typename: Schema.String,
  dxn: Schema.String.annotate({ description: 'The versioned DXN the type resolves by.' }),
  kind: Schema.Literals(['object', 'relation']),
  fields: Schema.optional(Schema.String).annotate({ description: 'Its fields; given when looked up by typename.' }),
});

export interface ListedType extends Schema.Schema.Type<typeof ListedType> {}

export const QuerySkills = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.querySkills'),
    name: 'Query skills',
    description:
      'Queries available skills, each saying whether it is enabled here and whether you may enable it. ' +
      'Pass `query` to find the skill that provides a tool you lack: the words are matched against skill names, ' +
      'descriptions and tool names, best match first. Pass `keys` to get those skills in full: their instructions ' +
      'and operations.',
    icon: 'ph--student--regular',
  },
  input: Schema.Struct({
    query: Schema.optional(Schema.String).annotate({
      description: 'Words describing the tool or capability you need, e.g. "link task to feature".',
    }),
    keys: Schema.optional(Schema.Array(Schema.String)).annotate({ description: 'Skills to return in full.' }),
  }),
  output: Schema.Array(ListedSkill),
  services: [Registry.Service, Harness.HarnessService],
});

export const QueryOperations = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.queryOperations'),
    name: 'Query operations',
    description:
      'Searches the operations of the skills you can use (enabled here, or ones you may enable) by what they do; ' +
      "`skill` narrows to one skill's. Pass `keys` to get each in full, with its input.",
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({
    query: Schema.optional(Schema.String).annotate({ description: 'Words describing what the operation does.' }),
    skill: Schema.optional(Schema.String).annotate({ description: "Only this skill's operations." }),
    keys: Schema.optional(Schema.Array(Schema.String)).annotate({ description: 'Operations to return in full.' }),
  }),
  output: Schema.Array(ListedOperation),
  services: [Registry.Service, Harness.HarnessService],
});

export const QueryTypes = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.queryTypes'),
    name: 'Query types',
    description: 'Searches the registered object and relation types. Pass `typenames` to get their fields.',
    icon: 'ph--shapes--regular',
  },
  input: Schema.Struct({
    query: Schema.optional(Schema.String).annotate({ description: 'Words in the type or field names.' }),
    typenames: Schema.optional(Schema.Array(Schema.String)).annotate({
      description: 'Types to return with their fields, by typename or DXN.',
    }),
  }),
  output: Schema.Array(ListedType),
  services: [Database.Service],
});

export const EnableSkills = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.enableSkills'),
    name: 'Enable skills',
    description:
      'Enables skills in the current conversation by their keys, as query-skills lists them. Only skills with ' +
      'agentCanEnable=true can be enabled.',
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
  id: Schema.String.annotate({ description: "The connection's id, or a built-in server's key." }),
  name: Schema.optional(Schema.String),
  connectorId: Schema.optional(Schema.String),
  enabled: Schema.Boolean.annotate({ description: 'Whether this conversation connects its MCP server.' }),
  builtin: Schema.optional(Schema.Boolean).annotate({
    description: 'A server Composer ships rather than a connection the space holds; off until turned on.',
  }),
});

export const QueryMcpConnections = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.queryMcpConnections'),
    name: 'Query MCP connections',
    description:
      "Lists the MCP servers this conversation can connect and whether each is on: the space's connections, on unless the conversation turned them off, and the built-in servers Composer ships (such as Browser), off until turned on. A connection is not a skill: a skill whose tools come from one needs both.",
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Array(McpConnection),
  services: [Database.Service, Registry.Service, Harness.HarnessService],
});

export const SetMcpConnection = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.setMcpConnection'),
    name: 'Set MCP connection',
    description:
      "Turns a connection's MCP server on or off for this conversation; enabling a skill does not do this. Its tools appear or disappear from your next step, so keep going in this response.",
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({
    id: Schema.String.annotate({
      description: "The connection's id or the built-in server's key, as the query lists it.",
    }),
    enabled: Schema.Boolean,
  }),
  output: McpConnection,
  services: [Database.Service, Registry.Service, Harness.HarnessService],
});

export const AddMcpConnection = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.addMcpConnection'),
    name: 'Add MCP connection',
    description:
      "Adds an MCP server to the space as a connection, with no credential or with an API key, or updates the connection the space already has for it. It is on in this conversation, so its tools are available from your next step. A server that needs sign-in can't be added this way: ask the user to connect it.",
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
  services: [Database.Service, Harness.HarnessService],
});
