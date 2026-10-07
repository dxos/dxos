//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/** Claude Code's permission modes, which other ACP agents accept by the same ids. */
export const AgentPermissionMode = Schema.Literals(['default', 'acceptEdits', 'auto']);
export type AgentPermissionMode = Schema.Schema.Type<typeof AgentPermissionMode>;

/** The agent judges which actions need a person; Claude Code drops to `acceptEdits` for a model without it. */
export const DEFAULT_AGENT_PERMISSION_MODE: AgentPermissionMode = 'auto';

export const Settings = Schema.Struct({
  endpoint: Schema.optional(
    Schema.String.annotate({
      title: 'Build service endpoint',
      description: 'URL of the EDGE build service. Leave empty to use the default.',
    }),
  ),
  agentPermissionMode: Schema.optional(
    AgentPermissionMode.annotate({
      title: 'Coding agent permissions',
      description:
        'How freely coding agents act without asking: auto (the default) lets the agent decide and asks only for risky actions, acceptEdits allows file edits but asks before commands, default asks before edits and commands.',
    }),
  ).pipe(Schema.withConstructorDefault(Effect.succeed(DEFAULT_AGENT_PERMISSION_MODE))),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
