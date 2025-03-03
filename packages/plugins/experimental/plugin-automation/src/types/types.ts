//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { AIChatType } from './schema';
import { AUTOMATION_PLUGIN } from '../meta';

export namespace AutomationAction {
  const AUTOMATION_ACTION = `${AUTOMATION_PLUGIN}/action`;

  export class CreateChat extends S.TaggedClass<CreateChat>()(`${AUTOMATION_ACTION}/create-chat`, {
    input: S.Struct({
      name: S.optional(S.String),
      queue: S.optional(S.String),
    }),
    output: S.Struct({
      object: AIChatType,
    }),
  }) {}
}
