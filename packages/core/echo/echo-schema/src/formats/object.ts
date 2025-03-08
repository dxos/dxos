//
// Copyright 2025 DXOS.org
//

import { AST, S } from '@dxos/effect';
import { clamp } from '@dxos/util';

import { FormatAnnotationId, FormatEnum } from './types';

/**
 * GeoJSON Format
 * https://datatracker.ietf.org/doc/html/rfc7946
 * https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.1
 * https://en.wikipedia.org/wiki/Geographic_coordinate_system
 * https://geojson.org
 * {
 *   "type": "Point",
 *   "coordinates": [30.0, 10.0] // [longitude, latitude]
 * }
 * Note: optional third element for altitude.
 */
export const GeoPoint = S.Tuple(
  S.Number.pipe(S.clamp(-180, 180), S.multipleOf(0.00001)).annotations({
    [AST.TitleAnnotationId]: 'Longitude',
  }),
  S.Number.pipe(S.clamp(-90, 90), S.multipleOf(0.00001)).annotations({
    [AST.TitleAnnotationId]: 'Latitude',
  }),
  S.optionalElement(S.Number).annotations({
    [AST.TitleAnnotationId]: 'Height ASL (m)',
  }),
).annotations({
  [FormatAnnotationId]: FormatEnum.GeoPoint,
  [AST.TitleAnnotationId]: 'GeoPoint',
  [AST.DescriptionAnnotationId]: 'GeoJSON Position',
});

export type GeoPoint = S.Schema.Type<typeof GeoPoint>;

export type GeoLocation = {
  latitude: number;
  longitude: number;
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
  export const toGeoPoint = ({
    latitude,
    longitude,
    height,
  }: {
    latitude: number;
    longitude: number;
    height?: number;
  }): GeoPoint => {
    // TODO(ZaymonFC): Use schema validation instead of doing this manually.
    const clampedLatitude = clamp(latitude, -90, 90);
    const clampedLongitude = clamp(longitude, -180, 180);

    return height !== undefined ? [clampedLongitude, clampedLatitude, height] : [clampedLongitude, clampedLatitude];
  };

  /**
   * Extract latitude and longitude from GeoPoint (GeoJSON format [longitude, latitude, height?]).
   */
  export const fromGeoPoint = (
    geoPoint: GeoPoint | undefined,
  ): { latitude: number; longitude: number; height?: number } => {
    if (!geoPoint) {
      return { latitude: 0, longitude: 0 };
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
