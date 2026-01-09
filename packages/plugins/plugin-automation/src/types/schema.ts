//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import * as Operation from '@dxos/operation';

import { meta } from '../meta';

const TriggerTemplate = Schema.Union(
  Schema.Struct({ type: Schema.Literal('timer'), cron: Schema.String }),
  Schema.Struct({ type: Schema.Literal('queue'), queueDXN: Schema.Any }),
);

export namespace AutomationAction {
  export class CreateTriggerFromTemplate extends Schema.TaggedClass<CreateTriggerFromTemplate>()(
    `${meta.id}/action/create-trigger-from-template`,
    {
      input: Schema.Struct({
        db: Database.Database,
        template: TriggerTemplate,
        enabled: Schema.optional(Schema.Boolean),
        // TODO(wittjosiah): Improve how this lookup is done.
        scriptName: Schema.optional(Schema.String),
        input: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
      }),
      output: Schema.Void,
    },
  ) {}
}

const AUTOMATION_OPERATION = `${meta.id}/operation`;

export namespace AutomationOperation {
  export const CreateTriggerFromTemplate = Operation.make({
    meta: { key: `${AUTOMATION_OPERATION}/create-trigger-from-template`, name: 'Create Trigger From Template' },
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        template: TriggerTemplate,
        enabled: Schema.optional(Schema.Boolean),
        scriptName: Schema.optional(Schema.String),
        input: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
      }),
      output: Schema.Void,
    },
  });
}
