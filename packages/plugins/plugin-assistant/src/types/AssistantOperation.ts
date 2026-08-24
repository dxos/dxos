//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import { Chat } from '@dxos/assistant-toolkit';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref, Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const CreateChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.createChat'),
    name: 'Create Chat',
    icon: 'ph--chat-text--regular',
  },
  // The chat is returned unfiled, for the caller to add with `SpaceOperation.AddObject` when it wants
  // a durable one. Its feed is added regardless — see the handler.
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    /**
     * Instructions steering the conversation, rendered into the system prompt at request time.
     * Held by reference so the chat follows later edits to them.
     */
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions)),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Chat.Chat),
  }),
});

export const UpdateChatName = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.updateChatName'),
    name: 'Update Chat Name',
    icon: 'ph--pencil--regular',
  },
  services: [Database.Service, AiService.AiService],
  input: Schema.Struct({
    chat: Type.getSchema(Chat.Chat),
    /** Initial user message text; used when the feed has no history yet (e.g. auto-rename on first send). */
    prompt: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const SetCurrentChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.setCurrentChat'),
    name: 'Set Current Chat',
    icon: 'ph--chat-text--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    companionTo: Obj.Unknown,
    chat: Type.getSchema(Chat.Chat).pipe(Schema.optional),
  }),
  output: Schema.Void,
});

export const ForkChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.forkChat'),
    name: 'Fork Chat',
    icon: 'ph--git-branch--regular',
    skipRegistry: true,
  },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    chat: Type.getSchema(Chat.Chat),
    /** When provided, the forked chat is set as the companion for this object rather than opened standalone. */
    companionTo: Schema.optional(Obj.Unknown),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Chat.Chat),
  }),
});

/**
 * Applies every applicable `AssistantCapabilities.SubjectContext` contribution to a chat, binding the
 * subject and whatever else its providers derive from it (annotated skills, a project's instruction
 * objects, ...). Idempotent: `AiContext.Binder.bind` drops refs already in the conversation, so
 * re-running on an existing chat backfills bindings added since it was created.
 */
export const BindChatContext = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.bindChatContext'),
    name: 'Bind Chat Context',
    icon: 'ph--link--regular',
  },
  services: [Capability.Service, Registry.Service],
  input: Schema.Struct({
    chat: Type.getSchema(Chat.Chat),
    /** The object the chat runs against — a companion's primary object, or a chat's originating object. */
    subject: Obj.Unknown,
  }),
  output: Schema.Void,
});

export const EnsureCompanionChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.ensureCompanionChat'),
    name: 'Ensure Companion Chat',
    icon: 'ph--chat-text--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    companionTo: Obj.Unknown,
  }),
  output: Schema.Struct({
    chat: Type.getSchema(Chat.Chat),
    /** Whether the returned chat was already persisted in the space. */
    persisted: Schema.Boolean,
  }),
});

export const SkillForm = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
});

export const GenerateHomeSuggestions = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.generateHomeSuggestions'),
    name: 'Generate Home Suggestions',
    icon: 'ph--sparkle--regular',
    // Internal UI operation — not exposed as an agent tool.
    skipRegistry: true,
  },
  services: [Capability.Service, AiService.AiService],
  input: Schema.Struct({ db: Database.Database }),
  output: Schema.Struct({ prompts: Schema.Array(Schema.String) }),
});

export const SetTracePanelDebug = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.setTracePanelDebug'),
    name: 'Set trace panel debug',
    description: 'Show the trace panel as a raw span tree JSON rather than a commit graph.',
    icon: 'ph--bug--regular',
  },
  services: [Capability.Service],
  // Required: a caller that omitted it used to get a flip, which made the result depend on state the
  // caller had not read — two calls racing would land wherever the interleaving left them.
  input: Schema.Struct({
    state: Schema.Boolean,
  }),
  output: Schema.Boolean,
});
