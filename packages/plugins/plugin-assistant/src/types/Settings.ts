//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { getLiteralValues } from '@dxos/effect';

export const ModelProvider = Schema.Union(
  Schema.Literal('edge').annotations({ title: 'DXOS' }),
  Schema.Literal('ollama').annotations({ title: 'Ollama' }),
  Schema.Literal('lmstudio').annotations({ title: 'LM Studio' }),
);
export type ModelProvider = Schema.Schema.Type<typeof ModelProvider>;
export const ModelProviders = getLiteralValues(ModelProvider);

export const ChatView = Schema.Union(
  Schema.Literal('normal').annotations({ title: 'Normal' }),
  Schema.Literal('summary').annotations({ title: 'Summary' }),
  Schema.Literal('thinking').annotations({ title: 'Thinking' }),
  Schema.Literal('debug').annotations({ title: 'Debug' }),
);
export type ChatView = Schema.Schema.Type<typeof ChatView>;
export const ChatViews = getLiteralValues(ChatView);

export const ModelDefaults = Schema.mutable(
  Schema.Struct({
    edge: Schema.optional(
      Schema.String.annotations({
        title: 'Remote language model',
        description: 'Choose the remote language model used for AI requests.',
      }),
    ),
    ollama: Schema.optional(
      Schema.String.annotations({
        title: 'Ollama language model',
        description: 'Choose the locally hosted Ollama model for AI requests.',
      }),
    ),
    lmstudio: Schema.optional(
      Schema.String.annotations({
        title: 'LM Studio language model',
        description: 'Choose the locally hosted LM Studio model for AI requests.',
      }),
    ),
  }),
);
export type ModelDefaults = Schema.Schema.Type<typeof ModelDefaults>;

export const Settings = Schema.mutable(
  Schema.Struct({
    customPrompts: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Use custom prompts',
        description: 'Allow the assistant to use custom prompts defined in your spaces.',
      }),
    ),
    chatView: Schema.optional(
      ChatView.annotations({
        title: 'Chat view',
        description:
          'Controls which message blocks are shown in the chat: normal hides reasoning, thinking shows reasoning, debug shows raw blocks, summary shows only conversational text.',
      }),
    ),
    modelProvider: Schema.optional(
      ModelProvider.annotations({
        title: 'LLM provider',
        description: 'Select which language model service to use for AI responses.',
      }),
    ),
    modelDefaults: Schema.optional(ModelDefaults),
  }),
);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
