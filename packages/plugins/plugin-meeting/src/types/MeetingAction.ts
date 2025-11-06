//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/client/echo';
import { Channel } from '@dxos/plugin-thread/types';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

import { Meeting } from './Meeting';

export class onCreateSpace extends Schema.TaggedClass<onCreateSpace>()(`${meta.id}/on-space-created`, {
  input: Schema.Struct({
    space: SpaceSchema,
    rootCollection: Collection.Collection,
  }),
  output: Schema.Void,
}) {}

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    channel: Channel.Channel,
  }),
  output: Schema.Struct({
    object: Meeting,
  }),
}) {}

export class SetActive extends Schema.TaggedClass<SetActive>()(`${meta.id}/action/set-active`, {
  input: Schema.Struct({
    object: Schema.optional(Meeting),
  }),
  output: Schema.Struct({
    object: Schema.optional(Meeting),
  }),
}) {}

export class HandlePayload extends Schema.TaggedClass<HandlePayload>()(`${meta.id}/action/handle-payload`, {
  input: Schema.Struct({
    meetingId: Schema.optional(Schema.String),
    transcriptDxn: Schema.optional(Schema.String),
    transcriptionEnabled: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
}) {}

export class Summarize extends Schema.TaggedClass<Summarize>()(`${meta.id}/action/summarize`, {
  input: Schema.Struct({
    meeting: Meeting,
  }),
  output: Schema.Void,
}) {}
