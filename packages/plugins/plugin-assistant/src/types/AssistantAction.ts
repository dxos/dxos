//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EchoObjectSchema, SpaceSchema } from '@dxos/client/echo';
import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

import { Chat } from './Assistant';

// Operations
const ASSISTANT_OPERATION = `${meta.id}/operation`;

export namespace AssistantOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/on-create-space`, name: 'On Create Space' },
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
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        name: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Chat,
      }),
    },
  });

  export const UpdateChatName = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/update-chat-name`, name: 'Update Chat Name' },
    schema: {
      input: Schema.Struct({
        chat: Chat,
      }),
      output: Schema.Void,
    },
  });

  export const SetCurrentChat = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/set-current-chat`, name: 'Set Current Chat' },
    schema: {
      input: Schema.Struct({
        companionTo: EchoObjectSchema,
        chat: Chat.pipe(Schema.optional),
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
