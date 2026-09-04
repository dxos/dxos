//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

// Value-side `EID` import keeps TS declaration emit portable — `TriggerTemplate`
// references `EID.Schema` and the inferred `CreateTriggerFromTemplate` type
// otherwise needs a transitive `@dxos/keys` import that's hard for d.ts emit to surface.
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { EID as _EchoURIReference } from '@dxos/keys';

import { TriggerTemplate } from './Routine';
export { _EchoURIReference };

export const CreateTriggerFromTemplate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.routine.createTriggerFromTemplate'),
    name: 'Create Trigger From Template',
    icon: 'ph--lightning--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    template: TriggerTemplate,
    enabled: Schema.optional(Schema.Boolean),
    scriptName: Schema.optional(Schema.String),
    input: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
  }),
  output: Schema.Void,
});

// The single creation entrypoint for every path (create dialog, companion, sidebar) so placement and
// ownership are established in one place. Output mirrors `SpaceCapabilities.CreateObjectResult`.
export const CreateRoutine = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.routine.createAutomation'),
    name: 'Create Routine',
    icon: 'ph--lightning--regular',
  },
  services: [Capability.Service, Plugin.Service],
  input: Schema.Struct({
    db: Database.Database,
    templateId: Schema.String,
    name: Schema.optional(Schema.String),
    subject: Schema.optional(Obj.Unknown),
    /** Values for the template's `inputSchema`. */
    input: Schema.optional(Schema.Unknown),
  }),
  output: Schema.Struct({
    id: Schema.String,
    object: Obj.Unknown,
  }),
});

export const RunPromptInNewChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.routine.runPromptInNewChat'),
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
    instructions: Schema.Union([Schema.String, Ref.Ref(Instructions.Instructions)]),
    /**
     * When true, skips opening the chat: runs the Agent prompt operation against the new chat via the compute runtime (traced).
     */
    background: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Chat.Chat),
  }),
});

// Runs a routine's action now, routed by its first trigger — that is where both the runnable's input
// (e.g. a sync routine's binding cursor) and the `remote` flag live. A `remote` trigger force-runs on the
// EDGE dispatcher over HTTP, since that is the only runtime it is registered on; a local one runs
// in-process. Without the trigger a manual run would invoke an input-taking runnable with nothing, and
// would silently run an edge routine on the client.
export const RunRoutine = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.routine.runAutomation'),
    name: 'Run Routine',
    icon: 'ph--play--regular',
  },
  services: [Capability.Service, Trigger.TriggerMonitorService],
  input: Schema.Struct({
    routine: Ref.Ref(Routine.Routine),
  }),
  output: Schema.Void,
});
