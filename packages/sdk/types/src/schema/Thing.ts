//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { ItemAnnotation } from '@dxos/schema';

/**
 * https://schema.org/Thing
 * The most generic type of item.
 */
export const ThingSchema = Schema.Struct({
  additionalType: Format.URL.pipe(
    Schema.annotations({
      title: 'Additional Type',
      description:
        'An additional type for the item, typically used for adding more specific types from external vocabularies.',
    }),
    Schema.optional,
  ),
  alternateName: Schema.String.pipe(
    Schema.annotations({
      title: 'Alternate Name',
      description: 'An alias for the item.',
    }),
    Schema.optional,
  ),
  description: Schema.String.pipe(
    Schema.annotations({
      title: 'Description',
      description: 'A description of the item.',
    }),
    GeneratorAnnotation.set({
      generator: 'lorem.paragraph',
    }),
    Schema.optional,
  ),
  disambiguatingDescription: Schema.String.pipe(
    Schema.annotations({
      title: 'Disambiguating Description',
      description: 'A short description of the item used to disambiguate from other, similar items.',
    }),
    Schema.optional,
  ),
  identifier: Schema.String.pipe(
    Schema.annotations({
      title: 'Identifier',
      description: 'The identifier property represents any kind of identifier for any kind of Thing.',
    }),
    Schema.optional,
  ),
  image: Schema.String.pipe(
    Schema.annotations({
      title: 'Image',
      description: 'An image of the item.',
    }),
    GeneratorAnnotation.set('image.url'),
    Schema.optional,
  ),
  name: Schema.String.pipe(
    Schema.annotations({
      title: 'Name',
      description: 'The name of the item.',
    }),
    GeneratorAnnotation.set({
      generator: 'lorem.words',
      args: [{ min: 1, max: 3 }],
    }),
    Schema.optional,
  ),
  sameAs: Format.URL.pipe(
    Schema.annotations({
      title: 'Same As',
      description: "URL of a reference Web page that unambiguously indicates the item's identity.",
    }),
    Schema.optional,
  ),
  url: Format.URL.pipe(
    Schema.annotations({
      title: 'URL',
      description: 'URL of the item.',
    }),
    GeneratorAnnotation.set('internet.url'),
    Schema.optional,
  ),
});

export const Thing = ThingSchema.pipe(
  Type.Obj({
    typename: 'schema.org/schema/Thing',
    version: '0.1.0',
  }),
  Schema.annotations({ title: 'Thing' }),
  LabelAnnotation.set(['name', 'alternateName']),
  ItemAnnotation.set(true),
);

export interface Thing extends Schema.Schema.Type<typeof Thing> {}

export const make = (props: Partial<Obj.MakeProps<typeof Thing>> = {}) => Obj.make(Thing, props);
