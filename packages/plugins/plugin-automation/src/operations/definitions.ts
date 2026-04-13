//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { meta } from '#meta';

import { TriggerTemplate } from '../types';

const AUTOMATION_OPERATION = `${meta.id}.operation`;

export const CreateTriggerFromTemplate = Operation.make({
  meta: { key: `${AUTOMATION_OPERATION}.create-trigger-from-template`, name: 'Create Trigger From Template' },
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
