//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { clamp } from '@dxos/util';

import { FormatAnnotation, FormatEnum, TypeEnum } from './types';

/**
 * GeoJSON Format
 * https://datatracker.ietf.org/doc/html/rfc7946
 * https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.1
 * https://en.wikipedia.org/wiki/Geographic_coordinate_system
 * https://geojson.org
 * {
 *   "type": "Point",
 *   "coordinates": [0, 51.47] // [longitude, latitude]
 * }
 * Note: optional third element for altitude.
 */
export const GeoPoint = Schema.Tuple(
  Schema.Number.pipe(Schema.annotations({ title: 'Longitude' }), Schema.clamp(-180, 180), Schema.multipleOf(0.00001)),
  Schema.Number.pipe(Schema.annotations({ title: 'Latitude' }), Schema.clamp(-90, 90), Schema.multipleOf(0.00001)),
  Schema.optionalElement(Schema.Number).annotations({
    title: 'Height ASL (m)',
  }),
).pipe(
  FormatAnnotation.set(FormatEnum.GeoPoint),
  Schema.annotations({
    title: 'GeoPoint',
    description: 'GeoJSON Position',
    // TODO(wittjosiah): This is a workaround for Anthropic's issue with the default jsonSchema format.
    jsonSchema: {
      type: 'array',
      prefixItems: [
        { title: 'Longitude', type: TypeEnum.Number },
        { title: 'Latitude', type: TypeEnum.Number },
      ],
      items: false,
    },
  }),
);

export type GeoPoint = Schema.Schema.Type<typeof GeoPoint>;

export type GeoLocation = {
  longitude: number;
  latitude: number;
  height?: number;
};

/**
 * Geolocation utilities for working with GeoPoint format.
 */
export namespace GeoLocation {
  /**
   * Convert latitude and longitude to GeoPoint (GeoJSON format [longitude, latitude, height?]).
   * Clamps values to valid ranges: latitude [-90, 90], longitude [-180, 180].
   */
  export const toGeoPoint = ({ longitude, latitude, height }: GeoLocation): GeoPoint => {
    // TODO(ZaymonFC): Use schema validation instead of doing this manually.
    const clampedLongitude = clamp(longitude, -180, 180);
    const clampedLatitude = clamp(latitude, -90, 90);
    return height !== undefined ? [clampedLongitude, clampedLatitude, height] : [clampedLongitude, clampedLatitude];
  };

  /**
   * Extract latitude and longitude from GeoPoint (GeoJSON format [longitude, latitude, height?]).
   */
  export const fromGeoPoint = (geoPoint: GeoPoint | undefined): GeoLocation => {
    if (!geoPoint) {
      return { longitude: 0, latitude: 0 };
    }

    const result: GeoLocation = {
      longitude: geoPoint[0],
      latitude: geoPoint[1],
    };

    // Add height if defined.
    if (geoPoint[2] !== undefined) {
      result.height = geoPoint[2];
    }

    return result;
  };
}
