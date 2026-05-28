//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { SpaceSchema } from '@dxos/client/echo';
import { Routine, Operation } from '@dxos/compute';
import { Collection, Database, Feed, Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const ASSISTANT_OPERATION = `${meta.id}.operation`;

export const OnCreateSpace = Operation.make({
  meta: { key: `${ASSISTANT_OPERATION}.on-create-space`, name: 'On Create Space', icon: 'ph--chat-text--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    space: SpaceSchema,
    rootCollection: Type.getSchema(Collection.Collection),
  }),
  output: Schema.Void,
});

export const CreateChat = Operation.make({
  meta: { key: `${ASSISTANT_OPERATION}.create-chat`, name: 'Create Chat', icon: 'ph--chat-text--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    name: Schema.optional(Schema.String),
    /** If false, chat is created in-memory only and not added to space. Defaults to true. */
    addToSpace: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Chat.Chat),
  }),
});

export const UpdateChatName = Operation.make({
  meta: { key: `${ASSISTANT_OPERATION}.update-chat-name`, name: 'Update Chat Name', icon: 'ph--pencil--regular' },
  services: [Database.Service, Feed.FeedService, AiService.AiService],
  input: Schema.Struct({
    chat: Type.getSchema(Chat.Chat),
  }),
  output: Schema.Void,
});

export const SetCurrentChat = Operation.make({
  meta: { key: `${ASSISTANT_OPERATION}.set-current-chat`, name: 'Set Current Chat', icon: 'ph--chat-text--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    companionTo: Obj.Unknown,
    chat: Type.getSchema(Chat.Chat).pipe(Schema.optional),
  }),
  output: Schema.Void,
});

export const RunPromptInNewChat = Operation.make({
  meta: {
    key: `${ASSISTANT_OPERATION}.run-prompt-in-new-chat`,
    name: 'Run Prompt In New Chat',
    icon: 'ph--chat-text--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    /** Context objects to bind to the new chat. */
    objects: Schema.optional(Schema.Array(Obj.Unknown)),
    /** Blueprint keys to look up and bind to the new chat. */
    blueprints: Schema.optional(Schema.Array(Schema.String)),
    /** Raw instructions or an existing Routine object reference. */
    prompt: Schema.Union(Schema.String, Ref.Ref(Routine.Routine)),
    /**
     * When true, skips opening the chat: runs the Agent prompt operation against the new chat via the compute runtime (traced).
     */
    background: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Chat.Chat),
  }),
});

const NavigationTargetSchema = Schema.Struct({
  path: Schema.String.annotations({ description: 'Navigation path to use with the Open operation.' }),
  label: Schema.String.annotations({ description: 'Human-readable label.' }),
  type: Schema.String.annotations({ description: 'Object type.' }),
});

export const ResolveNavigationTargets = Operation.make({
  meta: {
    key: `${ASSISTANT_OPERATION}.resolve-navigation-targets`,
    name: 'Resolve navigation targets',
    description:
      'Resolve navigation targets within the application. The returned paths can be used with the Open operation. Without a query, returns pages that can be navigated to.',
    icon: 'ph--compass--regular',
  },
  input: Schema.Struct({
    query: Schema.optional(
      Schema.Struct({
        dxn: Schema.optional(DXN.Schema),
      }),
    ),
  }),
  output: Schema.Struct({
    targets: Schema.Array(NavigationTargetSchema),
  }),
  services: [Capability.Service],
});

export const ForkChat = Operation.make({
  meta: { key: `${ASSISTANT_OPERATION}.fork-chat`, name: 'Fork Chat', icon: 'ph--git-branch--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    chat: Type.getSchema(Chat.Chat),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Chat.Chat),
  }),
});

export const EnsureCompanionChat = Operation.make({
  meta: {
    key: `${ASSISTANT_OPERATION}.ensure-companion-chat`,
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

export const BlueprintForm = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
});

export const ToggleTracePanelDebug = Operation.make({
  meta: {
    key: `${ASSISTANT_OPERATION}.toggle-trace-panel-debug`,
    name: 'Toggle trace panel debug',
    description: 'Toggle trace panel between commit graph and raw span tree JSON.',
    icon: 'ph--bug--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    state: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Boolean,
});
