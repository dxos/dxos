//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { LLM_PROVIDERS } from './defs';

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
