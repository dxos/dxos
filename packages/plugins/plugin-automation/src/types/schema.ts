//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SpaceSchema } from '@dxos/react-client/echo';

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
        space: SpaceSchema,
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
