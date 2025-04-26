//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { SpaceSchema } from '@dxos/react-client/echo';

import { AUTOMATION_PLUGIN } from './meta';

const TriggerTemplate = S.Union(
  S.Struct({ type: S.Literal('timer'), cron: S.String }),
  S.Struct({ type: S.Literal('queue'), queueDXN: S.Any }),
);

export namespace AutomationAction {
  const AUTOMATION_ACTION = `${AUTOMATION_PLUGIN}/action`;

  export class CreateTriggerFromTemplate extends S.TaggedClass<CreateTriggerFromTemplate>()(
    `${AUTOMATION_ACTION}/create-trigger-from-template`,
    {
      input: S.Struct({
        space: SpaceSchema,
        template: TriggerTemplate,
        enabled: S.optional(S.Boolean),
        // TODO(wittjosiah): Improve how this lookup is done.
        scriptName: S.optional(S.String),
        payload: S.optional(S.Record({ key: S.String, value: S.Any })),
      }),
      output: S.Void,
    },
  ) {}
}
