//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ClientService } from '@dxos/client';
import { Database, Ref } from '@dxos/echo';
import { QueueService, Script } from '@dxos/functions';
import { Operation } from '@dxos/operation';

const ScriptRef = Ref.Ref(Script.Script).annotations({
  description: 'The ID of the script.',
});

export const Create = Operation.make({
  meta: {
    key: 'org.dxos.function.script.create',
    name: 'Create',
    description: 'Creates a new script with TypeScript source code and adds it to the space.',
  },
  input: Schema.Struct({
    name: Schema.String.annotations({
      description: 'Name of the script.',
    }),
    source: Schema.optional(Schema.String).annotations({
      description: 'TypeScript source code for the script.',
    }),
    templateId: Schema.optional(Schema.String).annotations({
      description: 'ID of a template to use as the initial source.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.String.annotations({
      description: 'The DXN of the created script.',
    }),
  }),
  services: [Database.Service],
});

export const Read = Operation.make({
  meta: {
    key: 'org.dxos.function.script.read',
    name: 'Read',
    description: 'Reads the source code and metadata of a script.',
  },
  input: Schema.Struct({
    script: ScriptRef,
  }),
  output: Schema.Struct({
    name: Schema.optional(Schema.String),
    source: Schema.String,
    description: Schema.optional(Schema.String),
  }),
  services: [Database.Service],
});

const Edit = Schema.Struct({
  oldString: Schema.String.annotations({
    description: 'The text to find in the script source.',
  }),
  newString: Schema.String.annotations({
    description: 'The text to replace it with.',
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotations({
    description: 'If true, replaces all occurrences. Defaults to false (first occurrence only).',
  }),
});

export const Update = Operation.make({
  meta: {
    key: 'org.dxos.function.script.update',
    name: 'Update',
    description: 'Updates the source code or metadata of a script.',
  },
  input: Schema.Struct({
    script: ScriptRef,
    name: Schema.optional(Schema.String).annotations({
      description: 'New name for the script.',
    }),
    description: Schema.optional(Schema.String).annotations({
      description: 'New description for the script.',
    }),
    edits: Schema.optional(Schema.Array(Edit)).annotations({
      description: 'Edits to apply to the script source. Each edit finds oldString and replaces it with newString.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.String.annotations({
      description: 'The DXN of the updated script.',
    }),
  }),
  services: [Database.Service],
});

export const Delete = Operation.make({
  meta: {
    key: 'org.dxos.function.script.delete',
    name: 'Delete',
    description: 'Deletes a script from the space.',
  },
  input: Schema.Struct({
    script: ScriptRef,
  }),
  output: Schema.Void,
  services: [Database.Service],
});

export const Deploy = Operation.make({
  meta: {
    key: 'org.dxos.function.script.deploy',
    name: 'Deploy',
    description: 'Deploys a script to the Edge runtime.',
  },
  input: Schema.Struct({
    script: ScriptRef,
  }),
  output: Schema.Struct({
    functionId: Schema.String.annotations({
      description: 'The ID of the deployed function.',
    }),
    functionUrl: Schema.optional(Schema.String).annotations({
      description: 'The URL of the deployed function.',
    }),
  }),
  services: [Database.Service, ClientService],
});

export const Invoke = Operation.make({
  meta: {
    key: 'org.dxos.function.script.invoke',
    name: 'Invoke',
    description: 'Invokes a deployed Edge function with the given payload.',
  },
  input: Schema.Struct({
    script: ScriptRef,
    payload: Schema.optional(Schema.Unknown).annotations({
      description: 'The input payload to pass to the function.',
    }),
  }),
  output: Schema.Struct({
    response: Schema.Unknown.annotations({
      description: 'The response from the function.',
    }),
  }),
  services: [Database.Service, ClientService],
});

const InvocationSpanSchema = Schema.Struct({
  id: Schema.String.annotations({
    description: 'The invocation ID.',
  }),
  timestamp: Schema.Number.annotations({
    description: 'Start time of the invocation (epoch ms).',
  }),
  duration: Schema.Number.annotations({
    description: 'Duration in milliseconds.',
  }),
  outcome: Schema.String.annotations({
    description: 'Invocation outcome: success, failure, or pending.',
  }),
  input: Schema.Object.annotations({
    description: 'The input payload passed to the function.',
  }),
  error: Schema.optional(Schema.Object).annotations({
    description: 'Error details if the invocation failed.',
  }),
});

export const InspectInvocations = Operation.make({
  meta: {
    key: 'org.dxos.function.script.inspect-invocations',
    name: 'InspectInvocations',
    description: 'Queries the invocation trace feed for a deployed script, returning its invocation history.',
  },
  input: Schema.Struct({
    script: ScriptRef,
    limit: Schema.optional(Schema.Number).annotations({
      description: 'Maximum number of invocations to return. Defaults to 20.',
    }),
  }),
  output: Schema.Struct({
    invocations: Schema.Array(InvocationSpanSchema).annotations({
      description: 'List of invocation spans for the script, most recent first.',
    }),
    total: Schema.Number.annotations({
      description: 'Total number of invocations found for this script.',
    }),
  }),
  services: [Database.Service, QueueService],
});

const DeployedFunctionSchema = Schema.Struct({
  key: Schema.optional(Schema.String).annotations({
    description: 'Unique key identifying the function.',
  }),
  name: Schema.String.annotations({
    description: 'Display name of the function.',
  }),
  version: Schema.String.annotations({
    description: 'Semantic version of the deployed function.',
  }),
  description: Schema.optional(Schema.String).annotations({
    description: 'Description of what the function does.',
  }),
  updated: Schema.optional(Schema.String).annotations({
    description: 'ISO timestamp of the last deployment.',
  }),
});

export const QueryDeployedFunctions = Operation.make({
  meta: {
    key: 'org.dxos.function.script.query-deployed',
    name: 'QueryDeployedFunctions',
    description: 'Lists all functions deployed to the EDGE runtime.',
  },
  input: Schema.Void,
  output: Schema.Struct({
    functions: Schema.Array(DeployedFunctionSchema).annotations({
      description: 'List of deployed functions.',
    }),
  }),
  services: [ClientService],
});

export const InstallFunction = Operation.make({
  meta: {
    key: 'org.dxos.function.script.install',
    name: 'InstallFunction',
    description:
      'Installs a deployed EDGE function into the current space by key. Updates the function if it already exists.',
  },
  input: Schema.Struct({
    key: Schema.String.annotations({
      description: 'The unique key of the deployed function to install.',
    }),
  }),
  output: Schema.Struct({
    key: Schema.optional(Schema.String).annotations({
      description: 'Key of the installed function.',
    }),
    name: Schema.String.annotations({
      description: 'Name of the installed function.',
    }),
    version: Schema.String.annotations({
      description: 'Version of the installed function.',
    }),
  }),
  services: [ClientService],
});
