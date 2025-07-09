//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Sequence } from '@dxos/conductor';
import { SpaceSchema } from '@dxos/react-client/echo';

import { AIChatType } from './chat';
import { ASSISTANT_PLUGIN } from '../meta';

export namespace AssistantAction {
  const ASSISTANT_ACTION = `${ASSISTANT_PLUGIN}/action`;

  export class CreateChat extends Schema.TaggedClass<CreateChat>()(`${ASSISTANT_ACTION}/create-chat`, {
    input: Schema.Struct({
      space: SpaceSchema,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: AIChatType,
    }),
  }) {}

  export class CreateSequence extends Schema.TaggedClass<CreateSequence>()(`${ASSISTANT_ACTION}/create-sequence`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Sequence,
    }),
  }) {}
}

export const LLM_PROVIDERS = ['edge', 'ollama', 'lmstudio'] as const;

export const AssistantSettingsSchema = Schema.mutable(
  Schema.Struct({
    llmProvider: Schema.optional(Schema.Literal(...LLM_PROVIDERS)),
    edgeModel: Schema.optional(Schema.String),
    ollamaModel: Schema.optional(Schema.String),
    lmstudioModel: Schema.optional(Schema.String),
    customPrompts: Schema.optional(Schema.Boolean),
  }),
);

export type AssistantSettingsProps = Schema.Schema.Type<typeof AssistantSettingsSchema>;
