//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaTransformation from 'effect/SchemaTransformation';

import { clamp } from '@dxos/util';

import { FormatAnnotation, TypeFormat } from './types.ts';

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
/** Decimal places retained for stored coordinates (~1.1cm at the equator). */
export const GEO_PRECISION = 7;

const roundCoordinate = (value: number): number => {
  const factor = 10 ** GEO_PRECISION;
  return Math.round(value * factor) / factor;
};

/** Longitude/latitude clamped to range and rounded to {@link GEO_PRECISION} decimal places. */
const Coordinate = (min: number, max: number, title: string) =>
  Schema.Number.pipe(
    Schema.decodeTo(
      Schema.Number,
      // v4 removed `Schema.clamp`; the guide rebuilds it as an explicit reversible transformation,
      // which folds into the rounding step already happening here.
      SchemaTransformation.transform({
        decode: (value: number) => roundCoordinate(Math.min(Math.max(value, min), max)),
        encode: (value: number) => roundCoordinate(Math.min(Math.max(value, min), max)),
      }),
    ),
  ).annotate({ title });

export const GeoPoint = Schema.Tuple([
  Coordinate(-180, 180, 'Longitude'),
  Coordinate(-90, 90, 'Latitude'),
  Schema.optionalKey(Schema.Number).annotate({
    title: 'Height ASL (m)',
  }),
]).pipe(
  FormatAnnotation.set(TypeFormat.GeoPoint),
  Schema.annotate({
    title: 'GeoPoint',
    description: 'GeoJSON Position',
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
    // Clamp + round to match the `Format.GeoPoint` decode/encode path so both produce identical tuples.
    const clampedLongitude = roundCoordinate(clamp(longitude, -180, 180));
    const clampedLatitude = roundCoordinate(clamp(latitude, -90, 90));
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
