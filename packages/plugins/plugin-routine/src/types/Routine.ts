//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';

import { RoutineNamespace } from '../namespace.ts';

export const TriggerTemplate = Schema.Union([
  Schema.Struct({ type: Schema.Literal('timer'), cron: Schema.String }),
  Schema.Struct({ type: Schema.Literal('feed'), feed: Schema.Any }),
]);

export namespace AutomationAction {
  export class CreateTriggerFromTemplate extends Schema.TaggedClass<CreateTriggerFromTemplate>()(
    `${RoutineNamespace.key}.action.create-trigger-from-template`,
    {
      input: Schema.Struct({
        db: Database.Database,
        template: TriggerTemplate,
        enabled: Schema.optional(Schema.Boolean),
        // TODO(wittjosiah): Improve how this lookup is done.
        scriptName: Schema.optional(Schema.String),
        input: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
      }),
      output: Schema.Void,
    },
  ) {}
}
