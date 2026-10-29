//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import type * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import type { AgentProcessDefinition, MakeTurnProducer } from '@dxos/agent-runtime';
import * as Capability from '@dxos/app-framework/Capability';
import type { AiContext } from '@dxos/assistant';
import type * as SlashCommand from '@dxos/assistant-toolkit/SlashCommand';
import type * as Chat from '@dxos/assistant/Chat';
import type * as Instructions from '@dxos/compute/Instructions';
import { type Database, type Obj, type Ref, type Registry } from '@dxos/echo';
import { type Message } from '@dxos/types';

import { AssistantNamespace } from '../namespace.ts';
import * as Assistant from './Assistant.ts';
import * as Ollama from './Ollama.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<Assistant.Settings>>()(
  `${AssistantNamespace.key}.capability.settings`,
);

export const OllamaManager = Capability.makeSingleton<Ollama.Manager>()(
  `${AssistantNamespace.key}.capability.ollamaManager`,
);

export const StateSchema = Schema.Struct({
  /** Map of primary object dxn to current chat dxn. */
  currentChat: Schema.Record(Schema.String, Schema.UndefinedOr(Schema.String)),
  /** Map of chat object path to prompt text to auto-submit when the chat opens. */
  pendingPrompts: Schema.Record(Schema.String, Schema.UndefinedOr(Schema.String)),
}).mapFields(Struct.map(Schema.mutableKey));

export type AssistantState = Schema.Schema.Type<typeof StateSchema>;

export const State = Capability.makeSingleton<Atom.Writable<AssistantState>>()(
  `${AssistantNamespace.key}.capability.state`,
);

/** Session-scoped cache of transient (not yet persisted) companion chats keyed by companion DXN string. */
export const CompanionChatCache = Capability.makeSingleton<Atom.Writable<Record<string, Obj.Unknown | undefined>>>()(
  `${AssistantNamespace.key}.capability.companionChatCache`,
);

export const HomeSuggestionsCacheSchema = Schema.Record(
  Schema.String,
  Schema.mutableKey(
    Schema.Struct({
      /** Epoch ms timestamp of the successful generation that produced these prompts. */
      generatedAt: Schema.Number,
      /** Non-empty, trimmed prompts from a successful generation. */
      prompts: Schema.Array(Schema.String),
      /** The recent objects the prompts were generated from; an unchanged set reuses them. */
      fingerprint: Schema.optional(Schema.String),
    }),
  ),
);
export type HomeSuggestionsCache = Schema.Schema.Type<typeof HomeSuggestionsCacheSchema>;

/** Per-space cache of LLM-generated home starter prompts, persisted across page reloads. */
export const HomeSuggestionsCache = Capability.makeSingleton<Atom.Writable<HomeSuggestionsCache>>()(
  `${AssistantNamespace.key}.capability.homeSuggestionsCache`,
);

/**
 * Optional engine for producing a conversation turn. When contributed, the agent process runs turns
 * through it instead of DXOS's own `AiSession` - e.g. a Claude Agent SDK host - while keeping its
 * queue, alarms, redelivery, delegation and hydration.
 *
 * A registry rather than a singleton, for the same reason as `AgentDelegationStrategy`: a harness
 * has to be able to contribute one before the app's own module activates without colliding.
 */
export const AgentTurnProducer = Capability.make<MakeTurnProducer>()(
  'org.dxos.plugin.assistant.capability.agentTurnProducer',
);

/**
 * Present when the host supplied `codeModeTurnProducer`, since without it code mode never runs whatever
 * `Settings.disableCodeMode` says.
 */
export const CodeModeAvailable = Capability.make<true>()(`${AssistantNamespace.key}.capability.codeModeAvailable`);

/**
 * Whether an agent can run on this device; one that cannot is still listed, with the reason as a
 * short lowercase phrase shown after its name.
 */
export type AgentAvailability = { readonly available: true } | { readonly available: false; readonly reason: string };

/** Where an agent's loop runs: in this client, or on EDGE. */
export type AgentLocation = 'local' | 'edge';

/** A person's answer to a request block an agent added to a chat. */
export type AgentResponse = {
  chat: Chat.Chat;
  /** The message holding the request block. */
  message: Message.Message;
  requestId: string;
  optionId: string;
};

/** A setting an `ownModel` agent lets each chat choose, by the `chat.session` field that keeps the choice. */
export type AgentSetting = 'agentModel' | 'agentEffort' | 'agentMode';

/** One value an agent offers for an {@link AgentSetting}. */
export type AgentChoice = { readonly id: string; readonly label: string };

/** The values an agent offers for each setting it lets a chat choose; a chat that chooses none gets the agent's default. */
export type AgentChoices = Partial<Record<AgentSetting, readonly AgentChoice[]>>;

/**
 * An agent a chat can run on, keyed by `chat.session.harness`. Each plugin registers the agents it
 * provides; this plugin registers Composer's own loop as `composer`.
 */
export type Agent = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  /**
   * Where this registration runs the agent. Absent => this device only. A registration listing both runs
   * wherever the chat asks (`chat.remote`); one listing a single location runs only there.
   */
  readonly locations?: readonly AgentLocation[];
  /**
   * The id of the agent this registration is a variant of: the same agent run somewhere else by another
   * runtime. Pickers show the two as one agent, with "runs on" choosing between them.
   */
  readonly variantOf?: string;
  /** The agent chooses its own model, so the chat's model does not apply and pickers offer none. */
  readonly ownModel?: boolean;
  /** What an `ownModel` agent lets a chat choose (its model, effort, permissions), offered by pickers. */
  readonly choices?: AgentChoices;
  readonly availability: Atom.Atom<AgentAvailability>;
  readonly makeTurnProducer: MakeTurnProducer;
  /** Hands a person's answer to the agent; false when nothing is waiting on that request. */
  readonly respond?: (response: AgentResponse) => Effect.Effect<boolean, never, Database.Service>;
};

export const Agent = Capability.make<Agent>()(`${AssistantNamespace.key}.capability.agent`);

/**
 * A durable process a chat can run on in place of the assistant's own agent process, named by its
 * key in `chat.session.process`. The agent service spawns it for such a chat; a chat that names
 * none runs on the assistant's.
 */
export const AgentProcess = Capability.make<AgentProcessDefinition>()(
  `${AssistantNamespace.key}.capability.agentProcess`,
);

/**
 * Slash commands the chat prompt completes and runs without the model. Each plugin contributes the
 * commands for its own verbs; skills are offered as commands beside them.
 */
export const SlashCommands = Capability.make<readonly SlashCommand.SlashCommand[]>()(
  `${AssistantNamespace.key}.capability.slashCommands`,
);

/** Context a chat receives when it runs against a subject object. */
export type SubjectBindings = AiContext.BindingProps & {
  /** Applied to `chat.instructions` only when the chat has none; reaches the model via the system prompt. */
  instructions?: Ref.Ref<Instructions.Instructions>;
};

/**
 * Bindings contributed for a chat opened against a subject object - the object a companion chat is
 * attached to, or the object a chat was created for.
 *
 * Every contribution whose `appliesTo` accepts the subject runs and the results are merged, so a
 * type-specific provider adds to the default rather than replacing it. Invoked by
 * `AssistantOperation.BindChatContext`, which provides `Database.Service` for the subject's space and
 * declares `Registry.Service` for skills resolved out of the hypergraph registry.
 */
export type SubjectContext = {
  /** Whether this provider applies to the subject. Absent => applies to every subject. */
  appliesTo?: (subject: Obj.Unknown) => boolean;
  getBindings: (params: {
    subject: Obj.Unknown;
    chat: Chat.Chat;
  }) => Effect.Effect<SubjectBindings, Error, Database.Service | Registry.Service>;
};

export const SubjectContext = Capability.make<SubjectContext>()(`${AssistantNamespace.key}.capability.subjectContext`);
