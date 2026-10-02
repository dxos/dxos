//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Annotation } from '@dxos/echo';

/** Claude Code's permission modes, which other ACP agents accept by the same ids. */
export const AgentPermissionMode = Schema.Literals(['default', 'acceptEdits', 'auto']);
export type AgentPermissionMode = Schema.Schema.Type<typeof AgentPermissionMode>;

export const DEFAULT_AGENT_PERMISSION_MODE: AgentPermissionMode = 'acceptEdits';

export const Settings = Schema.Struct({
  endpoint: Schema.optional(
    Schema.String.annotate({
      title: 'Build service endpoint',
      description: 'URL of the EDGE build service. Leave empty to use the default.',
    }),
  ),
  agentWorkspace: Schema.optional(
    Schema.String.annotate({
      title: 'Coding agent folder',
      description:
        'Folder on this device that coding agents such as Claude Code work in when a project has no folder of its own.',
    }),
  ),
  /** Repository folder on this device per project id, chosen on the project's overview. */
  agentRepositories: Schema.Record(Schema.String, Schema.String).pipe(
    Annotation.FormInputAnnotation.set(false),
    Schema.optional,
  ),
  agentPermissionMode: Schema.optional(
    AgentPermissionMode.annotate({
      title: 'Coding agent permissions',
      description:
        'How freely coding agents act without asking: default asks before edits and commands, acceptEdits allows file edits, auto lets the agent decide.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
