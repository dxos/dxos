//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { SpaceSchema } from '@dxos/client/echo';
import { Database, Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

// Operations
const ASSISTANT_OPERATION = `${meta.id}/operation`;

export namespace AssistantOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/on-create-space`, name: 'On Create Space' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        space: SpaceSchema,
        rootCollection: Collection.Collection,
      }),
      output: Schema.Void,
    },
  });

  export const CreateChat = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/create-chat`, name: 'Create Chat' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        name: Schema.optional(Schema.String),
        /** If false, chat is created in-memory only and not added to space. Defaults to true. */
        addToSpace: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Struct({
        object: Chat.Chat,
      }),
    },
  });

  export const UpdateChatName = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/update-chat-name`, name: 'Update Chat Name' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        chat: Chat.Chat,
      }),
      output: Schema.Void,
    },
  });

  export const SetCurrentChat = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/set-current-chat`, name: 'Set Current Chat' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        companionTo: Type.Obj,
        chat: Chat.Chat.pipe(Schema.optional),
      }),
      output: Schema.Void,
    },
  });

  export const BlueprintForm = Schema.Struct({
    key: Schema.String,
    name: Schema.String,
    description: Schema.optional(Schema.String),
  });
}
