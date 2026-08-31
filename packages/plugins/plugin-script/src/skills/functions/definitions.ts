//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ClientService } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

const FunctionRef = Ref.Ref(Operation.PersistentOperation).annotate({
  description: 'The ID of the function.',
});

const FunctionId = Schema.String.annotate({
  description: 'The ID of the function. Can be passed as the function parameter to other operations.',
});

const FUNCTION_FORMAT = trim`
  IMPORTANT: Every function MUST follow this exact pattern — define an Operation, then export default the handler:

  \`\`\`typescript
  import * as Effect from 'effect/Effect';
  import * as Schema from 'effect/Schema';

  import { Operation } from '@dxos/compute';

  const MyFunction = Operation.make({
    meta: {
      key: DXN.make('com.example.operation.example.myFunction'),
      name: 'My Function',
    },
    input: Schema.Struct({
      city: Schema.String.annotate({ description: 'City name' }),
    }),
    output: Schema.Any,
  });

  export default MyFunction.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ city }) {
        const res = yield* Effect.promise(() =>
          fetch(\`https://wttr.in/\${city}?format=j1\`)
        );
        const data = yield* Effect.promise(() => res.json());
        return data;
      }),
    ),
  );
  \`\`\`

  Key rules:
  - The file MUST have a single \`export default\` of Operation.pipe(Operation.withHandler(...)).
  - Use \`Effect.fn(function* (...) { ... })\` for the handler body.
  - Wrap async calls with \`yield* Effect.promise(() => ...)\`.
  - Do NOT use top-level await; do NOT export named functions; do NOT use module.exports.
`;

const AVAILABLE_PACKAGES = trim`
  Scripts run in an Edge runtime (Cloudflare Workers) with the following pre-bundled packages:

  DXOS SDK:
  - \`@dxos/echo\` — Reactive local-first database: query, filter, and mutate ECHO objects in spaces.
  - \`@dxos/functions\` — Edge function framework: triggers, queues, and function definitions.
  - \`@dxos/ai\` — AI/LLM integration via AiService (access models like Claude, GPT).
  - \`@dxos/schema\` — Schema utilities and built-in DXOS types.
  - \`@dxos/types\` — DXOS type definitions.
  - \`@dxos/operation\` — Define and handle typed operations with input/output schemas.
  - \`@dxos/util\` — General utility functions.
  - \`@dxos/log\` — Structured logging.

  Effect-TS (functional programming toolkit):
  - \`effect\` — Core effect system with sub-modules: Effect, Schema, Stream, Schedule, Array, Record, Option, Either, Match, etc.
  - \`@effect/platform\` — HTTP client (\`HttpClient\`), platform abstractions for making typed API requests.

  Data format parsing & querying:
  - \`jsonata\` — Powerful query and transformation expressions for JSON data (filter, sort, group, aggregate, reshape).
  - \`yaml\` — Parse and stringify YAML documents.
  - \`fast-xml-parser\` — Fast XML parser and builder; convert between XML and JSON.
  - \`papaparse\` — CSV parsing and serialization; stream large files, auto-detect delimiters.

  Text & markup processing:
  - \`turndown\` — HTML to Markdown converter (useful for feeding web content to LLMs).

  HTML/DOM parsing:
  - \`linkedom\` — Lightweight DOM parser for worker environments; parse and query HTML documents.

  Data processing & utilities:
  - \`date-fns\` — Comprehensive date utility library: parsing, formatting, comparison, arithmetic, time zones.

  Other:
  - \`@automerge/automerge\` — CRDT library for conflict-free collaborative data structures.
  - \`chess.js\` — Chess game logic, move generation, and validation.
`;

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.createFunction'),
    name: 'Create',
    description: `Creates a new function with TypeScript source code and adds it to the space. ${FUNCTION_FORMAT} ${AVAILABLE_PACKAGES}`,
    icon: 'ph--code--regular',
  },
  input: Schema.Struct({
    name: Schema.String.annotate({
      description: 'Name of the function.',
    }),
    source: Schema.optional(Schema.String).annotate({
      description: 'TypeScript source code for the function.',
    }),
    templateId: Schema.optional(Schema.String).annotate({
      description: 'ID of a template to use as the initial source.',
    }),
  }),
  output: Schema.Struct({
    function: FunctionId,
  }),
  services: [Database.Service],
});

export const Read = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.read'),
    name: 'Read',
    description: 'Reads the source code and metadata of a function.',
    icon: 'ph--file-text--regular',
  },
  input: Schema.Struct({
    function: FunctionRef,
  }),
  output: Schema.Struct({
    name: Schema.optional(Schema.String),
    source: Schema.String,
    description: Schema.optional(Schema.String),
  }),
  services: [Database.Service],
});

// The edit descriptions feed the script skill's LLM tool definition (and its memoized
// fixtures), so the schema stays local and context-tuned; the apply logic is shared via `Doc.applyEdits`.
const Edit = Schema.Struct({
  oldString: Schema.String.annotate({
    description: 'The text to find in the source.',
  }),
  newString: Schema.String.annotate({
    description: 'The text to replace it with.',
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotate({
    description: 'If true, replaces all occurrences. Defaults to false (first occurrence only).',
  }),
});

export const Update = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.update'),
    name: 'Update',
    description: `Updates the source code or metadata of a function. ${FUNCTION_FORMAT}`,
    icon: 'ph--pencil--regular',
  },
  input: Schema.Struct({
    function: FunctionRef,
    name: Schema.optional(Schema.String).annotate({
      description: 'New name for the function.',
    }),
    description: Schema.optional(Schema.String).annotate({
      description: 'New description for the function.',
    }),
    edits: Schema.optional(Schema.Array(Edit)).annotate({
      description: 'Edits to apply to the source. Each edit finds oldString and replaces it with newString.',
    }),
  }),
  output: Schema.Struct({
    function: FunctionId,
  }),
  services: [Database.Service],
});

export const Delete = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.delete'),
    name: 'Delete',
    description: 'Deletes a function and its source from the space.',
    icon: 'ph--trash--regular',
  },
  input: Schema.Struct({
    function: FunctionRef,
  }),
  output: Schema.Void,
  services: [Database.Service],
});

export const Deploy = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.deploy'),
    name: 'Deploy',
    description: `Deploys a function to the Edge runtime. The function source must follow the required format: a single export default of Operation.pipe(Operation.withHandler(Effect.fn(function* (...) { ... }))). See the Create operation description for a full example.`,
    icon: 'ph--rocket-launch--regular',
  },
  input: Schema.Struct({
    function: FunctionRef,
  }),
  output: Schema.Struct({
    function: FunctionId,
    functionUrl: Schema.optional(Schema.String).annotate({
      description: 'The URL of the deployed function.',
    }),
  }),
  services: [Database.Service, ClientService],
});

export const Invoke = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.invoke'),
    name: 'Invoke',
    description: 'Invokes a deployed Edge function with the given payload.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    function: FunctionRef,
    payload: Schema.optional(Schema.Unknown).annotate({
      description: 'The input payload to pass to the function.',
    }),
  }),
  output: Schema.Struct({
    response: Schema.Unknown.annotate({
      description: 'The response from the function.',
    }),
  }),
  services: [Database.Service, ClientService],
});

const InvocationSpanSchema = Schema.Struct({
  id: Schema.String.annotate({
    description: 'The invocation ID.',
  }),
  timestamp: Schema.Number.annotate({
    description: 'Start time of the invocation (epoch ms).',
  }),
  duration: Schema.Number.annotate({
    description: 'Duration in milliseconds.',
  }),
  outcome: Schema.String.annotate({
    description: 'Invocation outcome: success, failure, or pending.',
  }),
  input: Schema.ObjectKeyword.annotate({
    description: 'The input payload passed to the function.',
  }),
  error: Schema.optional(Schema.ObjectKeyword).annotate({
    description: 'Error details if the invocation failed.',
  }),
});

export const InspectInvocations = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.inspectInvocations'),
    name: 'InspectInvocations',
    description: 'Queries the invocation trace feed for a function, returning its invocation history.',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({
    function: FunctionRef,
    limit: Schema.optional(Schema.Number).annotate({
      description: 'Maximum number of invocations to return. Defaults to 20.',
    }),
  }),
  output: Schema.Struct({
    invocations: Schema.Array(InvocationSpanSchema).annotate({
      description: 'List of invocation spans, most recent first.',
    }),
    total: Schema.Number.annotate({
      description: 'Total number of invocations found.',
    }),
  }),
  services: [Database.Service],
});

const DeployedFunctionSchema = Schema.Struct({
  key: Schema.optional(Schema.String).annotate({
    description: 'Unique key identifying the function. Pass to InstallFunction to install it.',
  }),
  name: Schema.String.annotate({
    description: 'Display name of the function.',
  }),
  version: Schema.String.annotate({
    description: 'Semantic version of the deployed function.',
  }),
  description: Schema.optional(Schema.String).annotate({
    description: 'Description of what the function does.',
  }),
  updated: Schema.optional(Schema.String).annotate({
    description: 'ISO timestamp of the last deployment.',
  }),
});

export const QueryDeployedFunctions = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.queryDeployed'),
    name: 'QueryDeployedFunctions',
    description: 'Lists all functions deployed to the EDGE runtime. Use InstallFunction to add one to the space.',
    icon: 'ph--list--regular',
  },
  input: Schema.Void,
  output: Schema.Struct({
    functions: Schema.Array(DeployedFunctionSchema).annotate({
      description: 'List of deployed functions.',
    }),
  }),
  services: [ClientService],
});

export const InstallFunction = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.install'),
    name: 'InstallFunction',
    description:
      'Installs a deployed EDGE function into the current space by key. The returned function ID can be passed directly to Invoke.',
    icon: 'ph--download--regular',
  },
  input: Schema.Struct({
    key: Schema.String.annotate({
      description: 'The unique key of the deployed function to install (from QueryDeployedFunctions).',
    }),
  }),
  output: Schema.Struct({
    function: FunctionId,
    name: Schema.String.annotate({
      description: 'Name of the installed function.',
    }),
    version: Schema.String.annotate({
      description: 'Version of the installed function.',
    }),
  }),
  services: [ClientService],
});
