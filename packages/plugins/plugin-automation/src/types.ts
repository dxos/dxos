//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';
// import {
//   FunctionType,
//   FunctionTriggerSchema,
//   type FunctionTriggerType,
//   type FunctionTrigger,
//   ScriptType,
//   TriggerKind,
// } from '@dxos/functions/types';

import { AUTOMATION_PLUGIN } from './meta';

const TriggerTemplate = S.Union(
  // TODO(ZaymonFC): Currently this is quite specific. Generalise?
  S.Struct({ type: S.Literal('gmail-sync'), mailboxId: S.String }),
  S.Struct({ type: S.Literal('queue'), queueDXN: S.Any }),
);

export namespace AutomationAction {
  const AUTOMATION_ACTION = `${AUTOMATION_PLUGIN}/action`;

  export class CreateTriggerFromTemplate extends S.TaggedClass<CreateTriggerFromTemplate>()(
    `${AUTOMATION_ACTION}/create-trigger-from-template`,
    {
      input: S.Struct({ template: TriggerTemplate }),
      output: S.Void,
    },
  ) {}
}
