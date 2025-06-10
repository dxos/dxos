//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

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

  export class SetActive extends Schema.TaggedClass<SetActive>()(`${MEETING_ACTION}/set-active`, {
    input: Schema.Struct({
      object: Schema.optional(MeetingType),
    }),
    output: Schema.Struct({
      object: Schema.optional(MeetingType),
    }),
  }) {}

  export class Summarize extends Schema.TaggedClass<Summarize>()(`${MEETING_ACTION}/summarize`, {
    input: Schema.Struct({
      meeting: MeetingType,
    }),
    output: Schema.Void,
  }) {}
}

// TODO(burdon): Create with decode consistently: Schema.decodeSync(TranscriptionSettingsSchema)({}))
export const MeetingSettingsSchema = Schema.mutable(
  Schema.Struct({
    entityExtraction: Schema.optional(Schema.Boolean).pipe(Schema.withConstructorDefault(() => true)),
  }),
);

export type MeetingSettingsProps = Schema.Schema.Type<typeof MeetingSettingsSchema>;
