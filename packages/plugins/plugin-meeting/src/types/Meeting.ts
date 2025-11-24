//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Thread, Transcript } from '@dxos/types';

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
  created: Schema.String.annotations({ description: 'ISO timestamp' }).pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * List of dids of identities which joined some portion of the meeting.
   */
  participants: Schema.mutable(Schema.Array(IdentityDidSchema)).pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Transcript of the meeting.
   */
  transcript: Type.Ref(Transcript.Transcript).pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Markdown notes for the meeting.
   */
  notes: Type.Ref(Text.Text).pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Generated summary of the meeting.
   */
  summary: Type.Ref(Text.Text).pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Message thread for the meeting.
   */
  thread: Type.Ref(Thread.Thread).pipe(Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Meeting',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
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
