//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { ItemAnnotation } from '@dxos/schema';

import { ThingSchema } from './Thing';

export const PlaceSchema = ThingSchema.pipe(
  Schema.extend(
    Schema.Struct({
      address: Schema.String.pipe(
        Schema.annotations({
          title: 'Address',
          description: 'Physical address of the item.',
        }),
        GeneratorAnnotation.set({
          generator: 'location.streetAddress',
        }),
        Schema.optional,
      ),
      geo: Format.GeoPoint.pipe(
        Schema.annotations({
          title: 'Geo Coordinates',
          description: 'The geo coordinates of the place.',
        }),
        Schema.optional,
      ),
      latitude: Schema.Number.pipe(
        Schema.annotations({
          title: 'Latitude',
          description: 'The latitude of a location (WGS 84).',
        }),
        Schema.optional,
      ),
      longitude: Schema.Number.pipe(
        Schema.annotations({
          title: 'Longitude',
          description: 'The longitude of a location (WGS 84).',
        }),
        Schema.optional,
      ),
      telephone: Schema.String.pipe(
        Schema.annotations({
          title: 'Telephone',
          description: 'The telephone number.',
        }),
        GeneratorAnnotation.set({
          generator: 'phone.number',
        }),
        Schema.optional,
      ),
    }),
  ),
);

/**
 * https://schema.org/Place
 * Entities that have a somewhat fixed, physical extension.
 */
export const Place = PlaceSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Place',
    version: '0.1.0',
  }),
  Schema.annotations({
    title: 'Place',
    description: 'Entities that have a somewhat fixed, physical extension.',
  }),
  LabelAnnotation.set(['name', 'address']),
  ItemAnnotation.set(true),
);

export interface Place extends Schema.Schema.Type<typeof Place> {}

export const make = (props: Partial<Obj.MakeProps<typeof Place>> = {}) => Obj.make(Place, props);
