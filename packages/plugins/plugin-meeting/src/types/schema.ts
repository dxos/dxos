//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Ref, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space/types';
import { TranscriptType } from '@dxos/plugin-transcription/types';
import { DataType } from '@dxos/schema';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = Schema.String;

export const MeetingSchema = Schema.Struct({
  /**
   * User-defined name of the meeting.
   */
  name: Schema.optional(Schema.String),

  /**
   * The time the meeting was created.
   * Used to generate a fallback name if one is not provided.
   */
  // TODO(wittjosiah): Remove. Rely on object meta.
  created: Schema.String.annotations({ description: 'ISO timestamp' }),

  /**
   * List of dids of identities which joined some portion of the meeting.
   */
  participants: Schema.mutable(Schema.Array(IdentityDidSchema)),

  /**
   * Transcript of the meeting.
   */
  transcript: Ref(TranscriptType),

  /**
   * Markdown notes for the meeting.
   */
  notes: Ref(DataType.Text),

  /**
   * Generated summary of the meeting.
   */
  summary: Ref(DataType.Text),

  /**
   * Message thread for the meeting.
   */
  thread: Ref(ThreadType),
});

export class MeetingType extends TypedObject({
  typename: 'dxos.org/type/Meeting',
  version: '0.3.0',
})(MeetingSchema.fields) {}
