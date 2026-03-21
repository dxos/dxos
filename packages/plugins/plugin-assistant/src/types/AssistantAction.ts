//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { Prompt } from '@dxos/blueprints';
import { SpaceSchema } from '@dxos/client/echo';
import { Collection, Database, Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';

// Operations
const ASSISTANT_OPERATION = `${meta.id}.operation`;

export namespace AssistantOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}.on-create-space`, name: 'On Create Space' },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
      rootCollection: Collection.Collection,
    }),
    output: Schema.Void,
  });

  export const CreateChat = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}.create-chat`, name: 'Create Chat' },
    services: [Capability.Service],
    input: Schema.Struct({
      db: Database.Database,
      name: Schema.optional(Schema.String),
      /** If false, chat is created in-memory only and not added to space. Defaults to true. */
      addToSpace: Schema.optional(Schema.Boolean),
    }),
    output: Schema.Struct({
      object: Chat.Chat,
    }),
  });

  export const UpdateChatName = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}.update-chat-name`, name: 'Update Chat Name' },
    services: [Capability.Service],
    input: Schema.Struct({
      chat: Chat.Chat,
    }),
    output: Schema.Void,
  });

  export const SetCurrentChat = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}.set-current-chat`, name: 'Set Current Chat' },
    services: [Capability.Service],
    input: Schema.Struct({
      companionTo: Obj.Unknown,
      chat: Chat.Chat.pipe(Schema.optional),
    }),
    output: Schema.Void,
  });

  export const RunPromptInNewChat = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}.run-prompt-in-new-chat`, name: 'Run Prompt In New Chat' },
    services: [Capability.Service],
    input: Schema.Struct({
      db: Database.Database,
      /** Context objects to bind to the new chat. */
      objects: Schema.optional(Schema.Array(Obj.Unknown)),
      /** Blueprint keys to look up and bind to the new chat. */
      blueprints: Schema.optional(Schema.Array(Schema.String)),
      /** Raw instructions or an existing Prompt object reference (e.g. from the prompts surface). */
      prompt: Schema.Union(Schema.String, Ref.Ref(Prompt.Prompt)),
      /**
       * When true, skips opening the chat: runs the Agent prompt operation against the new chat via the compute runtime (traced).
       */
      background: Schema.optional(Schema.Boolean),
    }),
    output: Schema.Struct({
      object: Chat.Chat,
    }),
  });

  export const BlueprintForm = Schema.Struct({
    key: Schema.String,
    name: Schema.String,
    description: Schema.optional(Schema.String),
  });
}
