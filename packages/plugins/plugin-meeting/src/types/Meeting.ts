//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { FormAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Thread } from '@dxos/plugin-thread/types';
import { Transcript } from '@dxos/plugin-transcription/types';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = Schema.String;

const Meeting_ = Schema.Struct({
  /**
   * User-defined name of the meeting.
   */
  name: Schema.String.pipe(Schema.optional),

  /**
   * The time the meeting was created.
   * Used to generate a fallback name if one is not provided.
   */
  // TODO(wittjosiah): Remove. Rely on object meta.
  created: Schema.String.annotations({ description: 'ISO timestamp' }).pipe(FormAnnotation.set(false)),

  /**
   * List of dids of identities which joined some portion of the meeting.
   */
  participants: Schema.mutable(Schema.Array(IdentityDidSchema)).pipe(FormAnnotation.set(false)),

  /**
   * Transcript of the meeting.
   */
  transcript: Type.Ref(Transcript.Transcript).pipe(FormAnnotation.set(false)),

  /**
   * Markdown notes for the meeting.
   */
  notes: Type.Ref(Text.Text).pipe(FormAnnotation.set(false)),

  /**
   * Generated summary of the meeting.
   */
  summary: Type.Ref(Text.Text).pipe(FormAnnotation.set(false)),

  /**
   * Message thread for the meeting.
   */
  thread: Type.Ref(Thread.Thread).pipe(FormAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Meeting',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);
export interface Meeting extends Schema.Schema.Type<typeof Meeting_> {}
export interface MeetingEncoded extends Schema.Schema.Encoded<typeof Meeting_> {}
export const Meeting: Schema.Schema<Meeting, MeetingEncoded> = Meeting_;

// TODO(burdon): Create with decode consistently: Schema.decodeSync(TranscriptionSettingsSchema)({}))
export const Settings = Schema.mutable(
  Schema.Struct({
    entityExtraction: Schema.optional(Schema.Boolean).pipe(Schema.withConstructorDefault(() => true)),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
