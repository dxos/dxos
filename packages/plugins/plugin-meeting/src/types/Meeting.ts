//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Type } from '@dxos/echo';
||||||| 87517e966b
import { Type } from '@dxos/echo';
import { FormAnnotation, LabelAnnotation } from '@dxos/echo/internal';
=======
import { Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
>>>>>>> origin/main
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
<<<<<<< HEAD
  created: Schema.String.annotations({ description: 'ISO timestamp' }).pipe(Annotation.FormInputAnnotation.set(false)),
||||||| 87517e966b
  created: Schema.String.annotations({ description: 'ISO timestamp' }).pipe(FormAnnotation.set(false)),
=======
  created: Schema.String.annotations({ description: 'ISO timestamp' }).pipe(FormInputAnnotation.set(false)),
>>>>>>> origin/main

  /**
   * List of dids of identities which joined some portion of the meeting.
   */
<<<<<<< HEAD
  participants: Schema.mutable(Schema.Array(IdentityDidSchema)).pipe(Annotation.FormInputAnnotation.set(false)),
||||||| 87517e966b
  participants: Schema.mutable(Schema.Array(IdentityDidSchema)).pipe(FormAnnotation.set(false)),
=======
  participants: Schema.mutable(Schema.Array(IdentityDidSchema)).pipe(FormInputAnnotation.set(false)),
>>>>>>> origin/main

  /**
   * Transcript of the meeting.
   */
<<<<<<< HEAD
  transcript: Type.Ref(Transcript.Transcript).pipe(Annotation.FormInputAnnotation.set(false)),
||||||| 87517e966b
  transcript: Type.Ref(Transcript.Transcript).pipe(FormAnnotation.set(false)),
=======
  transcript: Type.Ref(Transcript.Transcript).pipe(FormInputAnnotation.set(false)),
>>>>>>> origin/main

  /**
   * Markdown notes for the meeting.
   */
<<<<<<< HEAD
  notes: Type.Ref(Text.Text).pipe(Annotation.FormInputAnnotation.set(false)),
||||||| 87517e966b
  notes: Type.Ref(Text.Text).pipe(FormAnnotation.set(false)),
=======
  notes: Type.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
>>>>>>> origin/main

  /**
   * Generated summary of the meeting.
   */
<<<<<<< HEAD
  summary: Type.Ref(Text.Text).pipe(Annotation.FormInputAnnotation.set(false)),
||||||| 87517e966b
  summary: Type.Ref(Text.Text).pipe(FormAnnotation.set(false)),
=======
  summary: Type.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
>>>>>>> origin/main

  /**
   * Message thread for the meeting.
   */
<<<<<<< HEAD
  thread: Type.Ref(Thread.Thread).pipe(Annotation.FormInputAnnotation.set(false)),
||||||| 87517e966b
  thread: Type.Ref(Thread.Thread).pipe(FormAnnotation.set(false)),
=======
  thread: Type.Ref(Thread.Thread).pipe(FormInputAnnotation.set(false)),
>>>>>>> origin/main
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
