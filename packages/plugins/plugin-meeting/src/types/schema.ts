//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

import { Ref, TypedObject } from '@dxos/echo-schema';
import { ChannelType } from '@dxos/plugin-space/types';
import { TranscriptType } from '@dxos/plugin-transcription/types';
import { TextType } from '@dxos/schema';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = S.String;

export const MeetingSchema = S.Struct({
  name: S.optional(S.String),
  participants: S.mutable(S.Array(IdentityDidSchema)),
  channel: S.optional(Ref(ChannelType)),
  transcript: S.optional(Ref(TranscriptType)),
  notes: S.optional(Ref(TextType)),
  summary: S.optional(Ref(TextType)),
});

export class MeetingType extends TypedObject({
  typename: 'dxos.org/type/Meeting',
  version: '0.1.0',
})(MeetingSchema.fields) {}
