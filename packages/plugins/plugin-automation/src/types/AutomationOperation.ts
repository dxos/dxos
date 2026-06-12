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

// Resolves a contributed `AutomationCapabilities.Template` by id and runs its `scaffold` (which mints the
// Automation and any auxiliary objects via Database.Service). The returned object is NOT yet added to the
// space tree — callers invoke `SpaceOperation.AddObject` with their own target. Lets React surfaces (the
// companion dropdown) create from a template without running the scaffold Effect directly.
export const CreateAutomationFromTemplate = Operation.make({
  meta: {
    key: makeKey('createAutomationFromTemplate'),
    name: 'Create Automation From Template',
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
    object: Obj.Unknown,
  }),
});
