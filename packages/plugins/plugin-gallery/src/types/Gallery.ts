//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { File } from '@dxos/types';

export const Gallery = Schema.Struct({
  name: Schema.optional(Schema.String),
  /** References to {@link File.File} objects. */
  images: Schema.Array(Ref.Ref(File.File)).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object(DXN.make('org.dxos.type.gallery', '0.1.0')),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--images--regular',
    hue: 'rose',
  }),
);

export interface Gallery extends Schema.Schema.Type<typeof Gallery> {}

/** Construct a new `Gallery` ECHO object. Defaults `images` to an empty array. */
export const make = ({ name, images = [] }: { name?: string; images?: ReadonlyArray<Ref.Ref<File.File>> } = {}) =>
  Obj.make(Gallery, { name, images });
