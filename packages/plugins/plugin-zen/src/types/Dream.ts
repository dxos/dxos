//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { Sequence } from './Sequence';

export class Dream extends Type.makeObject<Dream>(DXN.make('dxos.org.type.Dream', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    duration: Schema.optional(
      Schema.Number.annotations({
        description: 'Playback duration in seconds.',
        default: 300,
      }),
    ),
    sequences: Schema.optional(Schema.Array(Sequence)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--moon-stars--regular', hue: 'violet' }),
  ),
) {}

export const make = ({ name, duration, sequences }: Partial<Dream> = {}) => {
  return Obj.make(Dream, { name, duration, sequences });
};
