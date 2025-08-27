//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { ChannelType } from '@dxos/plugin-thread/types';

import { not_meta } from '../meta';

import { Meeting } from './Meeting';

export class Create extends Schema.TaggedClass<Create>()(`${not_meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    channel: ChannelType,
  }),
  output: Schema.Struct({
    object: Meeting,
  }),
}) {}

export class SetActive extends Schema.TaggedClass<SetActive>()(`${not_meta.id}/action/set-active`, {
  input: Schema.Struct({
    object: Schema.optional(Meeting),
  }),
  output: Schema.Struct({
    object: Schema.optional(Meeting),
  }),
}) {}

export class HandlePayload extends Schema.TaggedClass<HandlePayload>()(`${not_meta.id}/action/handle-payload`, {
  input: Schema.Struct({
    meetingId: Schema.optional(Schema.String),
    transcriptDxn: Schema.optional(Schema.String),
    transcriptionEnabled: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
}) {}

export class Summarize extends Schema.TaggedClass<Summarize>()(`${not_meta.id}/action/summarize`, {
  input: Schema.Struct({
    meeting: Meeting,
  }),
  output: Schema.Void,
}) {}
