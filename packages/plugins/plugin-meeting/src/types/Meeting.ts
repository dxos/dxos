//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { ThreadType } from '@dxos/plugin-thread/types';
import { Transcript } from '@dxos/plugin-transcription/types';
import { DataType } from '@dxos/schema';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = Schema.String;

export const Meeting = Schema.Struct({
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
  transcript: Type.Ref(Transcript.Transcript),

  /**
   * Markdown notes for the meeting.
   */
  notes: Type.Ref(DataType.Text),

  /**
   * Generated summary of the meeting.
   */
  summary: Type.Ref(DataType.Text),

  /**
   * Message thread for the meeting.
   */
  thread: Type.Ref(ThreadType),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Meeting',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export type Meeting = Schema.Schema.Type<typeof Meeting>;

// TODO(burdon): Create with decode consistently: Schema.decodeSync(TranscriptionSettingsSchema)({}))
export const Settings = Schema.mutable(
  Schema.Struct({
    entityExtraction: Schema.optional(Schema.Boolean).pipe(Schema.withConstructorDefault(() => true)),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
