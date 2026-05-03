//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

export const Image = Schema.Struct({
  url: Schema.String.annotations({
    description: 'http(s):// or wnfs:// URL.',
  }),
  type: Schema.optional(
    Schema.String.annotations({
      description: 'MIME type of the image, e.g. image/png.',
    }),
  ),
  name: Schema.optional(
    Schema.String.annotations({
      description: 'Original file name.',
    }),
  ),
  description: Schema.optional(
    Schema.String.annotations({
      description: 'Alt-text or caption for the image.',
    }),
  ),
  width: Schema.optional(Schema.Number),
  height: Schema.optional(Schema.Number),
});

export interface Image extends Schema.Schema.Type<typeof Image> {}

export const Gallery = Schema.Struct({
  name: Schema.optional(Schema.String),
  images: Schema.Array(Image).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.gallery',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--images--regular',
    hue: 'rose',
  }),
);

export interface Gallery extends Schema.Schema.Type<typeof Gallery> {}

/** Construct a new `Gallery` ECHO object. Defaults `images` to an empty array. */
export const make = ({ name, images = [] }: { name?: string; images?: Image[] } = {}) =>
  Obj.make(Gallery, { name, images });
