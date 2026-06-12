//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, DXN, Obj } from '@dxos/echo';
// Value-side `EID` import keeps TS declaration emit portable — `TriggerTemplate`
// references `EID.Schema` and the inferred `CreateTriggerFromTemplate` type
// otherwise needs a transitive `@dxos/keys` import that's hard for d.ts emit to surface.
import { EID as _EchoURIReference } from '@dxos/keys';

import { meta } from '#meta';

import { TriggerTemplate } from './schema';
export { _EchoURIReference };

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

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

// The single automation-creation entrypoint: resolves a contributed `AutomationCapabilities.Template` by id,
// runs its `scaffold` (which mints the Automation and its owned auxiliary objects — triggers parented to the
// automation — via Database.Service), then adds the automation to the space tree under the dedicated
// (hidden) "Automations" section. Every creation path (the create dialog, the per-object companion, the
// sidebar action) invokes this so placement and ownership are established in exactly one place. Output
// mirrors `SpaceOperation.AddObject` / `SpaceCapabilities.CreateObjectResult` so the create dialog can return
// it directly.
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
