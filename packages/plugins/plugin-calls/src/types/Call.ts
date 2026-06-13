//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Text } from '@dxos/schema';
import { Transcript } from '@dxos/types';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = Schema.String;

export const Call = Schema.Struct({
  /**
   * User-defined name of the call.
   */
  name: Schema.String.pipe(Schema.optional),

  /**
   * The time the call was created.
   * Used to generate a fallback name if one is not provided.
   */
  // TODO(wittjosiah): Remove. Rely on object meta.
  created: Schema.String.annotations({ description: 'ISO timestamp' }).pipe(FormInputAnnotation.set(false)),

  /**
   * List of dids of identities which joined some portion of the call.
   */
  participants: Schema.Array(IdentityDidSchema).pipe(FormInputAnnotation.set(false)),

  /**
   * Transcript of the call.
   */
  transcript: Ref.Ref(Transcript.Transcript).pipe(FormInputAnnotation.set(false)),

  /**
   * Markdown notes for the call.
   */
  notes: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),

  /**
   * Generated summary of the call.
   */
  summary: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'rose' }),
  Type.makeObject(DXN.make('org.dxos.type.call', '0.1.0')),
);

export type Call = Type.InstanceType<typeof Call>;

export const make = (props: {
  name?: string;
  transcript: Ref.Ref<Transcript.Transcript>;
  notes?: Ref.Ref<Text.Text>;
  summary?: Ref.Ref<Text.Text>;
}) =>
  Obj.make(Call, {
    name: props.name,
    created: new Date().toISOString(),
    participants: [],
    transcript: props.transcript,
    notes: props.notes ?? Ref.make(Text.make()),
    summary: props.summary ?? Ref.make(Text.make()),
  });
