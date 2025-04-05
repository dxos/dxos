//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

import { Expando, Ref, TypedObject } from '@dxos/echo-schema';
import { TreeType } from '@dxos/plugin-outliner/types';
import { TranscriptType } from '@dxos/plugin-transcription/types';
import { TextType } from '@dxos/schema';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = S.String;

export const MeetingSchema = S.Struct({
  name: S.optional(S.String),
  created: S.String.annotations({ description: 'ISO timestamp' }),
  participants: S.mutable(S.Array(IdentityDidSchema)),
  // Queue of messages.
  chat: Ref(Expando),
  notes: Ref(TreeType),
  transcript: Ref(TranscriptType),
  summary: Ref(TextType),
});

export class MeetingType extends TypedObject({
  typename: 'dxos.org/type/Meeting',
  version: '0.2.0',
})(MeetingSchema.fields) {}
