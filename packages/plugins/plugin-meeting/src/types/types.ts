//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { DocumentType } from '@dxos/plugin-markdown/types';
import { ChannelType } from '@dxos/plugin-thread/types';

import { MeetingType } from './schema';
import { MEETING_PLUGIN } from '../meta';

export namespace MeetingAction {
  const MEETING_ACTION = `${MEETING_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${MEETING_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
      channel: ChannelType,
    }),
    output: Schema.Struct({
      object: MeetingType,
    }),
  }) {}

  export class FindOrCreate extends Schema.TaggedClass<FindOrCreate>()(`${MEETING_ACTION}/find-or-create`, {
    input: Schema.Struct({
      object: ChannelType,
    }),
    output: Schema.Struct({
      object: MeetingType,
    }),
  }) {}

  export class Summarize extends Schema.TaggedClass<Summarize>()(`${MEETING_ACTION}/summarize`, {
    input: Schema.Struct({
      meeting: MeetingType,
    }),
    output: Schema.Struct({
      object: DocumentType,
    }),
  }) {}
}
