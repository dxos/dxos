//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Blueprint } from '@dxos/blueprints';
import { EchoObjectSchema, SpaceSchema } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

import { Chat } from './Assistant';

// TODO(burdon): Name?
export class onCreateSpace extends Schema.TaggedClass<onCreateSpace>()(`${meta.id}/on-space-created`, {
  input: Schema.Struct({
    space: SpaceSchema,
    rootCollection: Collection.Collection,
  }),
  output: Schema.Void,
}) {}

export class CreateChat extends Schema.TaggedClass<CreateChat>()(`${meta.id}/action/create-chat`, {
  input: Schema.Struct({
    space: SpaceSchema,
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
    chat: Chat,
  }),
  output: Schema.Void,
}) {}
