//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { meta } from '#meta';

import { TriggerTemplate } from './schema';

const AUTOMATION_OPERATION = `${meta.id}.operation`;

export const CreateTriggerFromTemplate = Operation.make({
  meta: { key: `${AUTOMATION_OPERATION}.create-trigger-from-template`, name: 'Create Trigger From Template', icon: 'ph--lightning--regular' },
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
