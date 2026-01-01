//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Blueprint, Prompt } from '@dxos/blueprints';
import { EchoObjectSchema, SpaceSchema } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { Database } from '@dxos/echo';
import * as Operation from '@dxos/operation';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

import { Chat } from './Assistant';

// TODO(burdon): Name?
export class OnCreateSpace extends Schema.TaggedClass<OnCreateSpace>()(`${meta.id}/on-space-created`, {
  input: Schema.Struct({
    space: SpaceSchema,
    rootCollection: Collection.Collection,
  }),
  output: Schema.Void,
}) {}

export class CreateChat extends Schema.TaggedClass<CreateChat>()(`${meta.id}/action/create-chat`, {
  input: Schema.Struct({
    db: Database.Database,
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Chat,
  }),
}) {}

export class UpdateChatName extends Schema.TaggedClass<UpdateChatName>()(`${meta.id}/action/update-name`, {
  input: Schema.Struct({
    chat: Chat,
  }),
  output: Schema.Void,
}) {}

export const BlueprintForm = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
});

export class CreateBlueprint extends Schema.TaggedClass<CreateBlueprint>()(`${meta.id}/action/create-blueprint`, {
  input: BlueprintForm,
  output: Schema.Struct({
    object: Blueprint.Blueprint,
  }),
}) {}

export class CreatePrompt extends Schema.TaggedClass<CreatePrompt>()(`${meta.id}/action/create-prompt`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Prompt.Prompt,
  }),
}) {}

export class CreateSequence extends Schema.TaggedClass<CreateSequence>()(`${meta.id}/action/create-sequence`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Sequence,
  }),
}) {}

export class SetCurrentChat extends Schema.TaggedClass<SetCurrentChat>()(`${meta.id}/action/set-current-chat`, {
  input: Schema.Struct({
    companionTo: EchoObjectSchema,
    chat: Chat.pipe(Schema.optional),
  }),
  output: Schema.Void,
}) {}

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

  export const CreateBlueprint = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/create-blueprint`, name: 'Create Blueprint' },
    schema: {
      input: BlueprintForm,
      output: Schema.Struct({
        object: Blueprint.Blueprint,
      }),
    },
  });

  export const CreatePrompt = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/create-prompt`, name: 'Create Prompt' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Prompt.Prompt,
      }),
    },
  });

  export const CreateSequence = Operation.make({
    meta: { key: `${ASSISTANT_OPERATION}/create-sequence`, name: 'Create Sequence' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Sequence,
      }),
    },
  });
}
