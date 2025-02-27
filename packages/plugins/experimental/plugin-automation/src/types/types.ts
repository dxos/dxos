//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { AIChatType } from './schema';
import { AUTOMATION_PLUGIN } from '../meta';

export namespace AutomationAction {
  const AUTOMATION_ACTION = `${AUTOMATION_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${AUTOMATION_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: AIChatType,
    }),
  }) {}
}
