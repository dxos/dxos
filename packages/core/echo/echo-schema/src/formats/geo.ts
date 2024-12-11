//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';

import { FormatAnnotationId, FormatEnum } from './types';

/**
 * GeoJSON Format
 * A position is the fundamental geometry construct.
 * A position is an array of numbers.
 * There MUST be two or more elements.
 * The first two elements are longitude and latitude, or easting and northing,
 * precisely in that order and using decimal numbers.
 * Altitude or elevation MAY be included as an optional third element.
 *
 * https://datatracker.ietf.org/doc/html/rfc7946
 * https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.2
 * https://en.wikipedia.org/wiki/Geographic_coordinate_system
 * https://geojson.org
 * {
 *   type: 'Feature',
 *   geometry: {
 *     type: "Point",
 *     coordinates: [0.1278, 51.5074],
 *   },
 *   properties: {
 *     name: 'London'
 *   }
 * }
 *
 * Note: optional third element for altitude.
 */
export namespace Geo {
  export const Position = S.Tuple(
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
    [FormatAnnotationId]: FormatEnum.GeoPosition,
    [AST.TitleAnnotationId]: 'GeoPosition',
    [AST.DescriptionAnnotationId]: 'GeoJSON Position',
  });

  export type Position = S.Schema.Type<typeof Position>;

  /**
   * https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.2
   */
  export const Point = S.Struct({
    type: S.Literal('Point'),
    coordinates: Position,
  });

  export type Point = S.Schema.Type<typeof Point>;

  /**
   * https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.3
   */
  export const MultiPoint = S.Struct({
    type: S.Literal('MultiPoint'),
    coordinates: S.mutable(S.Array(Position)),
  });

  export type MultiPoint = S.Schema.Type<typeof MultiPoint>;

  /**
   * https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.4
   */
  export const LineString = S.Struct({
    type: S.Literal('LineString'),
    coordinates: S.mutable(S.Array(Position).pipe(S.minItems(2))),
  });

  export type LineString = S.Schema.Type<typeof LineString>;

  /**
   * https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.6
   */
  export const Polygon = S.Struct({
    type: S.Literal('Polygon'),
    coordinates: S.mutable(S.Array(LineString)), // NOTE 4 or more positions.
  });

  export type Polygon = S.Schema.Type<typeof Polygon>;
}
