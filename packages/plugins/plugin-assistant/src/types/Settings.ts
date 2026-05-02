//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { LLM_PROVIDERS } from './defs';

export const CHAT_VIEW_TYPES = ['normal', 'thinking', 'verbose', 'summary'] as const;
export type ChatViewType = (typeof CHAT_VIEW_TYPES)[number];

export const Settings = Schema.mutable(
  Schema.Struct({
    llmProvider: Schema.optional(Schema.Literal(...LLM_PROVIDERS)),
    edgeModel: Schema.optional(Schema.String),
    ollamaModel: Schema.optional(Schema.String),
    lmstudioModel: Schema.optional(Schema.String),
    customPrompts: Schema.optional(Schema.Boolean),
    chatViewType: Schema.optional(Schema.Literal(...CHAT_VIEW_TYPES)),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
