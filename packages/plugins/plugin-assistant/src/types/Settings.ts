//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Provider } from '@dxos/ai';
import { SchemaEx } from '@dxos/effect';

// A provider id is an open NSID name (third-party providers define their own), so it is stored as a
// string rather than a closed literal union. The known providers come from the @dxos/ai registry.
export const ModelProvider = Schema.String;
export type ModelProvider = string;
export const ModelProviders: readonly string[] = Provider.all.map((provider) => provider.id);

export const ChatView = Schema.Union(
  Schema.Literal('normal').annotations({ title: 'Normal' }),
  Schema.Literal('summary').annotations({ title: 'Summary' }),
  Schema.Literal('thinking').annotations({ title: 'Thinking' }),
  Schema.Literal('debug').annotations({ title: 'Debug' }),
);
export type ChatView = Schema.Schema.Type<typeof ChatView>;
export const ChatViews = SchemaEx.getLiteralValues(ChatView);

export const ModelDefaults = Schema.mutable(
  Schema.Struct({
    edge: Schema.optional(
      Schema.String.annotations({
        title: 'Remote language model',
        description: 'Choose the remote language model used for AI requests.',
      }),
    ),
    // `built-in` (bundled sidecar) and `ollama` (external) share the `ollama` model source, so they
    // share this single default key.
    ollama: Schema.optional(
      Schema.String.annotations({
        title: 'Local language model',
        description: 'Choose the locally hosted model used for AI requests.',
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
    modelDefaults: Schema.optional(ModelDefaults.annotations({ title: 'Model defaults' })),
    tracePanelDebug: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Trace panel debug',
        description: 'Show the raw span tree as JSON in the trace panel instead of the commit graph.',
      }),
    ),
  }),
);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
