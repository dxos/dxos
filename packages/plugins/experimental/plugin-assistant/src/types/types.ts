//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { AIChatType } from './chat';
import { TemplateType } from './template';
import { ASSISTANT_PLUGIN } from '../meta';

export namespace AutomationAction {
  const AUTOMATION_ACTION = `${ASSISTANT_PLUGIN}/action`;

  export class CreateChat extends S.TaggedClass<CreateChat>()(`${AUTOMATION_ACTION}/create-chat`, {
    input: S.Struct({
      spaceId: S.optional(S.String),
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: AIChatType,
    }),
  }) {}

  export class CreateTemplate extends S.TaggedClass<CreateTemplate>()(`${AUTOMATION_ACTION}/create-template`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: TemplateType,
    }),
  }) {}
}

export const AutomationSettingsSchema = S.mutable(
  S.Struct({
    llmModel: S.optional(S.String),
    customPrompts: S.optional(S.Boolean),
  }),
);

export type AutomationSettingsProps = S.Schema.Type<typeof AutomationSettingsSchema>;
