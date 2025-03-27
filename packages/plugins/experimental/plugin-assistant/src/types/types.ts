//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { AIChatType } from './chat';
import { TemplateType } from './template';
import { ASSISTANT_PLUGIN } from '../meta';

export namespace AssistantAction {
  const ASSISTANT_ACTION = `${ASSISTANT_PLUGIN}/action`;

  export class CreateChat extends S.TaggedClass<CreateChat>()(`${ASSISTANT_ACTION}/create-chat`, {
    input: S.Struct({
      spaceId: S.optional(S.String),
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: AIChatType,
    }),
  }) {}

  export class CreateTemplate extends S.TaggedClass<CreateTemplate>()(`${ASSISTANT_ACTION}/create-template`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: TemplateType,
    }),
  }) {}
}

export const AssistantSettingsSchema = S.mutable(
  S.Struct({
    llmProvider: S.optional(S.Literal('edge', 'ollama')),
    edgeModel: S.optional(S.String),
    ollamaModel: S.optional(S.String),
    customPrompts: S.optional(S.Boolean),
  }),
);

export type AssistantSettingsProps = S.Schema.Type<typeof AssistantSettingsSchema>;
