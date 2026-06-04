//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';
import { Transcript } from '@dxos/types';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = Schema.String;

export const Meeting = Schema.Struct({
  /**
   * User-defined name of the meeting.
   */
  name: Schema.String.pipe(Schema.optional),

  /**
   * The time the meeting was created.
   * Used to generate a fallback name if one is not provided.
   */
  // TODO(wittjosiah): Remove. Rely on object meta.
  created: Schema.String.annotations({ description: 'ISO timestamp' }).pipe(FormInputAnnotation.set(false)),

  /**
   * List of dids of identities which joined some portion of the meeting.
   */
  participants: Schema.Array(IdentityDidSchema).pipe(FormInputAnnotation.set(false)),

  /**
   * Transcript of the meeting.
   */
  transcript: Ref.Ref(Transcript.Transcript).pipe(FormInputAnnotation.set(false)),

  /**
   * Markdown notes for the meeting.
   */
  notes: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),

  /**
   * Generated summary of the meeting.
   */
  summary: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'rose' }),
  Type.makeObject(DXN.make('org.dxos.type.meeting', '0.1.0')),
);

export type Meeting = Type.InstanceType<typeof Meeting>;
