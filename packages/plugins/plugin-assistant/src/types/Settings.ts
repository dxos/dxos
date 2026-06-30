//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Provider } from '@dxos/ai';
import { SchemaEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

// A provider id is an open DXN (third-party providers define their own), validated as a DXN rather
// than restricted to a closed literal union. The known providers come from the @dxos/ai registry.
export const ModelProvider = DXN.Schema;
export type ModelProvider = DXN.DXN;
export const ModelProviders: readonly DXN.DXN[] = Provider.all.map((provider) => provider.id);

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
