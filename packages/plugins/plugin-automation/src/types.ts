//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SpaceSchema } from '@dxos/react-client/echo';

import { AUTOMATION_PLUGIN } from './meta';

const TriggerTemplate = Schema.Union(
  Schema.Struct({ type: Schema.Literal('timer'), cron: Schema.String }),
  Schema.Struct({ type: Schema.Literal('queue'), queueDXN: Schema.Any }),
);

export namespace AutomationAction {
  const AUTOMATION_ACTION = `${AUTOMATION_PLUGIN}/action`;

  export class CreateTriggerFromTemplate extends Schema.TaggedClass<CreateTriggerFromTemplate>()(
    `${AUTOMATION_ACTION}/create-trigger-from-template`,
    {
      input: Schema.Struct({
        space: SpaceSchema,
        template: TriggerTemplate,
        enabled: Schema.optional(Schema.Boolean),
        // TODO(wittjosiah): Improve how this lookup is done.
        scriptName: Schema.optional(Schema.String),
        payload: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
      }),
      output: Schema.Void,
    },
  ) {}
}
