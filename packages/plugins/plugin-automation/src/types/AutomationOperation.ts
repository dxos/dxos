//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { Operation, Routine } from '@dxos/compute';
import { Database, DXN, Obj, Ref, Type } from '@dxos/echo';
// Value-side `EID` import keeps TS declaration emit portable — `TriggerTemplate`
// references `EID.Schema` and the inferred `CreateTriggerFromTemplate` type
// otherwise needs a transitive `@dxos/keys` import that's hard for d.ts emit to surface.
import { EID as _EchoURIReference } from '@dxos/keys';

import { meta } from '#meta';

import * as Automation from './Automation';
import { TriggerTemplate } from './schema';
export { _EchoURIReference };

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const CreateTriggerFromTemplate = Operation.make({
  meta: {
    key: makeKey('createTriggerFromTemplate'),
    name: 'Create Trigger From Template',
    icon: 'ph--lightning--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    template: TriggerTemplate,
    enabled: Schema.optional(Schema.Boolean),
    scriptName: Schema.optional(Schema.String),
    input: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  }),
  output: Schema.Void,
});

// The single creation entrypoint for every path (create dialog, companion, sidebar) so placement and
// ownership are established in one place. Output mirrors `SpaceCapabilities.CreateObjectResult`.
export const CreateAutomation = Operation.make({
  meta: {
    key: makeKey('createAutomation'),
    name: 'Create Automation',
    icon: 'ph--lightning--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    templateId: Schema.String,
    name: Schema.optional(Schema.String),
    subject: Schema.optional(Obj.Unknown),
  }),
  output: Schema.Struct({
    id: Schema.String,
    subject: Schema.Array(Schema.String),
    object: Obj.Unknown,
  }),
});

export const RunPromptInNewChat = Operation.make({
  meta: {
    key: makeKey('runPromptInNewChat'),
    name: 'Run Prompt In New Chat',
    icon: 'ph--chat-text--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    /** Context objects to bind to the new chat. */
    objects: Schema.optional(Schema.Array(Obj.Unknown)),
    /** Skill keys to look up and bind to the new chat. */
    skills: Schema.optional(Schema.Array(Schema.String)),
    /** Raw instructions or an existing Routine object reference. */
    prompt: Schema.Union(Schema.String, Ref.Ref(Routine.Routine)),
    /**
     * When true, skips opening the chat: runs the Agent prompt operation against the new chat via the compute runtime (traced).
     */
    background: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Chat.Chat),
  }),
});

// Runs an automation's `runnable` directly (bypassing its triggers). The runnable receives no input;
// the trigger-driven path is what supplies event-mapped input, so manual runs target runnables that
// need none.
export const RunAutomation = Operation.make({
  meta: {
    key: makeKey('runAutomation'),
    name: 'Run Automation',
    icon: 'ph--play--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    automation: Ref.Ref(Automation.Automation),
  }),
  output: Schema.Void,
});
