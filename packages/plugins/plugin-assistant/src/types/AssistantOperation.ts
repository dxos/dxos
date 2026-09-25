//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Ref, Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ContentBlock, Task } from '@dxos/types';

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
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    companionTo: Obj.Unknown,
  }),
  output: Schema.Struct({
    chat: Type.getSchema(Chat.Chat),
    /** Whether the returned chat was already persisted in the space. */
    persisted: Schema.Boolean,
  }),
});

/**
 * Runs `prompt` as a turn on an existing chat, for a caller starting one on the chat's behalf
 * (delegation, a routine) rather than a reader typing it.
 *
 * The session is created with the model the chat's own UI would use — resolved from the assistant
 * settings — because `AgentService` binds the model to the agent process at spawn and tears that
 * process down when a later caller asks for a different one. A turn started on any other model
 * therefore interrupts itself the moment the reader opens the chat.
 */
export const RunPromptInChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.runPromptInChat'),
    name: 'Run Prompt in Chat',
    icon: 'ph--chat-text--regular',
    // An agent already runs inside a session; handing it one that starts another is a footgun.
    skipRegistry: true,
  },
  services: [Capability.Service, Database.Service, AgentService.AgentService],
  input: Schema.Struct({
    chat: Schema.optional(Type.getSchema(Chat.Chat)),
    // The object whose companion chat should run the prompt — the way to name a companion chat that
    // has not been persisted yet, which a caller outside the page (an agent) cannot hold.
    companionTo: Schema.optional(Obj.Unknown),
    prompt: Schema.String,
    /**
     * How the turn is attributed. `synthetic` marks a prompt the system raised on the reader's
     * behalf — a resumed agent must be able to tell one from something a person typed, since only
     * the latter is an instruction it owes an answer to.
     *
     * @default 'user'
     */
    disposition: Schema.optional(ContentBlock.Disposition),
  }),
  output: Schema.Void,
});

/**
 * Records a reader's answer to a question in a task's history and resumes the conversation that
 * asked it.
 *
 * The resume is a synthetic prompt naming the question rather than the answer itself: the answer is
 * already durable in the task's history, and an agent that reads it back there sees the record
 * itself rather than a copy frozen into a message.
 */
export const AnswerQuestion = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.answerQuestion'),
    name: 'Answer Question',
    description: 'Answer a question an agent asked, and resume the conversation that asked it.',
    icon: 'ph--question--regular',
    // The asker is the agent; handing it the tool to answer itself is a footgun.
    skipRegistry: true,
  },
  // Not `Capability.Service`: the resume goes through `RunPromptInChat`, which declares the
  // services it needs itself, so requiring them here too would fail a caller that only records.
  services: [Database.Service, Trace.TraceService],
  input: Schema.Struct({
    task: Type.getSchema(Task.Task),
    /** Id of the question's entry in the task's history. */
    question: Schema.String,
    answer: Schema.String.annotate({ description: "The chosen option's title, or free-form text." }),
  }),
  output: Schema.Struct({
    /**
     * False when the answer was blank, the question is not in the task's history, or it was already
     * answered — nothing was written.
     */
    accepted: Schema.Boolean,
    /**
     * Whether the asking conversation was woken. Separate from `accepted` because the answer is
     * durable either way, and conflating them would show a resumed agent that is still blocked.
     */
    resumed: Schema.Boolean,
  }),
}).pipe(Operation.mutation('write'));

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
  services: [Capability.Service, AiService.AiService, Database.Service],
  input: Schema.Struct({}),
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
