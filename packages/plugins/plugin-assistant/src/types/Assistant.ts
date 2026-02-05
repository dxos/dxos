//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Chat as ChatModule } from '@dxos/assistant-toolkit';

import { LLM_PROVIDERS } from './defs';

// Re-export Chat schema for backward compatibility.
export const Chat = ChatModule.Chat;
export type Chat = ChatModule.Chat;

/**
 * Plugin settings.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    llmProvider: Schema.optional(Schema.Literal(...LLM_PROVIDERS)),
    edgeModel: Schema.optional(Schema.String),
    ollamaModel: Schema.optional(Schema.String),
    lmstudioModel: Schema.optional(Schema.String),
    customPrompts: Schema.optional(Schema.Boolean),
  }),
);

export type Settings = Schema.Schema.Type<typeof Settings>;
