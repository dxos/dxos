//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';

import { meta } from '#meta';

import * as Assistant from './Assistant';
import * as Ollama from './Ollama';

export const Settings = Capability.makeSingleton<Atom.Writable<Assistant.Settings>>(
  `${meta.profile.key}.capability.settings`,
);

export const OllamaManager = Capability.makeSingleton<Ollama.Manager>(`${meta.profile.key}.capability.ollama-manager`);

export const StateSchema = Schema.mutable(
  Schema.Struct({
    /** Map of primary object dxn to current chat dxn. */
    currentChat: Schema.Record({ key: Schema.String, value: Schema.UndefinedOr(Schema.String) }),
    /** Map of chat object path to prompt text to auto-submit when the chat opens. */
    pendingPrompts: Schema.Record({ key: Schema.String, value: Schema.UndefinedOr(Schema.String) }),
  }),
);

export type AssistantState = Schema.Schema.Type<typeof StateSchema>;

export const State = Capability.makeSingleton<Atom.Writable<AssistantState>>(`${meta.profile.key}.capability.state`);

/** Session-scoped cache of transient (not yet persisted) companion chats keyed by companion DXN string. */
export const CompanionChatCache = Capability.makeSingleton<Atom.Writable<Record<string, Obj.Unknown | undefined>>>(
  `${meta.profile.key}.capability.companion-chat-cache`,
);

export const HomeSuggestionsCacheSchema = Schema.mutable(
  Schema.Record({
    key: Schema.String,
    value: Schema.Struct({
      /** Epoch ms timestamp of the successful generation that produced these prompts. */
      generatedAt: Schema.Number,
      /** Non-empty, trimmed prompts from a successful generation. */
      prompts: Schema.Array(Schema.String),
    }),
  }),
);
export type HomeSuggestionsCache = Schema.Schema.Type<typeof HomeSuggestionsCacheSchema>;

/** Per-space cache of LLM-generated home starter prompts, persisted across page reloads. */
export const HomeSuggestionsCache = Capability.makeSingleton<Atom.Writable<HomeSuggestionsCache>>(
  `${meta.profile.key}.capability.home-suggestions-cache`,
);
