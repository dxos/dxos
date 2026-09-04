//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Provider } from '@dxos/ai';
import { SchemaEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { ChatView } from '@dxos/react-ui-assistant/types';

// A provider id is an open DXN (third-party providers define their own), validated as a DXN rather
// than restricted to a closed literal union. The known providers come from the @dxos/ai registry.
export const ModelProvider = DXN.Schema;
export type ModelProvider = DXN.DXN;
export const ModelProviders: readonly DXN.DXN[] = Provider.all.map((provider) => provider.id);

// The view type is the thread's own concern (`@dxos/react-ui-assistant`); only the literal values
// survive here, for the settings UI.
export const ChatViews = SchemaEx.getLiteralValues(ChatView);

export const ModelDefaults = Schema.Struct({
  edge: Schema.optional(
    Schema.String.annotate({
      title: 'Remote language model',
      description: 'Choose the remote language model used for AI requests.',
    }),
  ),
  // `built-in` (bundled sidecar) and `ollama` (external) share the `ollama` model source, so they
  // share this single default key.
  ollama: Schema.optional(
    Schema.String.annotate({
      title: 'Local language model',
      description: 'Choose the locally hosted model used for AI requests.',
    }),
  ),
  lmstudio: Schema.optional(
    Schema.String.annotate({
      title: 'LM Studio language model',
      description: 'Choose the locally hosted LM Studio model for AI requests.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));
export type ModelDefaults = Schema.Schema.Type<typeof ModelDefaults>;

export const Settings = Schema.Struct({
  customPrompts: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Use custom prompts',
      description: 'Allow the assistant to use custom prompts defined in your spaces.',
    }),
  ),
  chatView: Schema.optional(
    ChatView.annotate({
      title: 'Chat view',
      description:
        'Controls which message blocks are shown in the chat: normal hides reasoning, thinking shows reasoning, debug shows raw blocks, summary shows only conversational text.',
    }),
  ),
  modelProvider: Schema.optional(
    ModelProvider.annotate({
      title: 'LLM provider',
      description: 'Select which language model service to use for AI responses.',
    }),
  ),
  modelDefaults: Schema.optional(ModelDefaults.annotate({ title: 'Model defaults' })),
  tracePanelDebug: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Trace panel debug',
      description: 'Show the raw span tree as JSON in the trace panel instead of the commit graph.',
    }),
  ),
  traceProcessEnvironments: Schema.optional(
    Schema.mutable(Schema.Array(Schema.String)).annotate({
      title: 'Trace panel process environments',
      description:
        'Process environments (app, space, conversation) shown in the trace panel. Unset uses the default selection, which hides app-level chatter.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
